package app

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/hyacinthus/lesson-typing/desktop/internal/data"
	"github.com/hyacinthus/lesson-typing/desktop/internal/engine"
)

// practice is a lesson being practiced: its runs, one after the other,
// and what the server knows of them.
type practice struct {
	id      string
	loading bool
	failed  bool
	lesson  *data.Lesson
	session *engine.Session
	view    *textView

	// The input method's composition, and its caret in runes.
	composing    string
	composeCaret int
	// cancelPending is set when a composition ended, until the text it
	// committed comes; still set at the next frame, it committed nothing.
	// A commit ends the composition and brings its text in the same batch
	// of events, from one call of the input method on every platform
	// (insertText: on macOS, WM_IME_COMPOSITION on Windows, GTK's commit
	// signal within its key filtering), which no frame splits.
	cancelPending bool
	lastInput     time.Time

	// serverRun is the server's record of the run, open from its first
	// character while signed in.
	serverRun *serverRun
	// best is the user's best run before this one.
	best   *data.PracticeLog
	board  leaderboard
	result *result
	// version counts the runs, so that late answers about an earlier run
	// are dropped.
	version int
}

// serverRun is a start-practice call: done closes once id is known, ""
// when it failed.
type serverRun struct {
	done chan struct{}
	id   string
}

type leaderboard struct {
	loaded bool
	top    []data.LeaderboardEntry
	me     *data.LeaderboardEntry
}

// result is a completed run.
type result struct {
	stats     engine.Stats
	newRecord bool
	// recent are the user's latest runs of the lesson, for the chart.
	recent      []data.PracticeLog
	completedAt time.Time
}

// practiceFor returns the practice of lesson id, starting to load it.
func (a *App) practiceFor(id string) *practice {
	if p := a.practice; p != nil && p.id == id {
		return p
	}
	p := &practice{id: id, loading: true}
	a.practice = p
	a.run(func(ctx context.Context) func() {
		lesson, err := a.store.Lesson(ctx, id)
		return func() {
			p.loading = false
			if err != nil {
				log.Printf("load lesson %s: %v", id, err)
				p.failed = true
				return
			}
			if lesson == nil {
				return
			}
			p.lesson = lesson
			p.session = engine.NewSession(lesson.Content)
			p.view = newTextView(lesson.Content)
		}
	})
	a.loadBest(p)
	a.loadLeaderboard(p)
	return p
}

// loadBest fetches the user's best run of the lesson, which a new record
// beats.
func (a *App) loadBest(p *practice) {
	user := a.userID()
	if user == "" {
		p.best = nil
		return
	}
	v := p.version
	a.run(func(ctx context.Context) func() {
		best, err := a.store.BestLog(ctx, user, p.id)
		if err != nil {
			log.Printf("load best run: %v", err)
		}
		return func() {
			if p.version == v {
				p.best = best
			}
		}
	})
}

func (a *App) loadLeaderboard(p *practice) {
	a.run(func(ctx context.Context) func() {
		top, me, err := a.store.Leaderboard(ctx, p.id)
		if err != nil {
			log.Printf("load leaderboard: %v", err)
			return nil
		}
		return func() { p.board = leaderboard{loaded: true, top: top, me: me} }
	})
}

// restart starts the lesson over.
func (a *App) restart(p *practice) {
	if p.session == nil {
		return
	}
	p.version++
	p.session.Reset()
	p.composing, p.cancelPending = "", false
	p.serverRun, p.result = nil, nil
	a.loadBest(p)
}

// nextLesson goes to another lesson of the same collection.
func (a *App) nextLesson(p *practice) {
	l := p.lesson
	if l == nil {
		return
	}
	pick := func(lessons []data.LessonSummary) {
		if next := data.PickRandom(lessons, l.Language, l.CollectionID, l.ID); next != nil {
			a.router.Replace("/lesson/" + next.ID)
		}
	}
	if l.Language == a.lang.Lessons {
		pick(a.catalog.lessons)
		return
	}
	// A lesson of another language, opened by a link.
	a.run(func(ctx context.Context) func() {
		lessons, err := a.store.Lessons(ctx, l.Language)
		if err != nil {
			log.Printf("load lessons: %v", err)
			return nil
		}
		return func() {
			if a.practice == p {
				pick(lessons)
			}
		}
	})
}

