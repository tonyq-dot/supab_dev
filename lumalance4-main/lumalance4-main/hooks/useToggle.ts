import { useState, useCallback } from 'react';

/**
 * Hook for managing boolean state with toggle functionality
 * @param initialValue The initial boolean value
 * @returns Tuple of [value, toggle, setTrue, setFalse]
 */
export function useToggle(initialValue: boolean = false): [
  boolean,
  () => void,
  () => void,
  () => void
] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue(prev => !prev), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return [value, toggle, setTrue, setFalse];
} 