"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
  className?: string;
}

export function CountdownTimer({ initialSeconds, onComplete, className }: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      onComplete?.();
      return;
    }

    const interval = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds, onComplete]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={className}>
      <span className="font-mono font-semibold">{formatTime(seconds)}</span>
    </div>
  );
}
