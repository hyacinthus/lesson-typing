// Package config holds what the app is built with: the Supabase project,
// whose URL and anon key `go generate` copies from the repository's .env
// into config_gen.go (gitignored, like .env), and fixed addresses.
package config

//go:generate go run ./gen

// The Supabase project, set by config_gen.go. Empty in builds made without
// it, as CI's compile checks.
var (
	SupabaseURL     string
	SupabaseAnonKey string
)

// URLScheme is the app's deep link scheme (urlSchemes in mygo.json).
const URLScheme = "lessontyping"

// AuthCallbackURL is where Supabase sends the browser after a Google
// sign-in or an email confirmation: back to the app, with a PKCE code. It
// must be listed in the Supabase project's redirect URLs.
const AuthCallbackURL = URLScheme + "://auth/callback"

// IssuesURL is where feedback goes.
const IssuesURL = "https://github.com/hyacinthus/lesson-typing/issues"

// Configured reports whether the app was built with a Supabase project.
func Configured() bool { return SupabaseURL != "" && SupabaseAnonKey != "" }
