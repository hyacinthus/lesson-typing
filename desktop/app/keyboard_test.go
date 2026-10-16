package app

import (
	"image"
	"slices"
	"testing"
	"time"

	"github.com/egoist/mygo/ui"
)

func TestKeyboardRows(t *testing.T) {
	for i, row := range slices.Concat(keyboardRows[:4], [][]keyCap{bottomRow(true), bottomRow(false)}) {
		var width float32
		for _, k := range row {
			width += k.width
		}
		if width != 15 {
			t.Errorf("row %d is %v keys wide", i, width)
		}
	}
	if q := keyboardRows[1][1]; q.key != ui.KeyQ || q.label != "Q" {
		t.Errorf("Q is %+v", q)
	}
	if zero := keyboardRows[0][10]; zero.key != ui.Key0 {
		t.Errorf("0 is %+v", zero)
	}
}

func TestKeyboardLightsTheKeys(t *testing.T) {
	h := newHarness(t)
	tt := h.tt
	p := h.start()
	h.app.setKeyboard(keyboardCorner)
	q, shift := keyID{key: ui.KeyQ}, keyID{mod: ui.Shift}
	down := func(k ui.Key) { p.keys.observe(ui.InputEvent{Kind: ui.InputKeyDown, Key: k}, time.Now()) }

	// A key pressed in the typing area lights, then fades out.
	before := time.Now()
	tt.Key(0, ui.KeyQ)
	up := p.keys.released[q]
	if up.Before(before) || p.keys.held[q] {
		t.Fatalf("Q let go of at %v, held %v", up, p.keys.held[q])
	}
	if l := p.keys.lit(q, up.Add(cornerFade/2), cornerFade); l <= 0 || l >= 1 {
		t.Fatalf("fading, Q is %v lit", l)
	}
	if p.keys.lit(q, up.Add(cornerFade), cornerFade) != 0 {
		t.Fatal("Q stayed lit")
	}

	// Held, keys stay lit.
	down(ui.KeyQ)
	tt.HoldModifiers(ui.Shift)
	tt.Frame()
	if !p.keys.held[q] || !p.keys.held[shift] {
		t.Fatalf("held: %v", p.keys.held)
	}
	h.snapshot("keyboard")
	tt.HoldModifiers(0)
	tt.Frame()
	if p.keys.held[shift] {
		t.Fatal("Shift stayed held")
	}

	// A key that only comes up, as while an input method composes, lights
	// as it does.
	now := time.Now()
	p.keys.observe(ui.InputEvent{Kind: ui.InputKeyUp, Key: ui.KeyN}, now)
	if p.keys.lit(keyID{key: ui.KeyN}, now, cornerFade) != 1 {
		t.Fatal("a key up alone did not light")
	}

	// On macOS, Command let go of lets go of the keys pressed with it,
	// whose key ups never come.
	tt.HoldModifiers(ui.Super)
	down(ui.KeyK)
	tt.HoldModifiers(0)
	tt.Frame()
	if p.keys.held[keyID{key: ui.KeyK}] != !macOS {
		t.Fatalf("K held %v after Command", p.keys.held[keyID{key: ui.KeyK}])
	}

	// Every key lets go once the window goes to the background.
	down(ui.KeyW)
	tt.SetFocused(false)
	tt.Frame()
	if p.keys.held[keyID{key: ui.KeyW}] || p.keys.held[q] {
		t.Fatal("keys stayed held in the background")
	}
}

// The title bar's button, Cmd+K and the Practice menu switch between the
// large keyboard, the default, the one in the corner and none, which the
// app remembers.
func TestKeyboardModes(t *testing.T) {
	h := newHarness(t)
	a := h.app
	tt := h.tt
	p := h.start()
	large, corner, off := a.t("keyboard_mode.large"), a.t("keyboard_mode.corner"), a.t("keyboard_mode.off")
	checked := func(label string) bool {
		it := menuItem(a, label)
		if it == nil {
			t.Fatalf("no %q in the menu", label)
		}
		return it.Checked
	}
	if !checked(large) || checked(corner) || checked(off) {
		t.Fatalf("the menu checks %v %v %v", checked(large), checked(corner), checked(off))
	}
	p.keys.observe(ui.InputEvent{Kind: ui.InputKeyDown, Key: ui.KeyF}, time.Now())
	p.keys.observe(ui.InputEvent{Kind: ui.InputKeyDown, Key: ui.KeyJ}, time.Now())
	tt.HoldModifiers(ui.Shift)
	tt.Frame()
	h.snapshot("keyboard-large")
	tt.HoldModifiers(0)

	h.click(large) // the title bar's button, named after the mode
	if a.prefs.Keyboard != keyboardCorner || !checked(corner) {
		t.Fatalf("mode %q, corner checked %v", a.prefs.Keyboard, checked(corner))
	}

	tt.Key(ui.Cmd, ui.KeyK)
	tt.Frame()
	if a.prefs.Keyboard != keyboardOff || !checked(off) {
		t.Fatalf("after Cmd+K, mode %q", a.prefs.Keyboard)
	}

	item := menuItem(a, large)
	item.Click(item, nil)
	h.settle("the large keyboard", func() bool { return a.prefs.Keyboard == keyboardLarge })
	if !checked(large) {
		t.Fatal("the menu does not check the large keyboard")
	}
}

// A key at the very end of its fade on the large keyboard paints nothing.
// Its label's alpha rounds to 0 there, and MyGo paints a span of no alpha
// in the theme's text color, which flashed the letter at full strength.
func TestLargeKeyboardFadesOut(t *testing.T) {
	h := newHarness(t)
	a, tt := h.app, h.tt
	p := h.start()
	a.setKeyboard(keyboardLarge)
	tt.Frame()
	unlit := image.NewRGBA(tt.Image().Bounds())
	copy(unlit.Pix, tt.Image().Pix)

	// 480ms into the 500ms fade, the label's alpha is 0.7*0.04² of 255.
	p.keys.release(keyID{key: ui.KeyF}, time.Now().Add(-480*time.Millisecond))
	tt.Frame()
	img := tt.Image()
	b := img.Bounds()
	for y := b.Dy() / 2; y < b.Dy(); y++ {
		for x := 0; x < b.Dx(); x++ {
			i := img.PixOffset(x, y)
			for c := range 3 {
				if d := int(img.Pix[i+c]) - int(unlit.Pix[i+c]); d > 8 || d < -8 {
					h.snapshot("keyboard-fade-end")
					t.Fatalf("the faded key paints at (%d, %d): %v, not %v", x, y, img.Pix[i:i+3], unlit.Pix[i:i+3])
				}
			}
		}
	}
}
