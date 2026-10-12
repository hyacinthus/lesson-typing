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
			if a.catalog == cat {
				a.catalogLoaded()
			}
		}
	})
	return cat
}

// catalogLoaded lists the collections in the menu and, when no lesson is
// open, opens one of the collection chosen; at the first launch, the start
// page asks for one.
func (a *App) catalogLoaded() {
	a.updateMenu()
	if a.catalog.err == nil && a.lessonID == "" && a.prefs.Collection != "" {
		a.startPractice()
	}
}

// retryCatalog loads the catalog again after it failed.
func (a *App) retryCatalog() {
	a.catalog = a.loadCatalog(a.lang)
}

// collection returns the collection to practice: the one chosen last when
// the language has it, else its first.
func (a *App) collection() data.Collection {
	return findCollection(a.catalog.collections, a.prefs.Collection)
}

// findCollection returns the collection of cols with id, else the first,
// else none.
func findCollection(cols []data.Collection, id string) data.Collection {
	for _, c := range cols {
		if c.ID == id {
			return c
		}
	}
	if len(cols) > 0 {
		return cols[0]
	}
	return data.Collection{}
}

// chooseCollection chooses the collection to practice and opens one of
// its lessons, unless the lesson open is of it.
func (a *App) chooseCollection(id string) {
	if p := a.currentPractice(); p != nil && p.lesson.CollectionID == id {
		return
	}
	a.prefs.Collection = id
	a.savePrefs()
	a.updateMenu()
	a.startPractice()
}

// startPractice opens a random lesson of the chosen collection.
func (a *App) startPractice() {
	cat := a.catalog
	if cat.loading {
		return
	}
	if l := data.PickRandom(cat.lessons, a.lang.Lessons, a.collection().ID, ""); l != nil {
		a.lessonID = l.ID
	}
}

// lessonCount is the number of lessons of collection id.
func (a *App) lessonCount(id string) int {
	n := 0
	for _, l := range a.catalog.lessons {
		if l.CollectionID == id {
			n++
		}
	}
	return n
}
