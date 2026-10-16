package app

import (
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
	q, shift := keyID{key: ui.KeyQ}, keyID{mod: ui.Shift}
	down := func(k ui.Key) { p.keys.observe(ui.InputEvent{Kind: ui.InputKeyDown, Key: k}, time.Now()) }

	// A key pressed in the typing area lights, then fades out.
	before := time.Now()
	tt.Key(0, ui.KeyQ)
	up := p.keys.released[q]
	if up.Before(before) || p.keys.held[q] {
		t.Fatalf("Q let go of at %v, held %v", up, p.keys.held[q])
	}
	if l := p.keys.lit(q, up.Add(keyFade/2)); l <= 0 || l >= 1 {
		t.Fatalf("fading, Q is %v lit", l)
	}
	if p.keys.lit(q, up.Add(keyFade)) != 0 {
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
	if p.keys.lit(keyID{key: ui.KeyN}, now) != 1 {
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

// The title bar's toggle and the Practice menu show and hide the keyboard,
// which the app remembers.
func TestKeyboardToggle(t *testing.T) {
	h := newHarness(t)
	a := h.app
	h.start()
	label := a.t("show_keyboard")
	item := menuItem(a, label)
	if item == nil || !item.Checked || item.Accelerator != "CmdOrCtrl+K" {
		t.Fatalf("%s: %+v", label, item)
	}

	h.click(label) // the title bar's toggle
	if !a.prefs.HideKeyboard || menuItem(a, label).Checked {
		t.Fatalf("hidden %v, checked %v", a.prefs.HideKeyboard, menuItem(a, label).Checked)
	}
	h.snapshot("keyboard-hidden")

	item = menuItem(a, label)
	item.Click(item, nil)
	h.settle("the keyboard", func() bool { return !a.prefs.HideKeyboard })
	if !menuItem(a, label).Checked {
		t.Fatal("the menu does not check the keyboard shown again")
	}
}
