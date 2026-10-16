package app

import (
	"runtime"
	"slices"
	"time"

	"github.com/egoist/mygo/ui"
)

// The translucent keyboard in the practice's bottom right corner, which
// lights the keys as they are pressed: the web's KeyboardOverlay
// (src/components/typing/KeyboardOverlay.tsx), with its rows
// (src/utils/keyboardLayout.ts). The web's keys go by position; MyGo's go
// by what they type (KeyA types an a), so an AZERTY A lights where QWERTY
// has it, and on macOS the letters of layouts without Latin letters, such
// as Korean's, do not light.

const (
	keySize    = 18
	keyGap     = 3
	keyPadding = 8
	keyFade    = 200 * time.Millisecond
)

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

// lit returns how lit id is at now, from 0 to 1 while held.
func (k *keyboard) lit(id keyID, now time.Time) float32 {
	if k.held[id] {
		return 1
	}
	if d := now.Sub(k.released[id]); d >= 0 && d < keyFade {
		return 1 - float32(d)/float32(keyFade)
	}
	return 0
}

// keyboardView builds the keyboard in the bottom right corner of its
// parent, under which the pointer reaches the page.
func (a *App) keyboardView(c *ui.Context, k *keyboard) {
	pal := a.pal
	ui.Box(c).Absolute().Right(16).Bottom(16).PassThrough().
		Width(15*keySize+14*keyGap+2*keyPadding).Height(5*keySize+4*keyGap+2*keyPadding).
		Radius(12).Background(pal.background.Alpha(0.4)).Border(1, pal.border).
		Draw(func(pt *ui.Painter, r ui.Rect) {
			now := pt.Now()
			fading := false
			y := r.Y + keyPadding
			for _, row := range keyboardRows {
				x := r.X + keyPadding
				for _, kc := range row {
					kr := ui.Rect{X: x, Y: y, W: kc.width*keySize + (kc.width-1)*keyGap, H: keySize}
					x += kr.W + keyGap
					lit := k.lit(kc.keyID, now)
					// Let go of in this very frame, a key is still fully lit.
					fading = fading || lit > 0 && !k.held[kc.keyID]
					pt.Fill(kr, pal.foreground.Alpha(0.05).Mix(pal.primary, lit), 4)
					pt.Stroke(kr, pal.foreground.Alpha(0.15).Mix(pal.primary, lit), 4, 1)
					if kc.label != "" {
						sp := ui.Span{Text: kc.label, Size: 10, Color: pal.foreground.Alpha(0.45).Mix(pal.primaryText, lit)}
						w, h := pt.MeasureText(0, sp)
						pt.RichText(kr.X+(kr.W-w)/2, kr.Y+(kr.H-h)/2, 0, sp)
					}
				}
				y += keySize + keyGap
			}
			// The fade goes in steps, which the small keys hide, rather
			// than painting the window at the display's rate.
			if fading {
				pt.After(time.Second / 30)
			}
		})
}
