// Package data reads and writes the app's records in Supabase: lessons and
// collections, practice runs, leaderboards and profiles, as the web app's
// src/utils/lessonLoader.ts and stores do.
package data

import (
	"context"
	"fmt"
	"math/rand/v2"
	"strconv"
	"sync"
	"time"

	"github.com/hyacinthus/lesson-typing/desktop/internal/supa"
)

// LessonSummary is a lesson without its text.
type LessonSummary struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	CollectionID string `json:"collection_id"`
	Language     string `json:"language"`
}

// Lesson is a lesson with its text.
type Lesson struct {
	LessonSummary
	Content string `json:"content"`
}

// Collection groups the lessons of a language, as a school grade.
type Collection struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Store reads and writes records, caching what does not change while the
// app runs: lessons and collections.
type Store struct {
	c *supa.Client

	mu          sync.Mutex
	summaries   map[string]*flight[[]LessonSummary]
	collections map[string]*flight[[]Collection]
	lessons     map[string]*flight[*Lesson]
	titles      map[string]string
}

// New returns a store on c.
func New(c *supa.Client) *Store {
	return &Store{
		c:           c,
		summaries:   map[string]*flight[[]LessonSummary]{},
		collections: map[string]*flight[[]Collection]{},
		lessons:     map[string]*flight[*Lesson]{},
		titles:      map[string]string{},
	}
}

// Client returns the Supabase client of the store.
func (s *Store) Client() *supa.Client { return s.c }

// flight is a load that callers share, kept once it succeeds.
type flight[T any] struct {
	done chan struct{}
	val  T
	err  error
}

// cached returns what load returns for key, loading it once for
// concurrent callers, and again after a failure.
func cached[T any](s *Store, m map[string]*flight[T], key string, ctx context.Context, load func(context.Context) (T, error)) (T, error) {
	s.mu.Lock()
	f, ok := m[key]
	if !ok {
		f = &flight[T]{done: make(chan struct{})}
		m[key] = f
		s.mu.Unlock()
		f.val, f.err = load(ctx)
		if f.err != nil {
			s.mu.Lock()
			delete(m, key)
			s.mu.Unlock()
		}
		close(f.done)
		return f.val, f.err
	}
	s.mu.Unlock()
	select {
	case <-f.done:
		return f.val, f.err
	case <-ctx.Done():
		var zero T
		return zero, ctx.Err()
	}
}

const summaryColumns = "id,title,collection_id,language"

// Lessons returns the summaries of a language's lessons, as "chinese", in
// the order of their collections.
func (s *Store) Lessons(ctx context.Context, language string) ([]LessonSummary, error) {
	return cached(s, s.summaries, language, ctx, func(ctx context.Context) ([]LessonSummary, error) {
		var rows []LessonSummary
		err := s.c.SelectPublic(ctx, "lt_lessons", supa.Query{
			"select":   {summaryColumns},
			"language": {"eq." + language},
			"order":    {"collection_id,sort_order"},
		}, &rows)
		if err != nil {
			return nil, fmt.Errorf("load lessons of %s: %w", language, err)
		}
		return rows, nil
	})
}

// Collections returns a language's collections in their order.
func (s *Store) Collections(ctx context.Context, language string) ([]Collection, error) {
	return cached(s, s.collections, language, ctx, func(ctx context.Context) ([]Collection, error) {
		var rows []Collection
		err := s.c.SelectPublic(ctx, "lt_collections", supa.Query{
			"select":   {"id,name"},
			"language": {"eq." + language},
			"order":    {"sort_order"},
		}, &rows)
		if err != nil {
			return nil, fmt.Errorf("load collections of %s: %w", language, err)
		}
		return rows, nil
	})
}

// Lesson returns a lesson with its text, nil when there is none.
func (s *Store) Lesson(ctx context.Context, id string) (*Lesson, error) {
	return cached(s, s.lessons, id, ctx, func(ctx context.Context) (*Lesson, error) {
		var rows []Lesson
		err := s.c.SelectPublic(ctx, "lt_lessons", supa.Query{
			"select": {summaryColumns + ",content"},
			"id":     {"eq." + id},
		}, &rows)
		if err != nil {
			return nil, fmt.Errorf("load lesson %s: %w", id, err)
		}
		if len(rows) == 0 {
			return nil, nil
		}
		return &rows[0], nil
	})
}

