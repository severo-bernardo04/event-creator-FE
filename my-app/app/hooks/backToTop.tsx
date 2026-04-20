import { useCallback } from 'react';

export function useBackToTop() {
  const scrollToTop = useCallback((smooth = true) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  return scrollToTop;
}