package app

import (
	"time"

	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/engine"
)

const (
	textSize = 30
	// textBleed is how far the current character's and the mistakes'
	// backgrounds, and the composition's bubble, may go past the text.
	textBleed      = 32
	minVisible     = 3
	caretWidth     = 2
	caretBlinkWait = 600 * time.Millisecond
	caretBlink     = 530 * time.Millisecond
)

// typingArea builds the text the user types, width wide: the lesson's
// text, the caret and the input method's composition, scrolled to the
// current line when it does not fit in maxHeight. It takes keys, text and
// compositions as they come.
func (a *App) typingArea(c *ui.Context, p *practice, width, maxHeight float32) {
	pal, s, tv := a.pal, p.session, p.view
	p.settleComposition()

	tv.layout(width, textSize)
	// Once done, Index is past the end: no character is current.
	current := s.Index

	lh := tv.lineHeight()
	lines := len(tv.lines)
	visible := min(lines, max(minVisible, int(maxHeight/lh)))
	curLine := tv.lineAt(s.Index)
	// The current line stays second from the top once past the first.
	first := max(0, min(curLine-1, lines-visible))

	// The area paints a little past its box: the backgrounds of the
	// characters at its edges, and the composition's bubble above the first
	// line.
	area := ui.Box(c).Width(width).Height(float32(visible) * lh).
		Focusable().FocusRing(false).Cursor(ui.CursorText).Label(p.lesson.Title)
	scroll := area.Animate("scroll", float32(first)*lh, 180*time.Millisecond)
	// The lines in view, where the scroll goes and where it is on the
	// way: a restart flies back over the whole text.
	shownFirst := int(scroll / lh)
	tv.sync(s.Chars, s.Edits, current, pal, min(first, shownFirst)-1, max(first, shownFirst)+visible+3)

	// The caret slides along its line and jumps to the next.
	caretTop := float32(curLine)*lh - scroll + (lh-textSize*1.3)/2
	caretX := area.Animate(struct{ line int }{curLine}, tv.caretX(s.Index), 70*time.Millisecond)
	caret := ui.Rect{X: caretX, Y: caretTop, W: caretWidth, H: textSize * 1.3}
	if r, ok := tv.charRect(s.Index); ok {
		caret.W = max(r.W, caretWidth)
	}

	// The composition shows in a bubble above the caret, and the
	// candidate window below it.
	var bubble ui.Rect
	if p.composing != "" {
		bubble = a.compositionBubble(c, p, caret, width)
	}

	p.keys.sync(area.Focused(), c.Modifiers(), c.Now())
	if !s.Done {
		area.HandleInput(func(ev ui.InputEvent) bool {
			shown := p.keys.observe(ev, time.Now()) && !a.prefs.HideKeyboard
			return a.typingInput(p, ev) || shown
		}).TextCaret(caret)
		// The typing area keeps the focus, as the web's does, unless
		// something covers the page.
		if !a.modal() {
			area.Focus()
		}
	}

	lastInput, composing, caretIdx := p.lastInput, p.composing, p.composeCaret
	done := s.Done
	area.Draw(func(pt *ui.Painter, r ui.Rect) {
		pt.Clip(ui.Rect{X: r.X - textBleed, Y: r.Y - 4, W: r.W + 2*textBleed, H: r.H + 8}, 0, func() {
			from := max(0, int(scroll/lh)-1)
			to := min(lines, from+visible+3)
			for li := from; li < to; li++ {
				a.drawLine(pt, tv, li, r.X, r.Y+float32(li)*lh-scroll, s.Chars, current)
			}
			if !done {
				drawCaret(pt, ui.Rect{X: r.X + caret.X, Y: r.Y + caret.Y, W: caretWidth, H: caret.H}, pal.primary, lastInput)
			}
		})
		if composing != "" {
			a.drawComposition(pt, ui.Rect{X: r.X + bubble.X, Y: r.Y + bubble.Y, W: bubble.W, H: bubble.H}, composing, caretIdx)
		}
	})
}

