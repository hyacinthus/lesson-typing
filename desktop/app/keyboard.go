package app

import (
	"runtime"
	"slices"
	"time"

	"github.com/egoist/mygo/ui"
)

// The keyboards of the practice, which show the keys as they are pressed:
// a faint one in the bottom right corner, or a large unseen one over the
// bottom half of the window, whose keys glow dimly as they are pressed.
// They are the web's KeyboardOverlay
// (src/components/typing/KeyboardOverlay.tsx), with its rows
// (src/utils/keyboardLayout.ts). The web's keys go by position; MyGo's go
// by what they type (KeyA types an a), so an AZERTY A lights where QWERTY
// has it, and on macOS the letters of layouts without Latin letters, such
// as Korean's, do not light.

const (
	keyboardWidth = 15 // keys

	keySize    = 18
	keyGap     = 3
	keyPadding = 8
	cornerFade = 300 * time.Millisecond

	// The large keyboard's room from the window's sides and bottom.
	largePadding = 24
	largeFade    = 500 * time.Millisecond
)

// The keyboard modes, as Prefs.Keyboard, which names its text, as
// keyboard_mode.corner.
const (
	keyboardCorner = "corner"
	keyboardLarge  = "large"
	keyboardOff    = "off"
)

// keyboardModes are the keyboard modes, with their icons, in the order the
// title bar's button goes through them; the first is the default.
var keyboardModes = []struct {
	mode string
	icon *ui.SVG
}{
	{keyboardLarge, iconLargeKeyboard},
	{keyboardCorner, iconCornerKeyboard},
	{keyboardOff, iconKeyboardOff},
}

// keyboardIndex returns the index in keyboardModes of the mode chosen,
// the default's when none is chosen or the mode is unknown.
func (a *App) keyboardIndex() int {
	for i, m := range keyboardModes {
		if m.mode == a.prefs.Keyboard {
			return i
		}
	}
	return 0
}

// keyboardMode returns the mode chosen.
func (a *App) keyboardMode() string { return keyboardModes[a.keyboardIndex()].mode }

// nextKeyboard switches to the next keyboard mode.
func (a *App) nextKeyboard() {
	a.setKeyboard(keyboardModes[(a.keyboardIndex()+1)%len(keyboardModes)].mode)
}

// keyID is a key of the keyboard: a key, or a modifier, which lights both
// of its keys, as the system does not tell them apart.
type keyID struct {
	key ui.Key
	mod ui.Modifiers
}

// keyCap is a key as the keyboard draws it, width keys wide.
type keyCap struct {
	keyID
	label string
	width float32
}

var signKeys = map[rune]ui.Key{
	'`': ui.KeyBackquote, '-': ui.KeyMinus, '=': ui.KeyEqual, '[': ui.KeyBracketLeft, ']': ui.KeyBracketRight,
	';': ui.KeySemicolon, '\'': ui.KeyQuote, ',': ui.KeyComma, '.': ui.KeyPeriod, '/': ui.KeySlash,
}

// typingKeys returns the keys that type a letter, a digit or a sign, one
// per character of labels.
func typingKeys(labels string) []keyCap {
	var caps []keyCap
	for _, r := range labels {
		k := signKeys[r]
		switch {
		case r >= 'A' && r <= 'Z':
			k = ui.KeyA + ui.Key(r-'A')
		case r >= '0' && r <= '9':
			k = ui.Key0 + ui.Key(r-'0')
		}
		caps = append(caps, keyCap{keyID{key: k}, string(r), 1})
	}
	return caps
}

func key(k ui.Key, label string, width float32) []keyCap {
	return []keyCap{{keyID{key: k}, label, width}}
}

func modifier(m ui.Modifiers, label string, width float32) []keyCap {
	return []keyCap{{keyID{mod: m}, label, width}}
}

// keyboardRows are the main block of an ANSI keyboard, 15 keys wide. Caps
// Lock, which the system does not report, is KeyUnknown, which never
// lights.
var keyboardRows = [][]keyCap{
	slices.Concat(typingKeys("`1234567890-="), key(ui.KeyBackspace, "⌫", 2)),
	slices.Concat(key(ui.KeyTab, "⇥", 1.5), typingKeys("QWERTYUIOP[]"), key(ui.KeyBackslash, "\\", 1.5)),
	slices.Concat(key(ui.KeyUnknown, "⇪", 1.75), typingKeys("ASDFGHJKL;'"), key(ui.KeyEnter, "↵", 2.25)),
	slices.Concat(modifier(ui.Shift, "⇧", 2.25), typingKeys("ZXCVBNM,./"), modifier(ui.Shift, "⇧", 2.75)),
	bottomRow(macOS),
}

