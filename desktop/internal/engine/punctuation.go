package engine

// Lenient punctuation matching, as src/utils/punctuationMatch.ts: input
// methods make the exact form hard to control (full or half width, smart
// quotes alternating), so any variant within a class counts. 、 stays
// unmapped, keeping the comma and the enumeration comma apart.
var equivalenceClasses = [][]rune{
	{'，', ','},
	{'。', '.'},
	{'；', ';'},
	{'：', ':'},
	{'？', '?'},
	{'！', '!'},
	{'（', '('},
	{'）', ')'},
	{'【', '['},
	{'】', ']'},
	{'｛', '{'},
	{'｝', '}'},
	{'《', '<'},
	{'》', '>'},
	{'～', '~'},
	{'　', ' '},
	// Quotes match across left and right too: one key types both halves.
	{'“', '”', '"'},
	{'‘', '’', '\''},
}

var classOf = func() map[rune]int {
	m := map[rune]int{}
	for i, class := range equivalenceClasses {
		for _, r := range class {
			m[r] = i
		}
	}
	return m
}()

// Matches reports whether typing typed counts as the expected character.
func Matches(typed, want rune) bool {
	if typed == want {
		return true
	}
	a, ok := classOf[typed]
	if !ok {
		return false
	}
	b, ok := classOf[want]
	return ok && a == b
}

// autoPairs are the full-width pairs an auto-pairing input method commits
// at once for one key. Half-width pairs are typed as separate keys, so
// listing them could only swallow a real keypress.
var autoPairs = map[[2]rune]bool{
	{'“', '”'}: true, {'‘', '’'}: true,
	{'（', '）'}: true, {'《', '》'}: true, {'〈', '〉'}: true, {'【', '】'}: true, {'〔', '〕'}: true,
	{'「', '」'}: true, {'『', '』'}: true, {'｛', '｝'}: true,
}

// ResolveInput decides which committed characters to consume against the
// expected ones that follow the cursor. Where an auto-paired pair does not
// fit the text, it keeps the half that belongs at the cursor and drops the
// other, rather than failing the next character.
func ResolveInput(typed []rune, expected []rune) []rune {
	want := func(i int) (rune, bool) {
		if i < len(expected) {
			return expected[i], true
		}
		return 0, false
	}
	fits := func(r rune, i int) bool {
		w, ok := want(i)
		return ok && Matches(r, w)
	}

	resolved := make([]rune, 0, len(typed))
	e := 0
	for i := 0; i < len(typed); i++ {
		if i+1 >= len(typed) || !autoPairs[[2]rune{typed[i], typed[i+1]}] {
			resolved = append(resolved, typed[i])
			e++
			continue
		}
		opening, closing := typed[i], typed[i+1]
		switch {
		case fits(opening, e) && fits(closing, e+1):
			// The text has the pair itself, as empty quotes.
			resolved = append(resolved, opening, closing)
			e += 2
		case fits(opening, e):
			resolved = append(resolved, opening)
			e++
		case fits(closing, e):
			resolved = append(resolved, closing)
			e++
		default:
			// Neither half belongs here: both count, so accuracy stays honest.
			resolved = append(resolved, opening, closing)
			e += 2
		}
		i++ // the pair took two characters
	}
	return resolved
}
