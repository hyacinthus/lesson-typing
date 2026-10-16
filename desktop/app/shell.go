package app

import (
	"math"
	"runtime"
	"strconv"
	"time"

	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/engine"
)

// The window's title bar, which the view draws under the window's controls:
// the lesson's title on the left, how the run goes in the middle, and the
// controls on the right, on capsules, as macOS's toolbars have them.

const (
	// HeaderHeight is the height of the title bar the view draws, which
	// holds the window controls.
	HeaderHeight  = 56
	headerHeight  = HeaderHeight
	capsuleHeight = 34
	// wideHeader is the width of a window whose title bar has room for the
	// run's status between the title and the controls; a narrower window
	// shows it under the title bar.
	wideHeader = 1080
)

// digitKeys are the keys of the collections' shortcuts, Cmd+1 to Cmd+9.
var digitKeys = []ui.Key{ui.Key1, ui.Key2, ui.Key3, ui.Key4, ui.Key5, ui.Key6, ui.Key7, ui.Key8, ui.Key9}

// titleBar builds the bar along the top of the window, which drags the
// window: the title, the center part, nil for none, and the right part.
func (a *App) titleBar(c *ui.Context, title string, center, right func()) {
	bar := c.TitleBar()
	ui.Row(c).Height(headerHeight).FillWidth().Padding(0, bar.Right+16, 0, bar.Left+20).Gap(16).
		DragWindow().Children(func() {
		ui.Row(c).Basis(0).Grow(1).MinWidth(0).Children(func() {
			ui.Text(c, title).FontSize(18).FontWeight(600).SingleLine()
		})
		if center != nil {
			ui.Row(c).Shrink(0).Children(center)
		}
		ui.Row(c).Basis(0).Grow(1).Gap(10).Justify(ui.End).Children(right)
	})
}

// capsule styles e as a control of the title bar, on a capsule.
func (a *App) capsule(e ui.Element) ui.Element {
	pal := a.pal
	return e.Height(capsuleHeight).Radius(capsuleHeight/2).Background(pal.capsule).Border(1, pal.capsuleBorder).
		Shadow(0, 1, 3, 0, ui.RGBA(0, 0, 0, 0.08))
}

// shortcutText is how a shortcut of Cmd and key reads on the platform.
func shortcutText(key string) string {
	if runtime.GOOS == "darwin" {
		return "⌘" + key
	}
	return "Ctrl+" + key
}

// capsuleButton is a button of the title bar on a capsule, showing what
// content builds.
func (a *App) capsuleButton(c *ui.Context, label string, content func()) ui.Element {
	pal := a.pal
	b := ui.Button(c, "").Label(label)
	a.capsule(b).Padding(0, 12).Gap(6)
	if b.Hovered() {
		b.Background(pal.capsule.Mix(pal.foreground, 0.05))
	}
	return b.Children(content)
}

// toolButton is an icon button on a capsule, with a face only under the
// pointer, as a toolbar's buttons; its tooltip names its shortcut. An
// active one's icon is in the theme's color.
func (a *App) toolButton(c *ui.Context, ic *ui.SVG, label, shortcut string, active bool) ui.Element {
	pal := a.pal
	b := ui.ButtonBase(c).Label(label).Tooltip(label+"  "+shortcutText(shortcut)).Size(38, 28).Radius(14).Center()
	if b.Hovered() {
		b.Background(pal.foreground.Alpha(0.07))
	}
	iconColor := pal.foreground.Alpha(0.85)
	if active {
		iconColor = pal.primary
	}
	return b.Children(func() {
		ui.Icon(c, ic).FontSize(17).TextColor(iconColor)
	})
}

// practiceControls are the controls of the practice: the collection, a
// change of lesson, a restart, the next keyboard mode, and the account.
func (a *App) practiceControls(c *ui.Context, p *practice) {
	a.collectionButton(c)
	// A toolbar's capsule, which ui.Toolbar would widen by the room of its
	// overflow menu.
	a.capsule(ui.Row(c)).Padding(0, 3).Children(func() {
		if a.toolButton(c, iconShuffle, a.t("change_article"), "N", false).Clicked() {
			a.nextLesson(p)
		}
		if a.toolButton(c, iconRestart, a.t("restart"), "R", false).Clicked() {
			a.restart(p)
		}
		// Asked every frame, as MyGo takes the shortcut for the next one.
		shortcut := c.Shortcut(ui.Cmd, ui.KeyK)
		m := keyboardModes[a.keyboardIndex()]
		if a.toolButton(c, m.icon, a.t("keyboard_mode."+m.mode), "K", m.mode != keyboardOff).Clicked() || shortcut {
			a.nextKeyboard()
		}
	})
	a.accountButton(c)
}

