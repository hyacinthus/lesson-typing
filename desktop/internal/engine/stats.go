package engine

import (
	"fmt"
	"math"
)

// Stats are the figures of a run so far, as src/utils/statsCalculator.ts
// computes them. submit-practice checks them against its own computation,
// so they must match the web's.
type Stats struct {
	Duration            int // seconds
	CPM                 int // effective keystrokes per minute
	WPM                 int // Chinese or Japanese characters per minute, else words (5 characters)
	Accuracy            int // percent of the typed characters that are correct
	Total               int // characters typed
	Correct             int
	Incorrect           int
	EffectiveKeystrokes int
}

// initialStats are the stats before the clock starts.
var initialStats = Stats{Accuracy: 100}

// round rounds as JavaScript's Math.round does for the non-negative values
// stats have.
func round(x float64) int { return int(math.Floor(x + 0.5)) }

// calculate computes the stats of the first index characters typed in
// elapsedMs milliseconds.
func calculate(chars []Char, index int, elapsedMs int64, s script) Stats {
	typed := chars[:index]
	st := Stats{Total: index}
	for _, c := range typed {
		switch c.Status {
		case Correct:
			st.Correct++
		case Incorrect:
			st.Incorrect++
		}
		r := c.Typed
		if r == 0 {
			r = c.Want
		}
		st.EffectiveKeystrokes += keystrokes(r, s)
	}

	minutes := float64(elapsedMs) / 60000
	perMinute := func(n float64) int {
		if minutes <= 0 {
			return 0
		}
		return round(n / minutes)
	}
	st.CPM = perMinute(float64(st.EffectiveKeystrokes))

	switch s {
	case scriptChinese, scriptJapanese:
		n := 0
		for _, c := range typed {
			if c.Status != Correct {
				continue
			}
			if IsHan(c.Want) || (s == scriptJapanese && IsKana(c.Want)) {
				n++
			}
		}
		st.WPM = perMinute(float64(n))
	default:
		st.WPM = perMinute(float64(st.Correct) / 5)
	}

	st.Accuracy = 100
	if st.Total > 0 {
		st.Accuracy = round(float64(st.Correct) / float64(st.Total) * 100)
	}
	st.Duration = round(float64(elapsedMs) / 1000)
	return st
}

// Grade is the letter a run earns from its accuracy and CPM.
type Grade string

// Grades from best to worst.
const (
	GradeS Grade = "S"
	GradeA Grade = "A"
	GradeB Grade = "B"
	GradeC Grade = "C"
	GradeD Grade = "D"
)

// GradeOf grades a run, as getScoreLevel does.
func GradeOf(accuracy, cpm int) Grade {
	switch {
	case accuracy >= 95 && cpm >= 200:
		return GradeS
	case accuracy >= 90 && cpm >= 150:
		return GradeA
	case accuracy >= 80 && cpm >= 100:
		return GradeB
	case accuracy >= 70:
		return GradeC
	default:
		return GradeD
	}
}

// FormatDuration formats seconds as m:ss.
func FormatDuration(seconds int) string {
	return fmt.Sprintf("%d:%02d", seconds/60, seconds%60)
}
