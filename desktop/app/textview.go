package app

import (
	"slices"
	"unicode/utf16"

	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/engine"
)

// newlineMark stands for a line break of the lesson, which the user types
// with Enter.
const newlineMark = "↵"

// textView lays the text of a lesson out in lines and keeps a layout of
// each, styled as its characters stand. The line breaks are the system
// text engine's, found once per width; a keystroke reshapes only the lines
// whose styles changed.
type textView struct {
	text []rune

	// The geometry, for width and size.
	width, size float32
	lines       []textLine
	lineOf      []int // the line of each character

	synced syncKey // what the lines' styles were last synced with
}

// syncKey is what the styles of the lines depend on.
type syncKey struct {
	edits, current int
	pal            *palette
	first, last    int
	width, size    float32
}

// textLine is a line of the text: its characters and their layout.
type textLine struct {
	start, end int
	// offsets are the UTF-16 offsets of the line's characters in its
	// layout, and of its end.
	offsets []int
	spans   []ui.Span
	layout  *ui.TextLayout
}

func newTextView(text string) *textView {
	return &textView{text: []rune(text)}
}

// displayText is what a character shows: a mark for a line break.
func displayText(r rune) string {
	if r == '\n' {
		return newlineMark
	}
	return string(r)
}

// utf16Offsets returns the UTF-16 offset of each character as displayed,
// and of their end.
func utf16Offsets(chars []rune) []int {
	offs := make([]int, len(chars)+1)
	for i, r := range chars {
		n := 1
		if r != '\n' && utf16.RuneLen(r) == 2 {
			n = 2
		}
		offs[i+1] = offs[i] + n
	}
	return offs
}

// lineHeight is the distance between lines, as the web's leading-loose.
func (tv *textView) lineHeight() float32 { return tv.size * 2 }

// layout breaks the text into lines at width, when the width or the size
// changed.
func (tv *textView) layout(width, size float32) {
	if width == tv.width && size == tv.size && tv.lines != nil {
		return
	}
	tv.width, tv.size = width, size
	tv.lines = tv.lines[:0]
	tv.lineOf = make([]int, len(tv.text))
	font := ui.Font{Size: size}

	for start := 0; start < len(tv.text); {
		// A paragraph runs to its line break, which it shows at its end.
		end := start
		for end < len(tv.text) && tv.text[end] != '\n' {
			end++
		}
		if end < len(tv.text) {
			end++
		}
		para := tv.text[start:end]
		var display []byte
		for _, r := range para {
			display = append(display, displayText(r)...)
		}
		pl := ui.ShapeText(string(display), font, width)
		offs := utf16Offsets(para)

		// A character is on the line of the caret before it, downstream: at
		// a soft wrap, the start of the next line.
		lineStart, lastY := start, float32(-1)
		for i := range para {
			y := pl.CaretAt(ui.TextCaretPosition{Index: offs[i], Affinity: ui.TextDownstream}).Y
			if lastY >= 0 && y > lastY+1 {
				tv.addLine(lineStart, start+i)
				lineStart = start + i
			}
			lastY = y
		}
		tv.addLine(lineStart, end)
		start = end
	}
}

func (tv *textView) addLine(start, end int) {
	n := len(tv.lines)
	for i := start; i < end; i++ {
		tv.lineOf[i] = n
	}
	tv.lines = append(tv.lines, textLine{start: start, end: end, offsets: utf16Offsets(tv.text[start:end])})
}

// lineAt returns the line of character i; the last line past the end.
func (tv *textView) lineAt(i int) int {
	if len(tv.lines) == 0 {
		return 0
	}
	if i >= len(tv.lineOf) {
		return len(tv.lines) - 1
	}
	return tv.lineOf[i]
}

// charStyle is how a character shows.
type charStyle struct {
	status  engine.Status
	current bool
}

// span returns the span of a run of characters in style s.
func (p *palette) span(text string, s charStyle) ui.Span {
	sp := ui.Span{Text: text, Color: p.charPending}
	switch {
	case s.current:
		sp.Color = p.charCurrent
	case s.status == engine.Correct:
		sp.Color = p.charCorrect
	case s.status == engine.Incorrect:
		sp.Color = p.charIncorrect
		sp.WavyUnderline = true
		sp.DecorationColor = p.charIncorrect
	}
	return sp
}

// sync reshapes the lines from first up to last whose characters changed
// style: those in view, as the others are reshaped when they come into it.
// It does nothing when neither the run (edits), the palette nor the lines
// changed since the last call.
func (tv *textView) sync(chars []engine.Char, edits, current int, pal *palette, first, last int) {
	key := syncKey{edits, current, pal, first, last, tv.width, tv.size}
	if key == tv.synced {
		return
	}
	tv.synced = key
	font := ui.Font{Size: tv.size}
	for li := max(first, 0); li < min(last, len(tv.lines)); li++ {
		l := &tv.lines[li]
		var spans []ui.Span
		var runStyle charStyle
		var run []byte
		flush := func() {
			if len(run) > 0 {
				spans = append(spans, pal.span(string(run), runStyle))
				run = run[:0]
			}
		}
		for i := l.start; i < l.end; i++ {
			s := charStyle{status: chars[i].Status, current: i == current}
			if s != runStyle {
				flush()
				runStyle = s
			}
			run = append(run, displayText(chars[i].Want)...)
		}
		flush()
		if l.layout != nil && slices.Equal(spans, l.spans) {
			continue
		}
		l.spans = spans
		l.layout = ui.ShapeRichText(spans, font, 0)
	}
}

// charRect returns the box of character i on its line, relative to the
// line's top left, and whether it has one.
func (tv *textView) charRect(i int) (ui.Rect, bool) {
	if i < 0 || i >= len(tv.text) || len(tv.lines) == 0 {
		return ui.Rect{}, false
	}
	l := &tv.lines[tv.lineAt(i)]
	if l.layout == nil {
		return ui.Rect{}, false
	}
	k := i - l.start
	rects := l.layout.SelectionRects(ui.TextInputRange{Start: l.offsets[k], End: l.offsets[k+1]})
	if len(rects) == 0 {
		return ui.Rect{}, false
	}
	return rects[0], true
}

// caretX returns where the caret before character i is on its line;
// past the end of the text, after its last character.
func (tv *textView) caretX(i int) float32 {
	if len(tv.lines) == 0 {
		return 0
	}
	l := &tv.lines[tv.lineAt(i)]
	if l.layout == nil {
		return 0
	}
	return l.layout.Caret(l.offsets[min(i, l.end)-l.start]).X
}
