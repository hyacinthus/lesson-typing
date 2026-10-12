package app

import "github.com/egoist/mygo/ui"

// palette holds the app's colors in light and dark: the web's accent and
// typing colors (src/index.css) over the neutral grays of macOS.
type palette struct {
	dark bool

	background, foreground ui.Color
	card                   ui.Color // sheets and popups
	muted, mutedForeground ui.Color // wells, and secondary text
	border                 ui.Color
	primary, primaryText   ui.Color
	destructive            ui.Color
	// The controls of the title bar sit on capsules.
	capsule, capsuleBorder ui.Color
	// backdrop dims the window behind a sheet.
	backdrop ui.Color

	charPending, charCorrect           ui.Color
	charCurrent, charCurrentBg         ui.Color
	charIncorrect, charIncorrectBg     ui.Color
	composition, compositionBackground ui.Color

	gradeS, gradeA, gradeB, gradeC, gradeD ui.Color
}

var lightPalette = palette{
	background:      ui.Hex("#ffffff"),
	foreground:      ui.Hex("#1d1d1f"),
	card:            ui.Hex("#ffffff"),
	muted:           ui.Hex("#f5f5f7"),
	mutedForeground: ui.Hex("#6e6e73"),
	border:          ui.RGBA(0, 0, 0, 0.1),
	primary:         ui.Hex("#007FFF"),
	primaryText:     ui.Hex("#ffffff"),
	destructive:     ui.Oklch(0.577, 0.245, 27.325),
	capsule:         ui.RGBA(255, 255, 255, 0.92),
	capsuleBorder:   ui.RGBA(0, 0, 0, 0.08),
	backdrop:        ui.RGBA(0, 0, 0, 0.12),

	charPending:           ui.Hex("#6b7280"),
	charCorrect:           ui.Hex("#16a34a"),
	charCurrent:           ui.Hex("#1565c0"),
	charCurrentBg:         ui.Hex("#cfe6ff"),
	charIncorrect:         ui.Hex("#dc2626"),
	charIncorrectBg:       ui.Hex("#fee2e2"),
	composition:           ui.Hex("#b45309"),
	compositionBackground: ui.Hex("#fef3c7"),

	gradeS: ui.Hex("#d97706"),
	gradeA: ui.Hex("#16a34a"),
	gradeB: ui.Hex("#2563eb"),
	gradeC: ui.Hex("#64748b"),
	gradeD: ui.Hex("#dc2626"),
}

var darkPalette = palette{
	dark:            true,
	background:      ui.Hex("#1e1e20"),
	foreground:      ui.Hex("#f5f5f7"),
	card:            ui.Hex("#2a2a2d"),
	muted:           ui.Hex("#323236"),
	mutedForeground: ui.Hex("#a1a1a6"),
	border:          ui.RGBA(255, 255, 255, 0.12),
	primary:         ui.Hex("#4DA6FF"),
	primaryText:     ui.Oklch(0.15, 0.02, 255),
	destructive:     ui.Oklch(0.704, 0.191, 22.216),
	capsule:         ui.RGBA(58, 58, 62, 0.92),
	capsuleBorder:   ui.RGBA(255, 255, 255, 0.1),
	backdrop:        ui.RGBA(0, 0, 0, 0.35),

	charPending:           ui.Hex("#94a3b8"),
	charCorrect:           ui.Hex("#4ade80"),
	charCurrent:           ui.Hex("#8ec9ff"),
	charCurrentBg:         ui.Hex("#17395c"),
	charIncorrect:         ui.Hex("#fca5a5"),
	charIncorrectBg:       ui.RGBA(153, 27, 27, 0.3),
	composition:           ui.Hex("#fde68a"),
	compositionBackground: ui.Hex("#713f12"),

	gradeS: ui.Hex("#fbbf24"),
	gradeA: ui.Hex("#4ade80"),
	gradeB: ui.Hex("#60a5fa"),
	gradeC: ui.Hex("#94a3b8"),
	gradeD: ui.Hex("#fca5a5"),
}

// The widgets' themes in the app's colors.
var (
	lightTheme = lightPalette.theme()
	darkTheme  = darkPalette.theme()
)

// theme returns the widgets' theme in the palette's colors.
func (p *palette) theme() *ui.Theme {
	t := ui.LightTheme()
	if p.dark {
		t = ui.DarkTheme()
	}
	t.Background = p.background
	t.Text = p.foreground
	t.TextMuted = p.mutedForeground
	t.Border = p.border
	t.Accent = p.primary
	t.AccentHover = p.primary.Mix(p.background, 0.1)
	t.AccentPressed = p.primary.Mix(p.foreground, 0.15)
	t.AccentText = p.primaryText
	t.Focus = p.primary.Alpha(0.5)
	t.Danger = p.destructive
	t.Radius = 10
	return t
}

// gradeColor returns the color of a grade letter.
func (p *palette) gradeColor(g string) ui.Color {
	switch g {
	case "S":
		return p.gradeS
	case "A":
		return p.gradeA
	case "B":
		return p.gradeB
	case "C":
		return p.gradeC
	default:
		return p.gradeD
	}
}
