package app

import (
	"context"
	"errors"
	"sync"

	"github.com/hyacinthus/lesson-typing/desktop/internal/data"
	"github.com/hyacinthus/lesson-typing/desktop/internal/i18n"
)

// catalog is the lessons and collections of a language.
type catalog struct {
	loading     bool
	err         error
	lessons     []data.LessonSummary
	collections []data.Collection
}

// loadCatalog starts loading the lessons of l, and its collections at the
// same time.
func (a *App) loadCatalog(l i18n.Language) *catalog {
	cat := &catalog{loading: true}
	a.run(func(ctx context.Context) func() {
		var (
			lessons []data.LessonSummary
			cols    []data.Collection
			errs    [2]error
			wg      sync.WaitGroup
		)
		wg.Go(func() { lessons, errs[0] = a.store.Lessons(ctx, l.Lessons) })
		wg.Go(func() { cols, errs[1] = a.store.Collections(ctx, l.Lessons) })
		wg.Wait()
		err := errors.Join(errs[:]...)
		return func() {
			cat.loading, cat.err = false, err
			cat.lessons, cat.collections = lessons, cols
		}
	})
	return cat
}

// retryCatalog loads the catalog again after it failed.
func (a *App) retryCatalog() {
	a.catalog = a.loadCatalog(a.lang)
}

// collection returns the collection to practice: the one chosen last when
// the language has it, else its first.
func (a *App) collection() string {
	cols := a.catalog.collections
	for _, c := range cols {
		if c.ID == a.prefs.Collection {
			return c.ID
		}
	}
	if len(cols) > 0 {
		return cols[0].ID
	}
	return ""
}

// setCollection chooses the collection to practice.
func (a *App) setCollection(id string) {
	if a.prefs.Collection != id {
		a.prefs.Collection = id
		a.savePrefs()
	}
}

// startPractice opens a random lesson of the chosen collection.
func (a *App) startPractice() {
	cat := a.catalog
	if cat.loading {
		return
	}
	if l := data.PickRandom(cat.lessons, a.lang.Lessons, a.collection(), ""); l != nil {
		a.router.Push("/lesson/" + l.ID)
	}
}
