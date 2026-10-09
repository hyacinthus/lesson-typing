package engine

import (
	"slices"
	"testing"
	"time"
)

var t0 = time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

func at(ms int64) time.Time { return t0.Add(time.Duration(ms) * time.Millisecond) }

func TestPristineSession(t *testing.T) {
	s := NewSession("ab")
	if s.Started() || s.Seconds(at(5000)) != 0 {
		t.Fatal("the clock runs before any input")
	}
	if s.Chars[0].Status != Current || s.Chars[1].Status != Pending {
		t.Fatalf("statuses %v", s.Chars)
	}
}

func TestInputMarksAndAdvances(t *testing.T) {
	s := NewSession("abc")
	s.Input("a", at(0))
	s.Input("x", at(0))
	if s.Chars[0].Status != Correct || s.Chars[1].Status != Incorrect || s.Chars[1].Typed != 'x' || s.Chars[2].Status != Current {
		t.Fatalf("chars %+v", s.Chars)
	}
	st := s.Stats()
	if s.Index != 2 || st.Total != 2 || st.Correct != 1 || st.Incorrect != 1 || st.Accuracy != 50 {
		t.Fatalf("index %d, stats %+v", s.Index, st)
	}
}

func TestTraceAndClock(t *testing.T) {
	s := NewSession("abcd")
	s.Input("a", at(0))
	if !s.Start.Equal(at(0)) {
		t.Fatalf("start %v", s.Start)
	}
	s.Input("bc", at(1000))
	if !slices.Equal(s.Trace, []int64{0, 1000, 1000}) {
		t.Fatalf("trace %v", s.Trace)
	}
}

func TestIMECommitOfSeveralCharacters(t *testing.T) {
	s := NewSession("你好，世界")
	s.Input("你好", at(0))
	if s.Index != 2 {
		t.Fatalf("index %d", s.Index)
	}
	res := s.Input("，世界", at(10))
	if !res.Completed || !s.Done || s.Stats().Accuracy != 100 {
		t.Fatalf("result %+v, stats %+v", res, s.Stats())
	}
}

func TestDelete(t *testing.T) {
	s := NewSession("abc")
	s.Input("a", at(0))
	s.Input("b", at(0))
	s.Delete(at(0))
	if s.Index != 1 || s.Chars[1].Status != Current || s.Chars[1].Typed != 0 || s.Chars[2].Status != Pending {
		t.Fatalf("index %d, chars %+v", s.Index, s.Chars)
	}
	if len(s.Trace) != 2 {
		t.Fatalf("deleting removed trace entries: %v", s.Trace)
	}
}

func TestIgnoredEdits(t *testing.T) {
	s := NewSession("a")
	s.Delete(at(0))
	if s.Index != 0 {
		t.Fatal("deleted at the start")
	}
	s.Input("a", at(0))
	s.Input("b", at(0))
	s.Delete(at(0))
	if s.Index != 1 || !s.Done {
		t.Fatalf("edited after completion: index %d", s.Index)
	}
}

func TestFirstCommitOnce(t *testing.T) {
	s := NewSession("ab")
	s.MarkStart(at(0))
	if r := s.Input("a", at(0)); !r.FirstCommit {
		t.Fatal("no first commit")
	}
	if r := s.Input("b", at(0)); r.FirstCommit {
		t.Fatal("second first commit")
	}
}

func TestCompletionStats(t *testing.T) {
	s := NewSession("ab")
	s.Input("a", at(0))
	res := s.Input("b", at(30000))
	st := s.Stats()
	if !res.Completed || st.Total != 2 || st.Correct != 2 || st.Accuracy != 100 || st.Duration != 30 || st.CPM != 4 {
		t.Fatalf("result %+v, stats %+v", res, st)
	}
	if !slices.Equal(s.Trace, []int64{0, 30000}) {
		t.Fatalf("trace %v", s.Trace)
	}
	if s.Seconds(at(90000)) != 30 {
		t.Fatal("the clock runs after completion")
	}
}

func TestProvisionalStart(t *testing.T) {
	t.Run("ticks from the composition start", func(t *testing.T) {
		s := NewSession("你好")
		s.MarkStart(at(0))
		if !s.Start.Equal(at(0)) || s.Seconds(at(2000)) != 2 {
			t.Fatalf("start %v, seconds %d", s.Start, s.Seconds(at(2000)))
		}
	})
	t.Run("rolls back when the first composition is cancelled", func(t *testing.T) {
		s := NewSession("你好")
		s.MarkStart(at(0))
		s.CancelStart()
		if s.Started() || s.Seconds(at(2000)) != 0 {
			t.Fatal("still started")
		}
	})
	t.Run("backdates the first commit", func(t *testing.T) {
		s := NewSession("你好")
		s.MarkStart(at(0))
		s.Input("你好", at(1500))
		if !slices.Equal(s.Trace, []int64{1500, 1500}) || s.Stats().Duration != 2 {
			t.Fatalf("trace %v, stats %+v", s.Trace, s.Stats())
		}
	})
	t.Run("keeps the clock when cancelled mid-run", func(t *testing.T) {
		s := NewSession("你好呀")
		s.Input("你", at(0))
		s.MarkStart(at(500))
		s.CancelStart()
		if !s.Start.Equal(at(0)) {
			t.Fatalf("start %v", s.Start)
		}
	})
	t.Run("keeps the clock after deleting back to the start", func(t *testing.T) {
		s := NewSession("你好")
		s.Input("你", at(0))
		s.Delete(at(100))
		s.MarkStart(at(200))
		s.CancelStart()
		if !s.Started() {
			t.Fatal("rolled back a run that committed")
		}
	})
}

func TestStatsFollowEdits(t *testing.T) {
	s := NewSession("abc")
	s.Input("a", at(0))
	s.Input("x", at(60000))
	if st := s.Stats(); st.Correct != 1 || st.Incorrect != 1 {
		t.Fatalf("stats %+v", st)
	}
	edits := s.Edits
	s.Delete(at(60000))
	if st := s.Stats(); st.Total != 1 || st.Incorrect != 0 || s.Edits == edits {
		t.Fatalf("stale stats after delete: %+v", st)
	}
}

func TestReset(t *testing.T) {
	s := NewSession("a")
	s.Input("a", at(0))
	s.Reset()
	if s.Started() || s.Done || s.Chars[0].Status != Current {
		t.Fatalf("not pristine: %+v", s)
	}
	if r := s.Input("a", at(0)); !r.FirstCommit || !r.Completed {
		t.Fatalf("result %+v", r)
	}
}

func TestAutoPairedCommit(t *testing.T) {
	s := NewSession("“你”")
	s.Input("“”", at(0))
	if s.Index != 1 || s.Chars[0].Status != Correct {
		t.Fatalf("index %d, chars %+v", s.Index, s.Chars)
	}
}
