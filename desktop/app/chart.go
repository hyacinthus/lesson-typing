package app

import (
	"math"
	"strconv"
	"time"

	"github.com/egoist/mygo/ui"

	"github.com/hyacinthus/lesson-typing/desktop/internal/data"
)

// cpmChart draws the CPM of runs as an area chart, as the web's recharts
// AreaChart, with a tooltip on the run under the pointer.
func (a *App) cpmChart(c *ui.Context, runs []data.PracticeLog, height float32) {
	pal := a.pal
	const (
		left, right, top, bottom = 44, 12, 12, 28
	)
	maxCPM := 0
	for _, r := range runs {
		maxCPM = max(maxCPM, r.CPM)
	}
	step := niceStep(float64(maxCPM) / 4)
	ceil := float32(math.Max(step, math.Ceil(float64(maxCPM)/step)*step))
	labels := make([]string, len(runs))
	for i, r := range runs {
		labels[i] = formatWhen(r.CompletedAt)
	}

	box := ui.Box(c).FillWidth().Height(height)
	px, _, hovering := box.PointerPosition()
	box.Draw(func(p *ui.Painter, r ui.Rect) {
		plot := ui.Rect{X: r.X + left, Y: r.Y + top, W: r.W - left - right, H: r.H - top - bottom}
		at := func(i int, cpm int) (float32, float32) {
			x := plot.X
			if len(runs) > 1 {
				x += plot.W * float32(i) / float32(len(runs)-1)
			}
			return x, plot.Y + plot.H*(1-float32(cpm)/ceil)
		}
		// Grid and axes.
		for v := float32(0); v <= ceil+0.5; v += float32(step) {
			_, y := at(0, int(v))
			p.Line(plot.X, y, plot.X+plot.W, y, 1, pal.border)
			label := ui.Span{Text: strconv.Itoa(int(v)), Size: 11, Color: pal.mutedForeground}
			w, h := p.MeasureText(0, label)
			p.RichText(plot.X-8-w, y-h/2, 0, label)
		}
		lastRight := float32(math.Inf(-1))
		for i := range runs {
			x, _ := at(i, 0)
			label := ui.Span{Text: labels[i], Size: 11, Color: pal.mutedForeground}
			w, _ := p.MeasureText(0, label)
			lx := min(max(x-w/2, plot.X-left/2), plot.X+plot.W-w)
			if lx > lastRight+12 {
				p.RichText(lx, plot.Y+plot.H+10, 0, label)
				lastRight = lx + w
			}
		}
		// The area under the line, then the line and its dots.
		var line, area ui.Path
		for i, run := range runs {
			x, y := at(i, run.CPM)
			if i == 0 {
				line.MoveTo(x, y)
				area.MoveTo(x, plot.Y+plot.H)
			}
			line.LineTo(x, y)
			area.LineTo(x, y)
		}
		lastX, _ := at(len(runs)-1, 0)
		area.LineTo(lastX, plot.Y+plot.H)
		area.Close()
		p.FillPathGradient(&area, ui.LinearGradient{From: pal.primary.Alpha(0.3), To: pal.primary.Alpha(0), Angle: 180})
		p.StrokePath(&line, 2, pal.primary)
		hover := -1
		if hovering && len(runs) > 0 {
			best := float32(math.Inf(1))
			for i := range runs {
				x, _ := at(i, 0)
				if d := float32(math.Abs(float64(x - (r.X + px)))); d < best {
					best, hover = d, i
				}
			}
		}
		for i, run := range runs {
			x, y := at(i, run.CPM)
			radius := float32(4)
			fill, ring := pal.background, pal.primary
			if i == hover {
				radius, fill, ring = 6, pal.primary, pal.background
			}
			p.Fill(ui.Rect{X: x - radius, Y: y - radius, W: 2 * radius, H: 2 * radius}, ring, radius)
			p.Fill(ui.Rect{X: x - radius + 2, Y: y - radius + 2, W: 2*radius - 4, H: 2*radius - 4}, fill, radius-2)
		}
		if hover >= 0 {
			x, y := at(hover, runs[hover].CPM)
			a.chartTooltip(p, r, runs[hover], labels[hover], x, y)
		}
	})
}

// chartTooltip shows the figures of a run beside its dot at x, y, inside
// the chart's box r.
func (a *App) chartTooltip(p *ui.Painter, r ui.Rect, run data.PracticeLog, label string, x, y float32) {
	pal := a.pal
	rows := a.figures(run.WPM, run.CPM, data.FormatAccuracy(run.Accuracy), run.Duration)
	title := ui.Span{Text: label, Size: 13, Weight: 700, Color: pal.foreground}
	tw, th := p.MeasureText(0, title)
	width, lineH := tw, th
	for _, row := range rows {
		lw, _ := p.MeasureText(0, ui.Span{Text: row[0], Size: 13})
		vw, h := p.MeasureText(0, ui.Span{Text: row[1], Size: 13, Weight: 500})
		width = max(width, lw+24+vw)
		lineH = max(lineH, h)
	}
	box := ui.Rect{W: width + 24, H: th + 10 + float32(len(rows))*(lineH+6) + 18}
	box.X = x + 12
	if box.X+box.W > r.X+r.W {
		box.X = x - 12 - box.W // left of the dot near the right edge
	}
	box.Y = min(max(r.Y, y-box.H/2), r.Y+r.H-box.H)
	p.Shadow(box, 8, 0, 4, 16, 0, ui.RGBA(0, 0, 0, 0.15))
	p.Fill(box, pal.background, 8)
	p.Stroke(box, pal.border, 8, 1)
	ty := box.Y + 10
	p.RichText(box.X+12, ty, 0, title)
	ty += th + 10
	for _, row := range rows {
		p.RichText(box.X+12, ty, 0, ui.Span{Text: row[0], Size: 13, Color: pal.mutedForeground})
		val := ui.Span{Text: row[1], Size: 13, Weight: 500, Color: pal.foreground}
		vw, _ := p.MeasureText(0, val)
		p.RichText(box.X+box.W-12-vw, ty, 0, val)
		ty += lineH + 6
	}
}

// niceStep rounds a step of an axis to 1, 2 or 5 times a power of ten.
func niceStep(raw float64) float64 {
	if raw <= 0 {
		return 1
	}
	pow := math.Pow(10, math.Floor(math.Log10(raw)))
	for _, m := range []float64{1, 2, 5, 10} {
		if raw <= m*pow {
			return m * pow
		}
	}
	return 10 * pow
}

// formatWhen formats when a run was: its time today, else its date too.
func formatWhen(t time.Time) string {
	t = t.Local()
	now := time.Now()
	if t.Year() == now.Year() && t.YearDay() == now.YearDay() {
		return t.Format("15:04")
	}
	return t.Format("1/2 15:04")
}