// PickRandom picks a lesson of language at random, preferring those of
// collection, never exclude; nil when there is none.
func PickRandom(lessons []LessonSummary, language, collection, exclude string) *LessonSummary {
	var all, same []*LessonSummary
	for i := range lessons {
		l := &lessons[i]
		if l.Language != language || l.ID == exclude {
			continue
		}
		all = append(all, l)
		if collection != "" && l.CollectionID == collection {
			same = append(same, l)
		}
	}
	pool := all
	if len(same) > 0 {
		pool = same
	}
	if len(pool) == 0 {
		return nil
	}
	return pool[rand.IntN(len(pool))]
}

// PracticeLog is a practice run kept on the server.
type PracticeLog struct {
	LessonID    string    `json:"lesson_id"`
	LessonTitle string    `json:"-"`
	Duration    int       `json:"duration"`
	CPM         int       `json:"cpm"`
	WPM         int       `json:"wpm"`
	Accuracy    float64   `json:"accuracy"`
	CompletedAt time.Time `json:"created_at"`
}

// FormatAccuracy formats an accuracy as the web shows it: 98.5, 100.
func FormatAccuracy(a float64) string {
	return strconv.FormatFloat(a, 'f', -1, 64)
}

const logColumns = "lesson_id,duration,cpm,wpm,accuracy,created_at"

// BestLog returns the user's best valid run of a lesson: the most accurate,
// then the fastest; nil when there is none.
func (s *Store) BestLog(ctx context.Context, userID, lessonID string) (*PracticeLog, error) {
	var rows []PracticeLog
	err := s.c.Select(ctx, "lt_practice_logs", supa.Query{
		"select":    {logColumns},
		"user_id":   {"eq." + userID},
		"lesson_id": {"eq." + lessonID},
		// Runs the server flagged never count as a record.
		"is_valid": {"eq.true"},
		"order":    {"accuracy.desc,cpm.desc"},
		"limit":    {"1"},
	}, &rows)
	if err != nil || len(rows) == 0 {
		return nil, err
	}
	return &rows[0], nil
}

// RecentLogs returns the user's latest runs, newest first, of one lesson
// or, with lessonID "", of all, with their lessons' titles.
func (s *Store) RecentLogs(ctx context.Context, userID, lessonID string, limit int) ([]PracticeLog, error) {
	q := supa.Query{
		"select":  {logColumns},
		"user_id": {"eq." + userID},
		"order":   {"created_at.desc"},
		"limit":   {strconv.Itoa(limit)},
	}
	if lessonID != "" {
		q.Set("lesson_id", "eq."+lessonID)
	}
	var rows []PracticeLog
	if err := s.c.Select(ctx, "lt_practice_logs", q, &rows); err != nil {
		return nil, err
	}
	if lessonID == "" {
		ids := make([]string, 0, len(rows))
		for _, r := range rows {
			ids = append(ids, r.LessonID)
		}
		titles := s.LessonTitles(ctx, ids)
		for i := range rows {
			rows[i].LessonTitle = titles[rows[i].LessonID]
		}
	}
	return rows, nil
}

