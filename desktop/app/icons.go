package app

import (
	"embed"

	"github.com/egoist/mygo/ui"
)

//go:generate node ../../scripts/generate-desktop-icons.mjs

// Lucide icons, the web app's (see scripts/generate-desktop-icons.mjs).
//
//go:embed icons/*.svg
var iconFiles embed.FS

// AppIcon is the app's icon, the web's, as a PNG: for the update window.
//
//go:embed icons/app.png
var AppIcon []byte

func icon(name string) *ui.SVG {
	data, err := iconFiles.ReadFile("icons/" + name + ".svg")
	if err != nil {
		panic(err)
	}
	return ui.MustParseSVG(data)
}

// The icons the app uses, which the generator finds here by their calls of
// icon.
var (
	iconShuffle        = icon("shuffle")
	iconRestart        = icon("rotate-ccw")
	iconUser           = icon("user")
	iconBook           = icon("book-open")
	iconFeather        = icon("feather")
	iconMusic          = icon("music")
	iconChevronsUpDown = icon("chevrons-up-down")
	iconKeyboard       = icon("keyboard")
	iconSettings       = icon("settings")
	iconTrophy         = icon("trophy")
	iconMail           = icon("mail")
	iconUserPlus       = icon("user-plus")
	iconCamera         = icon("camera")
	iconEnter          = icon("corner-down-left")
)

// logoMarkup is the app's logo, the web's src/components/Logo.tsx: a
// keycap with an A. MyGo draws no SVG text, so the A is a path.
const logoMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect x="1.5" y="1.5" width="45" height="45" rx="11" fill="#007FFF"/>
  <rect x="6.5" y="5" width="35" height="33" rx="8" fill="#ffffff" fill-opacity="0.22"/>
  <path d="M15.6 31 L22 13.5 H26 L32.4 31 H28.3 L27 27.2 H21 L19.7 31 Z M22.1 23.9 H25.9 L24 18.2 Z" fill="#ffffff"/>
</svg>`

var logoSVG = ui.MustParseSVG([]byte(logoMarkup))

// googleSVG is Google's logo, for its sign-in button.
var googleSVG = ui.MustParseSVG([]byte(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.31h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.15 3.58-8.65z"/>
  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.86-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24z"/>
  <path fill="#FBBC05" d="M5.27 14.29A7.21 7.21 0 0 1 4.9 12c0-.79.14-1.55.37-2.29V6.62H1.28A12 12 0 0 0 0 12c0 1.93.46 3.76 1.28 5.38l3.99-3.09z"/>
  <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.61 4.6 1.82l3.45-3.45C17.94 1.06 15.24 0 12 0 7.31 0 3.27 2.69 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>
</svg>`))
