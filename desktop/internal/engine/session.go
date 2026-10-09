// Package engine is the typing engine of the desktop app: a run through a
// lesson, its stats and the lenient matching of punctuation. It ports
// src/hooks/useTypingEngine.ts and src/utils, whose tests it keeps.
package engine

import "time"

// Status is the state of a character of the lesson.
type Status uint8

// The states of a character.
const (
	Pending Status = iota
	Current        // the next to type
	Correct
	Incorrect
)

// Char is a character of the lesson and what was typed for it.
type Char struct {
	Want   rune
	Typed  rune // 0 until typed
	Status Status
}

// Session is a run through a lesson. The clock starts at the first key, or
// provisionally as an input method starts composing (MarkStart), which
// CancelStart rolls back when the composition commits nothing.
type Session struct {
	Chars []Char
	// Index is the character to type next; len(Chars) once done.
	Index int
	// Start is when the clock started, zero before.
	Start time.Time
	// ElapsedMs is the time of the last edit since Start, which the stats
	// are computed from.
	ElapsedMs int64
	Done      bool
	// Trace holds, for each character committed, its time since Start in
	// milliseconds. Deleting removes none, retyping adds more.
	Trace []int64
	// Edits counts the changes of the characters, which views compare to
	// redraw only after one.
	Edits int

	text      []rune
	script    script
	committed bool   // a character was committed since the start or the reset
	stats     *Stats // the stats as of the last edit, computed once asked
}

// NewSession starts a run through text.
func NewSession(text string) *Session {
	s := &Session{text: []rune(text)}
	s.Reset()
	s.script = detectScript(s.Chars)
	return s
}

// edited records a change of the run, for Edits and the stats.
func (s *Session) edited() {
	s.Edits++
	s.stats = nil
}

// Reset restarts the run from the first character, the clock stopped.
func (s *Session) Reset() {
	s.Chars = make([]Char, len(s.text))
	for i, r := range s.text {
		s.Chars[i] = Char{Want: r}
	}
	if len(s.Chars) > 0 {
		s.Chars[0].Status = Current
	}
	s.Index, s.Start, s.ElapsedMs, s.Done, s.Trace, s.committed = 0, time.Time{}, 0, false, nil, false
	s.edited()
}

// Started reports whether the clock runs, or ran.
func (s *Session) Started() bool { return !s.Start.IsZero() }

// Result is what an edit changed beyond the characters.
type Result struct {
	// FirstCommit is set by the first character committed since the start
	// or the reset, which begins a run worth recording.
	FirstCommit bool
	// Completed is set by the edit typing the last character.
	Completed bool
}

// Input takes text typed or committed by an input method at now: one
// character per key, or a whole phrase at once.
func (s *Session) Input(text string, now time.Time) Result {
	if s.Done || s.Index >= len(s.Chars) || text == "" {
		return Result{}
	}
	if s.Start.IsZero() {
		s.Start = now
	}
	since := now.Sub(s.Start).Milliseconds()

	typed := []rune(text)
	expected := make([]rune, 0, len(typed))
	for i := s.Index; i < len(s.Chars) && i < s.Index+len(typed); i++ {
		expected = append(expected, s.Chars[i].Want)
	}
	for _, r := range ResolveInput(typed, expected) {
		if s.Index >= len(s.Chars) {
			break
		}
		c := &s.Chars[s.Index]
		c.Typed, c.Status = r, Incorrect
		if Matches(r, c.Want) {
			c.Status = Correct
		}
		s.Index++
		s.Trace = append(s.Trace, since)
	}
	s.ElapsedMs = since
	s.edited()

	var res Result
	if s.Index > 0 && !s.committed {
		s.committed = true
		res.FirstCommit = true
	}
	if s.Index >= len(s.Chars) {
		s.Done = true
		res.Completed = true
	} else {
		s.Chars[s.Index].Status = Current
	}
	return res
}

// Delete steps back over the last character typed.
func (s *Session) Delete(now time.Time) {
	if s.Index == 0 || s.Done {
		return
	}
	if s.Index < len(s.Chars) {
		s.Chars[s.Index].Status = Pending
	}
	s.Index--
	s.Chars[s.Index] = Char{Want: s.Chars[s.Index].Want, Status: Current}
	if !s.Start.IsZero() {
		s.ElapsedMs = now.Sub(s.Start).Milliseconds()
	}
	s.edited()
}

// MarkStart starts the clock as an input method starts composing, so that
// it runs while the first phrase is composed.
func (s *Session) MarkStart(now time.Time) {
	if s.Start.IsZero() {
		s.Start = now
		s.stats = nil
	}
}

// CancelStart rolls a provisional start back when a composition ends
// without committing, as long as nothing was ever committed: the run is
// pristine again, its clock at 0. Later cancels keep the clock running.
func (s *Session) CancelStart() {
	if s.committed || len(s.Trace) > 0 {
		return
	}
	s.Start, s.ElapsedMs = time.Time{}, 0
	s.stats = nil
}

// Stats returns the stats as of the last edit.
func (s *Session) Stats() Stats {
	if s.Start.IsZero() {
		return initialStats
	}
	if s.stats == nil {
		st := calculate(s.Chars, s.Index, s.ElapsedMs, s.script)
		s.stats = &st
	}
	return *s.stats
}

// Seconds returns the duration to show at now: the clock keeps running
// between keys, and stops when the run is done.
func (s *Session) Seconds(now time.Time) int {
	if s.Start.IsZero() {
		return 0
	}
	st := s.Stats()
	if s.Done {
		return st.Duration
	}
	return max(st.Duration, round(float64(now.Sub(s.Start).Milliseconds())/1000))
}