// LessonTitles returns the titles of lessons with one query for those not
// known yet. Lessons it cannot find are left out.
func (s *Store) LessonTitles(ctx context.Context, ids []string) map[string]string {
	titles := map[string]string{}
	var missing []string
	s.mu.Lock()
	seen := map[string]bool{}
	for _, id := range ids {
		if seen[id] {
			continue
		}
		seen[id] = true
		if t, ok := s.titles[id]; ok {
			titles[id] = t
		} else {
			missing = append(missing, id)
		}
	}
	s.mu.Unlock()
	if len(missing) == 0 {
		return titles
	}
	var rows []struct{ ID, Title string }
	if err := s.c.SelectPublic(ctx, "lt_lessons", supa.Query{"select": {"id,title"}, "id": {supa.In(missing)}}, &rows); err != nil {
		return titles
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, r := range rows {
		s.titles[r.ID] = r.Title
		titles[r.ID] = r.Title
	}
	for _, id := range missing {
		if _, ok := s.titles[id]; !ok {
			s.titles[id] = "" // deleted: not asked for again
		}
	}
	return titles
}

// LeaderboardEntry is a player's best on a lesson.
type LeaderboardEntry struct {
	Rank          int     `json:"rank"`
	Nickname      *string `json:"nickname"`
	BestCPM       int     `json:"best_cpm"`
	BestWPM       int     `json:"best_wpm"`
	IsCurrentUser bool    `json:"is_current_user"`
}

// LeaderboardSize is how many of the best a leaderboard shows.
const LeaderboardSize = 10

// Leaderboard returns the best players of a lesson and, when the signed-in
// user ranks below them, the user's own entry.
func (s *Store) Leaderboard(ctx context.Context, lessonID string) (top []LeaderboardEntry, me *LeaderboardEntry, err error) {
	var rows []LeaderboardEntry
	err = s.c.RPC(ctx, "lt_lesson_leaderboard", map[string]any{"p_lesson_id": lessonID, "p_limit": LeaderboardSize}, &rows)
	if err != nil {
		return nil, nil, err
	}
	for i := range rows {
		switch {
		case rows[i].Rank <= LeaderboardSize:
			top = append(top, rows[i])
		case rows[i].IsCurrentUser:
			me = &rows[i]
		}
	}
	return top, me, nil
}

// StartPractice opens a run on the server, which submit-practice checks
// against, and returns its ID.
func (s *Store) StartPractice(ctx context.Context, lessonID string) (string, error) {
	var resp struct {
		SessionID string `json:"sessionId"`
	}
	if err := s.c.Invoke(ctx, "start-practice", map[string]string{"lessonId": lessonID}, &resp); err != nil {
		return "", err
	}
	return resp.SessionID, nil
}

// Submission is a completed run, as submit-practice takes it.
type Submission struct {
	SessionID           string  `json:"sessionId"`
	LessonID            string  `json:"lessonId"`
	Language            string  `json:"language"`
	CollectionID        string  `json:"collectionId"`
	CPM                 int     `json:"cpm"`
	WPM                 int     `json:"wpm"`
	Accuracy            int     `json:"accuracy"`
	Duration            int     `json:"duration"`
	TotalChars          int     `json:"totalChars"`
	CorrectChars        int     `json:"correctChars"`
	ErrorChars          int     `json:"errorChars"`
	EffectiveKeystrokes int     `json:"effectiveKeystrokes"`
	Trace               []int64 `json:"trace"`
}

// SubmitPractice records a run. The server keeps runs it finds implausible
// out of records and leaderboards and says why, in cheatReason.
func (s *Store) SubmitPractice(ctx context.Context, sub Submission) (cheatReason string, err error) {
	if sub.Trace == nil {
		sub.Trace = []int64{}
	}
	var resp struct {
		CheatReason string `json:"cheatReason"`
	}
	if err := s.c.Invoke(ctx, "submit-practice", sub, &resp); err != nil {
		return "", err
	}
	return resp.CheatReason, nil
}

// Profile is what a user shows of themselves.
type Profile struct {
	Nickname  *string `json:"nickname"`
	AvatarURL *string `json:"avatar_url"`
}

// Profile returns the user's profile, nil when there is none.
func (s *Store) Profile(ctx context.Context, userID string) (*Profile, error) {
	var rows []Profile
	err := s.c.Select(ctx, "lt_profiles", supa.Query{"select": {"nickname,avatar_url"}, "id": {"eq." + userID}}, &rows)
	if err != nil || len(rows) == 0 {
		return nil, err
	}
	return &rows[0], nil
}

// SaveProfile writes the user's nickname and avatar, in the profile and in
// the user's metadata, as the web does.
func (s *Store) SaveProfile(ctx context.Context, userID, nickname, avatarURL string) error {
	err := s.c.Upsert(ctx, "lt_profiles", map[string]any{
		"id":         userID,
		"nickname":   nickname,
		"avatar_url": avatarURL,
		"updated_at": time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		return err
	}
	return s.c.UpdateUser(ctx, map[string]any{"full_name": nickname, "avatar_url": avatarURL})
}

// UploadAvatar stores a JPEG as the user's avatar and returns its URL.
func (s *Store) UploadAvatar(ctx context.Context, userID string, jpeg []byte) (string, error) {
	return s.c.Upload(ctx, "avatars", fmt.Sprintf("%s/%d.jpg", userID, time.Now().UnixMilli()), "image/jpeg", jpeg)
}
