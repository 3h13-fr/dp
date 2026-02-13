'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect scroll direction (up/down)
 * Returns 'up' when scrolling up, 'down' when scrolling down, or null when at top
 */
export function useScrollDirection() {
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setDirection(null);
      } else if (currentScrollY > lastScrollY) {
        setDirection('down');
      } else {
        setDirection('up');
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return direction;
}