// typingInput takes the input of the typing area as it comes.
func (a *App) typingInput(p *practice, ev ui.InputEvent) bool {
	switch ev.Kind {
	case ui.InputKeyDown:
		// Shortcuts go on to the menus and the window.
		if ev.Mods&(ui.Super|ui.Ctrl|ui.Alt) != 0 {
			return false
		}
		switch ev.Key {
		case ui.KeyBackspace:
			a.deleted(p)
		case ui.KeyEnter:
			a.typed(p, "\n")
		}
		// Every other key types text, which comes next, or nothing: none
		// scrolls the page or moves the focus.
		return true
	case ui.InputText:
		p.cancelPending = false
		p.composing = ""
		a.typed(p, ev.Text)
		return true
	case ui.InputCompose:
		a.composed(p, ev.Text, ev.Caret)
		return true
	}
	return false
}

// drawLine paints line li of the text with its top left at x, y.
func (a *App) drawLine(pt *ui.Painter, tv *textView, li int, x, y float32, chars []engine.Char, current int) {
	l := &tv.lines[li]
	if l.layout == nil {
		return
	}
	pal := a.pal
	lh := tv.lineHeight()
	_, h := l.layout.Size()
	top := y + (lh-h)/2
	// Backgrounds of the current and the mistyped characters.
	for i := l.start; i < l.end; i++ {
		var bg ui.Color
		switch {
		case i == current:
			bg = pal.charCurrentBg
		case chars[i].Status == engine.Incorrect:
			bg = pal.charIncorrectBg
		default:
			continue
		}
		if r, ok := tv.charRect(i); ok {
			pt.Fill(ui.Rect{X: x + r.X - 1, Y: top + r.Y, W: r.W + 2, H: r.H}, bg, 3)
		}
	}
	pt.TextLayout(l.layout, x, top, pal.charPending)
}

// drawCaret paints the caret, steady while the user types and blinking
// once they pause.
func drawCaret(pt *ui.Painter, r ui.Rect, color ui.Color, lastInput time.Time) {
	idle := pt.Now().Sub(lastInput)
	if idle < caretBlinkWait {
		pt.After(caretBlinkWait - idle)
	} else {
		phase := (idle - caretBlinkWait) % (2 * caretBlink)
		if phase >= caretBlink {
			pt.After(2*caretBlink - phase)
			return
		}
		pt.After(caretBlink - phase)
	}
	pt.Fill(r, color, 1)
}

const (
	bubblePadX = 12
	bubblePadY = 6
	bubbleGap  = 6
)

// compositionSpan is the composition as the bubble shows it.
func (a *App) compositionSpan(text string) ui.Span {
	return ui.Span{Text: text, Size: 16, Weight: 500, Color: a.pal.composition, Underline: true, DecorationColor: a.pal.composition}
}

// compositionBubble returns where the composition's bubble goes, above
// the caret, relative to the typing area.
func (a *App) compositionBubble(c *ui.Context, p *practice, caret ui.Rect, width float32) ui.Rect {
	w, h := c.MeasureText(0, a.compositionSpan(p.composing))
	b := ui.Rect{W: w + 2*bubblePadX, H: h + 2*bubblePadY}
	b.X = min(max(caret.X-bubblePadX, 0), max(width-b.W, 0))
	b.Y = caret.Y - b.H - bubbleGap
	return b
}

// drawComposition paints the composition's bubble, with its caret.
func (a *App) drawComposition(pt *ui.Painter, r ui.Rect, text string, caret int) {
	pal := a.pal
	pt.Shadow(r, 8, 0, 2, 8, 0, ui.RGBA(0, 0, 0, 0.15))
	pt.Fill(r, pal.compositionBackground, 8)
	pt.Stroke(r, pal.composition.Alpha(0.3), 8, 1)
	sp := a.compositionSpan(text)
	pt.RichText(r.X+bubblePadX, r.Y+bubblePadY, 0, sp)
	runes := []rune(text)
	caret = min(max(caret, 0), len(runes))
	before := sp
	before.Text = string(runes[:caret])
	cw, _ := pt.MeasureText(0, before)
	if caret == 0 {
		cw = 0
	}
	pt.Fill(ui.Rect{X: r.X + bubblePadX + cw, Y: r.Y + bubblePadY, W: 1.5, H: r.H - 2*bubblePadY}, pal.composition, 0)
}
