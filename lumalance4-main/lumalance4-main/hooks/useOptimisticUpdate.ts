import { useState } from 'react';

interface OptimisticUpdateOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for implementing optimistic updates
 * @param updateFn Function to perform the actual update
 * @param options Options for success and error callbacks
 * @returns Object with update function and pending state
 */
export function useOptimisticUpdate<T>(
  updateFn: (data: T) => Promise<void>,
  options?: OptimisticUpdateOptions
) {
  const [isPending, setIsPending] = useState(false);
  
  const update = async (data: T, optimisticUpdate: () => void) => {
    // Apply optimistic update immediately
    optimisticUpdate();
    setIsPending(true);
    
    try {
      await updateFn(data);
      options?.onSuccess?.();
    } catch (error) {
      // Revert optimistic update on error
      options?.onError?.(error as Error);
    } finally {
      setIsPending(false);
    }
  };
  
  return { update, isPending };
} 