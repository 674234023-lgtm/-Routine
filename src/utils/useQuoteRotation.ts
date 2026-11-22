import { useCallback, useEffect, useState } from 'react';

export const QUOTE_ROTATION_SECONDS = 60; // 1 minute

export function formatCountdownMMSS(totalSeconds: number): string {
  const mins = Math.floor(Math.max(0, totalSeconds) / 60);
  const secs = Math.max(0, totalSeconds) % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function useOneMinuteQuoteRotation(poolLength: number) {
  const safeLength = Math.max(1, poolLength);
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(QUOTE_ROTATION_SECONDS);

  useEffect(() => {
    setIndex((prev) => prev % safeLength);
  }, [safeLength]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIndex((idx) => (idx + 1) % safeLength);
          return QUOTE_ROTATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [safeLength]);

  const nextQuote = useCallback(() => {
    setIndex((idx) => (idx + 1) % safeLength);
    setSecondsLeft(QUOTE_ROTATION_SECONDS);
  }, [safeLength]);

  const resetTimer = useCallback(() => {
    setSecondsLeft(QUOTE_ROTATION_SECONDS);
  }, []);

  return {
    activeIndex: index % safeLength,
    secondsLeft,
    formattedCountdown: formatCountdownMMSS(secondsLeft),
    nextQuote,
    resetTimer,
  };
}

export const useTwoMinuteQuoteRotation = useOneMinuteQuoteRotation;
