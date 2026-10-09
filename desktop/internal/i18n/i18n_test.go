package i18n

import (
	"slices"
	"testing"
)

func TestEveryLanguageHasTheKeysOfEnglish(t *testing.T) {
	want := Keys(Fallback)
	slices.Sort(want)
	for _, l := range Languages {
		got := Keys(l.Code)
		slices.Sort(got)
		if !slices.Equal(got, want) {
			t.Errorf("%s keys differ from English:\n missing %v\n extra %v", l.Code, diff(want, got), diff(got, want))
		}
	}
}

func diff(a, b []string) []string {
	var out []string
	for _, k := range a {
		if !slices.Contains(b, k) {
			out = append(out, k)
		}
	}
	return out
}

func TestFind(t *testing.T) {
	for code, want := range map[string]string{"zh-Hans-CN": "zh", "en_US": "en", "JA": "ja", "pt-BR": "pt"} {
		if l, ok := Find(code); !ok || l.Code != want {
			t.Errorf("Find(%q) = %v, %v", code, l, ok)
		}
	}
	if _, ok := Find("xx"); ok {
		t.Error("found an unknown language")
	}
}

func TestT(t *testing.T) {
	if got := For("zh-CN").T("start"); got != "开始练习" {
		t.Errorf("zh start = %q", got)
	}
	if got := For("xx").T("start"); got != "Start Practice" {
		t.Errorf("fallback = %q", got)
	}
	if got := For("en").T("no.such.key"); got != "no.such.key" {
		t.Errorf("missing = %q", got)
	}
}

func TestLanguagesFollowTheWebsMeta(t *testing.T) {
	var codes []string
	for _, l := range Languages {
		codes = append(codes, l.Code)
	}
	if !slices.Equal(codes, []string{"en", "zh", "es", "ja", "pt", "fr", "de", "it", "ko"}) {
		t.Fatalf("languages %v", codes)
	}
	if l, _ := Find("zh"); l.Label != "中文" || l.Lessons != "chinese" {
		t.Fatalf("zh %+v", l)
	}
	// Texts of both sources.
	if For("ja").T("menu.practice") != "練習" || For("ja").T("start") == "start" {
		t.Fatal("a source is missing")
	}
}