// typed takes text typed or committed by an input method.
func (a *App) typed(p *practice, text string) {
	if p.session == nil {
		return
	}
	text = strings.ReplaceAll(strings.ReplaceAll(text, "\r\n", "\n"), "\r", "\n")
	now := time.Now()
	p.lastInput = now
	res := p.session.Input(text, now)
	if res.FirstCommit {
		a.startServerRun(p)
	}
	if res.Completed {
		a.complete(p, now)
	}
}

// deleted steps back over the last character.
func (a *App) deleted(p *practice) {
	if p.session == nil {
		return
	}
	p.lastInput = time.Now()
	p.session.Delete(p.lastInput)
}

// composed shows the input method's composition; empty, it ended.
func (a *App) composed(p *practice, text string, caret int) {
	if p.session == nil || p.session.Done {
		return
	}
	if text == "" {
		if p.composing != "" {
			p.cancelPending = true
		}
		p.composing = ""
		return
	}
	if p.composing == "" {
		// The clock runs while the first phrase is composed.
		p.session.MarkStart(time.Now())
	}
	p.composing, p.composeCaret = text, caret
	p.lastInput = time.Now()
}

// settleComposition rolls a provisional start back when the composition
// that started it committed nothing.
func (p *practice) settleComposition() {
	if p.cancelPending {
		p.cancelPending = false
		p.session.CancelStart()
	}
}

// startServerRun opens the server's record of the run, which the
// submission refers to.
func (a *App) startServerRun(p *practice) {
	if a.userID() == "" {
		return
	}
	r := &serverRun{done: make(chan struct{})}
	p.serverRun = r
	id := p.id
	a.run(func(ctx context.Context) func() {
		sid, err := a.store.StartPractice(ctx, id)
		if err != nil {
			log.Printf("start practice: %v", err)
		}
		r.id = sid
		close(r.done)
		return nil
	})
}

// complete shows the results of the run and records it.
func (a *App) complete(p *practice, now time.Time) {
	st := p.session.Stats()
	res := &result{stats: st, completedAt: now}
	if a.userID() != "" {
		b := p.best
		res.newRecord = b == nil || float64(st.Accuracy) > b.Accuracy || (float64(st.Accuracy) == b.Accuracy && st.CPM > b.CPM)
	}
	p.result = res
	p.composing = ""
	a.submit(p, res)
}

// submit records the run on the server, then refreshes what it changes.
func (a *App) submit(p *practice, res *result) {
	user := a.userID()
	if user == "" {
		return
	}
	if p.serverRun == nil {
		a.toast("error", a.t("practice.sync_failed"))
		return
	}
	run, lesson, st, trace, v := p.serverRun, p.lesson, res.stats, append([]int64(nil), p.session.Trace...), p.version
	a.run(func(ctx context.Context) func() {
		select {
		case <-run.done:
		case <-ctx.Done():
		}
		if run.id == "" {
			return func() { a.toast("error", a.t("practice.sync_failed")) }
		}
		cheat, err := a.store.SubmitPractice(ctx, data.Submission{
			SessionID:           run.id,
			LessonID:            lesson.ID,
			Language:            lesson.Language,
			CollectionID:        lesson.CollectionID,
			CPM:                 st.CPM,
			WPM:                 st.WPM,
			Accuracy:            st.Accuracy,
			Duration:            st.Duration,
			TotalChars:          st.Total,
			CorrectChars:        st.Correct,
			ErrorChars:          st.Incorrect,
			EffectiveKeystrokes: st.EffectiveKeystrokes,
			Trace:               trace,
		})
		if err != nil {
			return func() {
				log.Printf("submit practice: %v", err)
				a.toast("error", a.t("practice.sync_failed"))
			}
		}
		// The run changed the leaderboard and the recent runs: fetch both.
		a.loadLeaderboard(p)
		recent, rerr := a.store.RecentLogs(ctx, user, lesson.ID, 10)
		if rerr != nil {
			log.Printf("load recent runs: %v", rerr)
		}
		return func() {
			if cheat != "" {
				log.Printf("practice run not counted: %s", cheat)
				a.toast("warning", a.t("practice.not_counted"))
			}
			if p.version == v && p.result == res {
				res.recent = recent
			}
		}
	})
}
