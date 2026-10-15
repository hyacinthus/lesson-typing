import { useEffect } from 'react';

/**
 * Names the browser tab after the page. Every page sets its own title, so
 * nothing is restored when one closes; an undefined title keeps the last.
 */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}