var macOS = runtime.GOOS == "darwin"

func bottomRow(mac bool) []keyCap {
	if mac {
		return slices.Concat(modifier(ui.Ctrl, "⌃", 1.5), modifier(ui.Alt, "⌥", 1.25), modifier(ui.Super, "⌘", 1.5),
			key(ui.KeySpace, "", 6.5), modifier(ui.Super, "⌘", 1.5), modifier(ui.Alt, "⌥", 1.25), modifier(ui.Ctrl, "⌃", 1.5))
	}
	return slices.Concat(modifier(ui.Ctrl, "Ctrl", 1.25), modifier(ui.Super, "Win", 1.25), modifier(ui.Alt, "Alt", 1.25),
		key(ui.KeySpace, "", 6.25), modifier(ui.Alt, "Alt", 1.25), modifier(ui.Super, "Win", 1.25),
		key(ui.KeyContextMenu, "☰", 1.25), modifier(ui.Ctrl, "Ctrl", 1.25))
}

// keyboard is what the keyboard shows: the keys held down, and when the
// others were let go of, as they fade out then.
type keyboard struct {
	held     map[keyID]bool
	released map[keyID]time.Time
}

func (k *keyboard) press(id keyID) {
	if k.held == nil {
		k.held = map[keyID]bool{}
	}
	k.held[id] = true
}

// release lets go of id. A key let go of that never came down lights as
// it goes up: macOS sends no key down while an input method composes,
// and Linux none for the keys that type text.
func (k *keyboard) release(id keyID, now time.Time) {
	if k.released == nil {
		k.released = map[keyID]time.Time{}
	}
	delete(k.held, id)
	k.released[id] = now
}

// observe takes a key going down or up, and reports whether it went up,
// for the frame that shows it: nothing else takes that.
func (k *keyboard) observe(ev ui.InputEvent, now time.Time) bool {
	if ev.Kind != ui.InputKeyDown && ev.Kind != ui.InputKeyUp || ev.Key == ui.KeyUnknown {
		return false
	}
	if ev.Kind == ui.InputKeyDown {
		k.press(keyID{key: ev.Key})
		return false
	}
	k.release(keyID{key: ev.Key}, now)
	return true
}

// sync takes the modifiers held. The keys let go of while the typing area
// does not have the keyboard never come back up, nor, on macOS, those let
// go of while Command is held: every key lets go then.
func (k *keyboard) sync(focused bool, mods ui.Modifiers, now time.Time) {
	if !focused || macOS && k.held[keyID{mod: ui.Super}] && mods&ui.Super == 0 {
		for id := range k.held {
			k.release(id, now)
		}
	}
	if !focused {
		return
	}
	for _, m := range []ui.Modifiers{ui.Shift, ui.Ctrl, ui.Alt, ui.Super} {
		if id := (keyID{mod: m}); mods&m != 0 {
			k.press(id)
		} else if k.held[id] {
			k.release(id, now)
		}
	}
}

// lit returns how lit id is at now: 1 while held, then dimming over fade
// as a light going out does.
func (k *keyboard) lit(id keyID, now time.Time, fade time.Duration) float32 {
	if k.held[id] {
		return 1
	}
	if d := now.Sub(k.released[id]); d >= 0 && d < fade {
		t := 1 - float32(d)/float32(fade)
		return t * t
	}
	return 0
}

// keyboardView builds the keyboard of the mode chosen over its parent,
// under which the pointer reaches the page.
func (a *App) keyboardView(c *ui.Context, k *keyboard) {
	switch a.keyboardMode() {
	case keyboardCorner:
		a.cornerKeyboard(c, k)
	case keyboardLarge:
		a.largeKeyboard(c, k)
	}
}

