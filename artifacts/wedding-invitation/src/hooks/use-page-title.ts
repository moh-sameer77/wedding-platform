import { useEffect } from 'react';

const BASE = 'Mohammad & Renad';

export function usePageTitle(section?: string) {
  useEffect(() => {
    document.title = section ? `${section} · ${BASE}` : `${BASE} — Wedding Invitation`;
    return () => {
      document.title = `${BASE} — Wedding Invitation`;
    };
  }, [section]);
}
