import { useCallback, useLayoutEffect, useState } from 'react';

export type RestaurantTheme = 'light' | 'dark';

const STORAGE_KEY = 'restomax_theme';

function readStoredTheme(): RestaurantTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function useRestaurantTheme() {
  const [theme, setTheme] = useState<RestaurantTheme>(readStoredTheme);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    return () => {
      root.classList.remove('dark');
    };
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: RestaurantTheme = prev === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
