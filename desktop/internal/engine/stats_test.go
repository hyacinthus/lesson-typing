package engine

import (
	"slices"
	"testing"
)

func TestGradeOf(t *testing.T) {
	cases := []struct {
		accuracy, cpm int
		want          Grade
	}{
		{95, 200, GradeS}, {96, 210, GradeS}, {100, 300, GradeS},
		{94, 200, GradeA}, {95, 199, GradeA}, {90, 150, GradeA}, {91, 160, GradeA},
		{89, 150, GradeB}, {90, 149, GradeB}, {80, 100, GradeB}, {81, 110, GradeB},
		{79, 100, GradeC}, {80, 99, GradeC}, {70, 0, GradeC}, {75, 50, GradeC},
		{69, 300, GradeD}, {0, 0, GradeD},
	}
	for _, c := range cases {
		if got := GradeOf(c.accuracy, c.cpm); got != c.want {
			t.Errorf("GradeOf(%d, %d) = %s, want %s", c.accuracy, c.cpm, got, c.want)
		}
	}
}

// typedSession returns the stats of typed typed over text in elapsedMs.
func typedStats(text, typed string, elapsedMs int64) Stats {
	s := NewSession(text)
	want, got := []rune(text), []rune(typed)
	for i, r := range got {
		s.Chars[i].Typed, s.Chars[i].Status = r, Incorrect
		if r == want[i] {
			s.Chars[i].Status = Correct
		}
	}
	return calculate(s.Chars, len(got), elapsedMs, s.script)
}

func TestCalculate(t *testing.T) {
	st := typedStats("hello world", "hello world", 60000)
	if st.CPM != 11 || st.WPM != 2 || st.Accuracy != 100 || st.Duration != 60 || st.Correct != 11 {
		t.Errorf("English: %+v", st)
	}
	st = typedStats("abcd", "abXd", 60000)
	if st.Correct != 3 || st.Incorrect != 1 || st.Accuracy != 75 {
		t.Errorf("mistakes: %+v", st)
	}
	st = typedStats("abc", "a", 0)
	if st.CPM != 0 || st.WPM != 0 {
		t.Errorf("zero time: %+v", st)
	}
}

func TestChineseKeystrokes(t *testing.T) {
	// 你 = ni (2), 好 = hao (3)
	st := typedStats("你好", "你好", 60000)
	if st.EffectiveKeystrokes != 5 || st.CPM != 5 || st.WPM != 2 {
		t.Errorf("你好: %+v", st)
	}
	if st := typedStats("你好", "你", 60000); st.EffectiveKeystrokes != 2 {
		t.Errorf("你: %+v", st)
	}
	// Punctuation and Latin letters in a Chinese lesson cost one key.
	if st := typedStats("你，a", "你，a", 60000); st.EffectiveKeystrokes != 4 {
		t.Errorf("你，a: %+v", st)
	}
}

func TestJapaneseKeystrokes(t *testing.T) {
	// き (2) ゃ (3) カ (2, as か) ー (1) 漢 (3, the kanji default) 。 (1)
	st := typedStats("きゃカー漢。", "きゃカー漢。", 60000)
	if st.EffectiveKeystrokes != 12 {
		t.Errorf("keystrokes %d", st.EffectiveKeystrokes)
	}
	// WPM counts correct kana and kanji, not punctuation.
	if st.WPM != 5 {
		t.Errorf("WPM %d", st.WPM)
	}
}

func TestFormatDuration(t *testing.T) {
	for secs, want := range map[int]string{0: "0:00", 9: "0:09", 75: "1:15", 600: "10:00"} {
		if got := FormatDuration(secs); got != want {
			t.Errorf("FormatDuration(%d) = %s", secs, got)
		}
	}
}

func TestMatches(t *testing.T) {
	for _, p := range [][2]rune{
		{'a', 'a'}, {'你', '你'}, {'，', '，'},
		{',', '，'}, {'，', ','}, {'.', '。'}, {'?', '？'}, {'!', '！'}, {':', '：'},
		{';', '；'}, {'(', '（'}, {')', '）'}, {'[', '【'}, {']', '】'}, {'<', '《'}, {'>', '》'},
		{'"', '“'}, {'"', '”'}, {'“', '”'}, {'\'', '‘'}, {'’', '‘'},
	} {
		if !Matches(p[0], p[1]) {
			t.Errorf("%c does not match %c", p[0], p[1])
		}
	}
	for _, p := range [][2]rune{
		{'，', '。'}, {',', '.'}, {'、', ','}, {'(', '）'}, {')', '（'}, {'“', '\''}, {'a', 'b'}, {'你', '好'},
	} {
		if Matches(p[0], p[1]) {
			t.Errorf("%c matches %c", p[0], p[1])
		}
	}
}

func TestResolveInput(t *testing.T) {
	cases := []struct {
		typed    string
		expected string
		want     string
	}{
		{"你好", "你好", "你好"},
		{"你", "你", "你"},
		{"，", "，", "，"},
		// Only the opening half at an opening position.
		{"“”", "“你", "“"},
		{"“”", "\"你", "“"},
		{"（）", "（话", "（"},
		// Half-width pairs are never auto-paired.
		{"()", "（话", "()"},
		{"\"\"", "\"a", "\"\""},
		// Only the closing half at a closing position.
		{"（）", "）。", "）"},
		{"【】", "】", "】"},
		// The text has the pair.
		{"“”", "“”", "“”"},
		// Nothing matches: both halves count.
		{"“”", "你好", "“”"},
		{"）（", "）。", "）（"},
		// A pair inside a longer commit, at its own offset.
		{"你好“”", "你好“就", "你好“"},
		{"说完”", "说完”", "说完”"},
		{"他说（）", "他说（这", "他说（"},
		{"“”后面", "“后面", "“后面"},
		{"他说“”", "他说”", "他说“"},
		// At the end of the lesson, with one character left: the halves
		// of curly quotes match each other, so the opening one stays.
		{"“”", "“", "“"},
		{"“”", "”", "“"},
		{"（）", "）", "）"},
	}
	for _, c := range cases {
		got := ResolveInput([]rune(c.typed), []rune(c.expected))
		if !slices.Equal(got, []rune(c.want)) {
			t.Errorf("ResolveInput(%q, %q) = %q, want %q", c.typed, c.expected, string(got), c.want)
		}
	}
}

// The table must cover the ranges of IsHan, which the generator writes:
// scripts/generate-pinyin-weights.cjs declares them again.
func TestPinyinTableCoversHanRanges(t *testing.T) {
	n := 0
	for _, rg := range hanRanges {
		n += int(rg[1]-rg[0]) + 1
	}
	if len(pinyinWeights) != n {
		t.Fatalf("pinyin_weights.bin has %d entries for %d ideographs: run go generate ./internal/engine", len(pinyinWeights), n)
	}
	if pinyinWeight('你') != 2 || pinyinWeight('好') != 3 || pinyinWeight('庄') != 6 {
		t.Fatal("pinyin weights out of place")
	}
}
