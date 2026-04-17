"use client";

import { useEffect, useRef, useState } from "react";

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
}

export function OTPInput({ length = 6, onComplete, disabled }: OTPInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedData = value.substring(0, length).split("");
      const newDigits = [...digits];
      pastedData.forEach((char, i) => {
        if (index + i < length && /^[0-9]$/.test(char)) {
          newDigits[index + i] = char;
        }
      });
      setDigits(newDigits);
      
      const nextIndex = Math.min(index + pastedData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      
      if (newDigits.every(d => d !== "")) {
        onComplete(newDigits.join(""));
      }
      return;
    }

    if (value !== "" && !/^[0-9]$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value !== "" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every(d => d !== "")) {
      onComplete(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && digits[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex justify-between gap-2 max-w-sm mx-auto">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          className="w-full aspect-square text-center text-xl font-bold rounded-xl bg-white/[0.05] border border-white/[0.08] text-white focus:bg-white/[0.08] focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50"
        />
      ))}
    </div>
  );
}
