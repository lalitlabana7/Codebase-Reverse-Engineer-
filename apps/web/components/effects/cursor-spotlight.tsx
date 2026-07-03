"use client";

import { useEffect, useRef } from "react";

export function CursorSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf: number;
    let mouseX = -500;
    let mouseY = -500;
    let currentX = -500;
    let currentY = -500;

    const handleMouse = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const animate = () => {
      currentX += (mouseX - currentX) * 0.08;
      currentY += (mouseY - currentY) * 0.08;
      el.style.background = `radial-gradient(600px circle at ${currentX}px ${currentY}px, rgba(129, 140, 248, 0.04), transparent 70%)`;
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouse);
    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouse);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed inset-0 pointer-events-none z-[1]"
      style={{ willChange: "background" }}
    />
  );
}
