import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Ripple effect — injects a click-ripple span into any button.
 * Used automatically inside the Button component.
 */
function createRipple(e: React.MouseEvent<HTMLButtonElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const size = Math.max(rect.width, rect.height) * 2;

  const ripple = document.createElement("span");
  ripple.style.cssText = `
    position: absolute;
    top: ${y - size / 2}px;
    left: ${x - size / 2}px;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    pointer-events: none;
    animation: ripple-anim 0.6s ease-out forwards;
  `;
  el.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
}

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-mono transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35 select-none relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "terminal-btn-primary",
        destructive:
          "terminal-btn border-danger/30 text-danger hover:bg-danger-muted hover:border-danger/50",
        outline:
          "terminal-btn-outline",
        secondary:
          "terminal-btn border-secondary/20 text-secondary hover:bg-secondary-muted hover:border-secondary/40",
        ghost:
          "terminal-btn border-transparent hover:bg-transparent",
        link: "terminal-btn border-transparent hover:bg-transparent underline-offset-2 hover:underline",
        glass:
          "glass-strong text-primary hover:bg-primary/10 hover:border-primary/30",
        glow:
          "glow-card text-primary border-primary/20 hover:border-primary/40",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-7 px-2.5 py-1 text-[11px]",
        lg: "h-9 px-4 py-2",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, onClick, ...props }, ref) => {
    const [magnetStyle, setMagnetStyle] = React.useState({});
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);

    // Merge refs
    const setRef = (el: HTMLButtonElement | null) => {
      buttonRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      const el = buttonRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      setMagnetStyle({
        transform: `translate(${x * 0.2}px, ${y * 0.2}px)`,
        transition: "transform 0.1s ease-out",
      });
    };

    const handleMouseLeave = () => {
      setMagnetStyle({
        transform: "translate(0, 0)",
        transition: "transform 0.3s ease-out",
      });
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      createRipple(e);
      onClick?.(e);
    };

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={setRef}
        style={{ ...magnetStyle }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
