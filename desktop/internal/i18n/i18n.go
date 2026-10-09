// Package i18n holds the app's texts in its nine languages: the web app's,
// copied into web/ by `go generate`, and the desktop's own in locales/.
// Every language has the same keys as English.
package i18n

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"maps"
	"slices"
	"strings"
	"sync"
)

//go:generate go run ./gen

//go:embed web/*.json locales/*.json
var files embed.FS

// Language is a language of the interface, and of the lessons in it.
type Language struct {
	Code  string // as the web's URLs have it, e.g. "zh"
	Label string // its own name
	// Lessons is the language of its lessons in the database.
	Lessons string
}

// Fallback is the language of texts missing from another.
const Fallback = "en"

// Languages are the interface languages, in the order of the web's
// src/i18n-meta.json.
var Languages = func() []Language {
	data, err := files.ReadFile("web/i18n-meta.json")
	if err != nil {
		panic(err)
	}
	var meta struct {
		Languages json.RawMessage `json:"languages"`
	}
	if err := json.Unmarshal(data, &meta); err != nil {
		panic(err)
	}
	// The object's order is the languages' order.
	dec := json.NewDecoder(bytes.NewReader(meta.Languages))
	if _, err := dec.Token(); err != nil {
		panic(err)
	}
	var langs []Language
	for dec.More() {
		code, _ := dec.Token()
		var l struct {
			Label          string `json:"label"`
			LessonLanguage string `json:"lessonLanguage"`
		}
		if err := dec.Decode(&l); err != nil {
			panic(err)
		}
		langs = append(langs, Language{Code: code.(string), Label: l.Label, Lessons: l.LessonLanguage})
	}
	return langs
}()

// Find returns the language of code, as "zh" or "zh-Hans-CN".
func Find(code string) (Language, bool) {
	base, _, _ := strings.Cut(strings.ReplaceAll(code, "_", "-"), "-")
	for _, l := range Languages {
		if strings.EqualFold(l.Code, base) {
			return l, true
		}
	}
	return Language{}, false
}

// texts maps each language to its flattened keys and texts.
var texts = sync.OnceValue(func() map[string]map[string]string {
	all := map[string]map[string]string{}
	for _, l := range Languages {
		flat := map[string]string{}
		for _, dir := range []string{"web", "locales"} {
			data, err := files.ReadFile(dir + "/" + l.Code + ".json")
			if err != nil {
				panic(err)
			}
			var tree map[string]any
			if err := json.Unmarshal(data, &tree); err != nil {
				panic(fmt.Sprintf("i18n: %s/%s.json: %v", dir, l.Code, err))
			}
			flatten("", tree, flat)
		}
		all[l.Code] = flat
	}
	return all
})

func flatten(prefix string, tree map[string]any, out map[string]string) {
	for k, v := range tree {
		switch v := v.(type) {
		case map[string]any:
			flatten(prefix+k+".", v, out)
		case string:
			out[prefix+k] = v
		}
	}
}

// Keys returns the keys of a language's texts.
func Keys(code string) []string {
	return slices.Collect(maps.Keys(texts()[code]))
}

// Translator gives the texts of one language.
type Translator struct{ lang string }

// For returns the translator of the language code, English for others.
func For(code string) Translator {
	if l, ok := Find(code); ok {
		return Translator{l.Code}
	}
	return Translator{Fallback}
}

// T returns the text of key, falling back to English, and to the key
// itself so that a missing text shows.
func (t Translator) T(key string) string {
	if s, ok := texts()[t.lang][key]; ok {
		return s
	}
	if s, ok := texts()[Fallback][key]; ok {
		return s
	}
	return key
}
