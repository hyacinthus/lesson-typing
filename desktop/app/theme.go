package app

import "github.com/egoist/mygo/ui"

// palette holds the app's colors, those of src/index.css in light and dark.
type palette struct {
	dark bool

	background, foreground ui.Color
	card                   ui.Color
	muted, mutedForeground ui.Color
	border                 ui.Color
	primary, primaryText   ui.Color
	destructive            ui.Color
	header, headerText     ui.Color
	results                ui.Color

	charPending, charCorrect           ui.Color
	charCurrent, charCurrentBg         ui.Color
	charIncorrect, charIncorrectBg     ui.Color
	composition, compositionBackground ui.Color

	gradeS, gradeA, gradeB, gradeC, gradeD ui.Color
}

var lightPalette = palette{
	background:      ui.Oklch(0.985, 0.002, 247.839),
	foreground:      ui.Oklch(0.145, 0, 0),
	card:            ui.Hex("#ffffff"),
	muted:           ui.Oklch(0.97, 0, 0),
	mutedForeground: ui.Oklch(0.556, 0, 0),
	border:          ui.Oklch(0.922, 0, 0),
	primary:         ui.Hex("#007FFF"),
	primaryText:     ui.Hex("#ffffff"),
	destructive:     ui.Oklch(0.577, 0.245, 27.325),
	header:          ui.Hex("#E9F4FF"),
	headerText:      ui.Oklch(0.145, 0, 0),
	results:         ui.Hex("#E9F4FF"),

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
	background:      ui.Oklch(0.18, 0.02, 255),
	foreground:      ui.Oklch(0.96, 0.005, 250),
	card:            ui.Oklch(0.23, 0.025, 255),
	muted:           ui.Oklch(0.29, 0.025, 255),
	mutedForeground: ui.Oklch(0.73, 0.015, 250),
	border:          ui.RGBA(255, 255, 255, 0.12),
	primary:         ui.Hex("#4DA6FF"),
	primaryText:     ui.Oklch(0.15, 0.02, 255),
	destructive:     ui.Oklch(0.704, 0.191, 22.216),
	header:          ui.Hex("#0C3A66"),
	headerText:      ui.Oklch(0.985, 0, 0),
	results:         ui.Oklch(0.26, 0.02, 255),

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
