// Command gen copies the web app's texts and languages (src/locales,
// src/i18n-meta.json) into web/, which the desktop app embeds: go:embed
// cannot reach outside the module. Its own texts are in locales/.
package main

import (
	"log"
	"os"
	"path/filepath"
)

const src = "../../../src"

func main() {
	log.SetFlags(0)
	files, err := filepath.Glob(filepath.Join(src, "locales", "*.json"))
	if err != nil || len(files) == 0 {
		log.Fatalf("i18n: no locales in %s/locales: %v", src, err)
	}
	files = append(files, filepath.Join(src, "i18n-meta.json"))
	if err := os.MkdirAll("web", 0o755); err != nil {
		log.Fatal(err)
	}
	for _, f := range files {
		data, err := os.ReadFile(f)
		if err != nil {
			log.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join("web", filepath.Base(f)), data, 0o644); err != nil {
			log.Fatal(err)
		}
	}
}
