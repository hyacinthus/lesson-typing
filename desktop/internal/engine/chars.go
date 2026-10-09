package engine

import _ "embed"

// Keystroke weights estimate how many keys a character costs through an
// input method, for CPM: the pinyin length of a Chinese character, the
// romaji length of a kana. They mirror src/utils/statsCalculator.ts and
// src/utils/japaneseRomaji.ts, which the server's CPM check was tuned on.

//go:generate node ../../../scripts/generate-pinyin-weights.cjs

// pinyinWeights holds the pinyin length of each code point of hanRanges, in
// order, as pinyin-pro gives it (see scripts/generate-pinyin-weights.cjs).
//
//go:embed pinyin_weights.bin
var pinyinWeights []byte

// hanRanges are the CJK ideographs, as isHanCharacter matches them.
var hanRanges = [...][2]rune{
	{0x3400, 0x4dbf},
	{0x4e00, 0x9fff},
	{0xf900, 0xfaff},
}

// IsHan reports whether r is a CJK ideograph (a Chinese character or a
// Japanese kanji).
func IsHan(r rune) bool {
	for _, rg := range hanRanges {
		if r >= rg[0] && r <= rg[1] {
			return true
		}
	}
	return false
}

// pinyinWeight returns the pinyin length of a Han character.
func pinyinWeight(r rune) int {
	offset := 0
	for _, rg := range hanRanges {
		if r >= rg[0] && r <= rg[1] {
			return int(pinyinWeights[offset+int(r-rg[0])])
		}
		offset += int(rg[1]-rg[0]) + 1
	}
	return 1
}

// IsKana reports whether r is hiragana or katakana.
func IsKana(r rune) bool {
	return r >= 0x3040 && r <= 0x30ff
}

// defaultKanjiRomaji is the romaji length assumed for a kanji: most common
// readings take 2 to 4 keys.
const defaultKanjiRomaji = 3

// hiraganaRomaji is the shortest romaji input of each hiragana.
var hiraganaRomaji = map[rune]int{
	'あ': 1, 'い': 1, 'う': 1, 'え': 1, 'お': 1,
	'か': 2, 'き': 2, 'く': 2, 'け': 2, 'こ': 2,
	'さ': 2, 'し': 2, 'す': 2, 'せ': 2, 'そ': 2,
	'た': 2, 'ち': 2, 'つ': 2, 'て': 2, 'と': 2,
	'な': 2, 'に': 2, 'ぬ': 2, 'ね': 2, 'の': 2,
	'は': 2, 'ひ': 2, 'ふ': 2, 'へ': 2, 'ほ': 2,
	'ま': 2, 'み': 2, 'む': 2, 'め': 2, 'も': 2,
	'や': 2, 'ゆ': 2, 'よ': 2,
	'ら': 2, 'り': 2, 'る': 2, 'れ': 2, 'ろ': 2,
	'わ': 2, 'を': 2, 'ん': 2, // nn, unambiguous
	'が': 2, 'ぎ': 2, 'ぐ': 2, 'げ': 2, 'ご': 2,
	'ざ': 2, 'じ': 2, 'ず': 2, 'ぜ': 2, 'ぞ': 2,
	'だ': 2, 'ぢ': 2, 'づ': 2, 'で': 2, 'ど': 2,
	'ば': 2, 'び': 2, 'ぶ': 2, 'べ': 2, 'ぼ': 2,
	'ぱ': 2, 'ぴ': 2, 'ぷ': 2, 'ぺ': 2, 'ぽ': 2,
	'ぁ': 2, 'ぃ': 2, 'ぅ': 2, 'ぇ': 2, 'ぉ': 2,
	'っ': 3,                 // xtu
	'ゃ': 3, 'ゅ': 3, 'ょ': 3, // xya, xyu, xyo
	'ゎ': 3,         // xwa
	'ゐ': 2, 'ゑ': 2, // wi, we (archaic)
}

// kanaRomaji returns the romaji length of a kana, reading katakana as its
// hiragana, and false for anything else.
func kanaRomaji(r rune) (int, bool) {
	if n, ok := hiraganaRomaji[r]; ok {
		return n, true
	}
	if r >= 0x30a1 && r <= 0x30f6 {
		if n, ok := hiraganaRomaji[r-0x60]; ok {
			return n, true
		}
	}
	if r == 'ー' || r == '・' {
		return 1, true
	}
	return 0, false
}

// script is what a lesson is written in, for keystroke weights and WPM.
type script uint8

const (
	scriptOther script = iota
	scriptChinese
	scriptJapanese
)

// detectScript tells Japanese (any kana) from Chinese (ideographs without
// kana) from the rest.
func detectScript(chars []Char) script {
	hasHan := false
	for _, c := range chars {
		if IsKana(c.Want) {
			return scriptJapanese
		}
		if IsHan(c.Want) {
			hasHan = true
		}
	}
	if hasHan {
		return scriptChinese
	}
	return scriptOther
}

// keystrokes returns the keys typing r costs in a lesson of script s.
func keystrokes(r rune, s script) int {
	switch s {
	case scriptJapanese:
		if n, ok := kanaRomaji(r); ok {
			return n
		}
		if IsHan(r) {
			return defaultKanjiRomaji
		}
	case scriptChinese:
		if IsHan(r) {
			return pinyinWeight(r)
		}
	}
	return 1
}
