package data

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/hyacinthus/lesson-typing/desktop/internal/supa"
)

func lessons() []LessonSummary {
	return []LessonSummary{
		{ID: "a", Language: "english", CollectionID: "grade-1"},
		{ID: "b", Language: "english", CollectionID: "grade-1"},
		{ID: "c", Language: "english", CollectionID: "grade-2"},
		{ID: "d", Language: "chinese", CollectionID: "grade-1"},
	}
}

func TestPickRandom(t *testing.T) {
	for range 20 {
		if l := PickRandom(lessons(), "english", "grade-1", "a"); l == nil || l.ID != "b" {
			t.Fatalf("preferred collection: %v", l)
		}
		if l := PickRandom(lessons(), "english", "grade-2", "c"); l == nil || (l.ID != "a" && l.ID != "b") {
			t.Fatalf("fallback to the language: %v", l)
		}
	}
	seen := map[string]bool{}
	for range 100 {
		seen[PickRandom(lessons(), "english", "", "").ID] = true
	}
	if len(seen) != 3 {
		t.Fatalf("picked %v", seen)
	}
	if PickRandom(lessons(), "french", "", "") != nil || PickRandom(lessons(), "chinese", "", "d") != nil {
		t.Fatal("picked from nothing")
	}
}

func TestLessonsAreCachedAndTitlesBatched(t *testing.T) {
	var lessonQueries atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		q := r.URL.Query()
		switch {
		case r.URL.Path == "/rest/v1/lt_lessons" && q.Get("language") == "eq.chinese":
			lessonQueries.Add(1)
			_ = json.NewEncoder(w).Encode([]map[string]any{{"id": "x", "title": "静夜思", "language": "chinese", "collection_id": "grade-1", "sort_order": 1, "character_count": 24}})
		case r.URL.Path == "/rest/v1/lt_lessons" && q.Get("id") != "":
			if q.Get("id") != `in.("x","y")` {
				t.Errorf("titles query %s", q.Get("id"))
			}
			_ = json.NewEncoder(w).Encode([]map[string]any{{"id": "x", "title": "静夜思"}})
		case r.URL.Path == "/rest/v1/lt_practice_logs":
			_ = json.NewEncoder(w).Encode([]map[string]any{
				{"id": "1", "lesson_id": "x", "cpm": 120, "wpm": 40, "accuracy": 98.5, "duration": 30, "created_at": "2026-10-09T08:00:00.123456+00:00"},
				{"id": "2", "lesson_id": "y", "cpm": 100, "wpm": 30, "accuracy": 100, "duration": 40, "created_at": "2026-10-09T07:00:00+00:00"},
			})
		default:
			t.Errorf("unexpected %s?%s", r.URL.Path, r.URL.RawQuery)
		}
	}))
	defer srv.Close()

	s := New(supa.New(srv.URL, "anon", nil))
	ctx := context.Background()
	for range 3 {
		ls, err := s.Lessons(ctx, "chinese")
		if err != nil || len(ls) != 1 || ls[0].Title != "静夜思" || ls[0].CollectionID != "grade-1" {
			t.Fatalf("lessons %+v, %v", ls, err)
		}
	}
	if n := lessonQueries.Load(); n != 1 {
		t.Fatalf("%d queries for cached lessons", n)
	}

	logs, err := s.RecentLogs(ctx, "user-1", "", 20)
	if err != nil || len(logs) != 2 {
		t.Fatalf("logs %+v, %v", logs, err)
	}
	if logs[0].LessonTitle != "静夜思" || logs[1].LessonTitle != "" || FormatAccuracy(logs[0].Accuracy) != "98.5" || FormatAccuracy(logs[1].Accuracy) != "100" {
		t.Fatalf("logs %+v", logs)
	}
	if logs[0].CompletedAt.IsZero() {
		t.Fatal("timestamp not parsed")
	}
}