// collectionButton chooses the collection to practice from a menu, as the
// menu bar's Practice menu does: a rare choice, which the title bar keeps
// small.
func (a *App) collectionButton(c *ui.Context) {
	cols := a.catalog.collections
	if len(cols) == 0 {
		return
	}
	pal := a.pal
	current := a.collection()
	b := a.capsuleButton(c, current.Name, func() {
		ui.Icon(c, iconBook).FontSize(15).TextColor(pal.primary)
		ui.Text(c, current.Name).FontSize(13).FontWeight(500).SingleLine()
		ui.Icon(c, iconChevronsUpDown).FontSize(11).TextColor(pal.mutedForeground)
	}).Tooltip(a.t("desktop.switch_collection"))
	b.Menu(func(m *ui.Menu) {
		for i, col := range cols {
			it := m.Item(col.Name).Checked(col.ID == current.ID)
			if i < len(digitKeys) {
				it.Shortcut(ui.Cmd, digitKeys[i])
			}
			if it.Chosen() {
				a.chooseCollection(col.ID)
			}
		}
	})
}

// runStatus shows how the run goes: its progress, time, speeds and
// accuracy; before it starts, that the clock waits for the first
// character.
func (a *App) runStatus(c *ui.Context, p *practice) {
	pal, s := a.pal, p.session
	if s == nil {
		return
	}
	row := a.capsule(ui.Row(c)).Gap(12).Padding(0, 16, 0, 12).Shrink(0)
	if !s.Started() && !s.Done {
		row.Gap(8).Children(func() {
			ui.Icon(c, iconKeyboard).FontSize(17).TextColor(pal.mutedForeground)
			ui.Text(c, a.t("desktop.timer_hint")).FontSize(13).TextColor(pal.mutedForeground).SingleLine()
		})
		return
	}
	now := time.Now()
	st := s.Stats()
	secs := s.Seconds(now)
	if !s.Done {
		// Tick with the clock.
		c.After(time.Second - now.Sub(s.Start)%time.Second)
	}
	grade := string(engine.GradeOf(st.Accuracy, st.CPM))
	gradeColor := pal.gradeColor(grade)
	progress := float32(1)
	if len(s.Chars) > 0 {
		progress = float32(s.Index) / float32(len(s.Chars))
	}
	row.Children(func() {
		a.progressRing(c, progress)
		ui.Text(c, engine.FormatDuration(secs)).FontSize(13).FontWeight(600).FontFeatures("tnum")
		figure := func(value int, unit string) {
			ui.Box(c).Size(1, 14).Background(pal.border)
			ui.Row(c).Gap(4).Shrink(0).Children(func() {
				ui.Text(c, strconv.Itoa(value)).FontSize(13).FontWeight(600).FontFeatures("tnum").NoWrap()
				ui.Text(c, unit).FontSize(13).TextColor(pal.mutedForeground).NoWrap()
			})
		}
		figure(st.CPM, a.t("stats.char_unit"))
		figure(st.WPM, a.t("stats.wpm_unit"))
		ui.Box(c).Size(1, 14).Background(pal.border)
		// No accuracy before a character is typed, while the first phrase is
		// composed.
		if st.Correct+st.Incorrect == 0 {
			ui.Text(c, "—").FontSize(13).TextColor(pal.mutedForeground)
			return
		}
		ui.Row(c).Gap(6).Children(func() {
			ui.Text(c, strconv.Itoa(st.Accuracy)+"%").FontSize(13).FontWeight(600).FontFeatures("tnum").TextColor(gradeColor)
			ui.Text(c, grade).FontSize(10).Bold().TextColor(gradeColor).Background(gradeColor.Alpha(0.15)).Radius(5).Padding(1, 5)
		})
	})
}

// progressRing shows the share of the text typed, around a ring.
func (a *App) progressRing(c *ui.Context, progress float32) {
	pal := a.pal
	ring := ui.Box(c).Size(20, 20)
	shown := ring.Animate("progress", progress, 300*time.Millisecond)
	ring.Draw(func(pt *ui.Painter, r ui.Rect) {
		const radius, width = 7.5, 3
		cx, cy := r.X+r.W/2, r.Y+r.H/2
		pt.StrokePath(new(ui.Path).Circle(cx, cy, radius), width, pal.foreground.Alpha(0.1))
		if shown <= 0 {
			return
		}
		arc := new(ui.Path)
		n := max(2, int(48*shown))
		for i := 0; i <= n; i++ {
			t := float64(shown)*2*math.Pi*float64(i)/float64(n) - math.Pi/2
			x, y := cx+radius*float32(math.Cos(t)), cy+radius*float32(math.Sin(t))
			if i == 0 {
				arc.MoveTo(x, y)
			} else {
				arc.LineTo(x, y)
			}
		}
		pt.StrokePath(arc, width, pal.primary)
	})
}