// cornerKeyboard builds the faint keyboard in the bottom right corner,
// whose keys light as they are pressed.
func (a *App) cornerKeyboard(c *ui.Context, k *keyboard) {
	pal := a.pal
	const pitch = keySize + keyGap
	ui.Box(c).Absolute().Right(16).Bottom(16).PassThrough().
		Width(keyboardWidth*pitch-keyGap+2*keyPadding).Height(float32(len(keyboardRows))*pitch-keyGap+2*keyPadding).
		Radius(12).Background(pal.background.Alpha(0.15)).Border(1, pal.border.Alpha(0.4)).
		Draw(func(pt *ui.Painter, r ui.Rect) {
			drawKeys(pt, k, r.X+keyPadding, r.Y+keyPadding, pitch, keyGap, cornerFade, func(kr ui.Rect, kc keyCap, lit float32) {
				pt.Fill(kr, pal.primary.Alpha(0.8*lit), 4)
				pt.Stroke(kr, pal.foreground.Alpha(0.1).Mix(pal.primary.Alpha(0.8), lit), 4, 1)
				drawLabel(pt, kr, kc.label, 10, pal.foreground.Alpha(0.25).Mix(pal.primaryText, lit))
			})
		})
}

// largeKeyboard builds the large keyboard over the bottom half of its
// parent, unseen but for the keys pressed, which glow dimly, then go out.
func (a *App) largeKeyboard(c *ui.Context, k *keyboard) {
	pal := a.pal
	_, h := c.Size()
	ui.Box(c).Absolute().Left(0).Right(0).Bottom(0).Height(h / 2).PassThrough().
		Draw(func(pt *ui.Painter, r ui.Rect) {
			// The key pitch, across the window and the rows in its bottom
			// half; a tenth of it parts the keys.
			rows := float32(len(keyboardRows))
			u := max(0, min((r.W-2*largePadding)/keyboardWidth, (r.H-largePadding)/rows))
			gap, radius := u/10, u/6
			x := r.X + (r.W-(keyboardWidth*u-gap))/2
			y := r.Y + r.H - largePadding - (rows*u - gap)
			drawKeys(pt, k, x, y, u, gap, largeFade, func(kr ui.Rect, kc keyCap, lit float32) {
				if lit == 0 {
					return
				}
				pt.Shadow(kr, radius, 0, 0, u/2, 0, pal.primary.Alpha(0.3*lit))
				pt.Fill(kr, pal.primary.Alpha(0.15*lit), radius)
				pt.Stroke(kr, pal.primary.Alpha(0.4*lit), radius, 1)
				drawLabel(pt, kr, kc.label, u/3, pal.primary.Alpha(0.7*lit))
			})
		})
}

// drawKeys lays keyboardRows out from x, y, pitch apart with gap between
// the keys, and paints each with how lit it is as it fades over fade.
func drawKeys(pt *ui.Painter, k *keyboard, x, y, pitch, gap float32, fade time.Duration, paint func(kr ui.Rect, kc keyCap, lit float32)) {
	now := pt.Now()
	fading := false
	for _, row := range keyboardRows {
		kx := x
		for _, kc := range row {
			lit := k.lit(kc.keyID, now, fade)
			// Let go of in this very frame, a key is still fully lit.
			fading = fading || lit > 0 && !k.held[kc.keyID]
			paint(ui.Rect{X: kx, Y: y, W: kc.width*pitch - gap, H: pitch - gap}, kc, lit)
			kx += kc.width * pitch
		}
		y += pitch
	}
	// The fade goes in steps, which the small keys and the faint glow
	// hide, rather than painting the window at the display's rate.
	if fading {
		pt.After(time.Second / 30)
	}
}

// drawLabel paints a key's label in the middle of kr. A color faded to no
// alpha paints nothing: MyGo would take it for none given and paint the
// theme's text color.
func drawLabel(pt *ui.Painter, kr ui.Rect, label string, size float32, c ui.Color) {
	if label == "" || c.A == 0 || size <= 0 {
		return
	}
	// Measured without its color, which changes as it fades, the label
	// stays in MyGo's cache of measured spans.
	w, h := pt.MeasureText(0, ui.Span{Text: label, Size: size})
	pt.RichText(kr.X+(kr.W-w)/2, kr.Y+(kr.H-h)/2, 0, ui.Span{Text: label, Size: size, Color: c})
}
