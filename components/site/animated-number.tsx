"use client";

import * as React from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * Número que conta até `value` quando `active` vira true e re-anima a cada
 * mudança de `value` (partindo do valor exibido no momento).
 */
export function AnimatedNumber({
  value,
  active = true,
  duration = 0.8,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  active?: boolean;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(0);
  const current = React.useRef(0);

  React.useEffect(() => {
    if (!active) return;
    if (reduce) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(current.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        current.current = v;
        setDisplay(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, active, reduce, duration]);

  return (
    <span className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
