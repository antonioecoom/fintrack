'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@repo/utils';

interface AnimatedNumberProps {
  value: number;
  currency?: string;
  locale?: string;
}

export function AnimatedNumber({ value, currency = 'EUR', locale = 'es-ES' }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 600; // ms
    const startTime = performance.now();

    let animationFrameId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad formula
      const ease = progress * (2 - progress);
      const current = start + (end - start) * ease;
      
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, displayValue]);

  return <span>{formatCurrency(displayValue, currency, locale)}</span>;
}
