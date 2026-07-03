"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  format?: boolean;
}

export function AnimatedCounter({
  value,
  duration = 800,
  className = "",
  prefix = "",
  suffix = "",
  decimals = 0,
  format = true,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = prevValue.current;
    const diff = value - start;
    if (Math.abs(diff) < 0.01) {
      setDisplay(value);
      return;
    }

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setDisplay(current);

      if (progress < 1) {
        raf.current = requestAnimationFrame(animate);
      } else {
        setDisplay(value);
        prevValue.current = value;
      }
    };

    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  // Update prevValue when value changes externally
  useEffect(() => {
    return () => {
      prevValue.current = display;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className={className}>
      {prefix}{format ? Number(display.toFixed(decimals)).toLocaleString() : display.toFixed(decimals)}{suffix}
    </span>
  );
}
