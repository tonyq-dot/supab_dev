import { useRef, useCallback } from 'react';

/**
 * Hook for implementing infinite scroll functionality
 * @param fetchMore Function to fetch more data
 * @param hasMore Whether there is more data to fetch
 * @returns Ref callback to attach to the last element
 */
export function useInfiniteScroll(
  fetchMore: () => Promise<void>,
  hasMore: boolean
) {
  const observer = useRef<IntersectionObserver>();
  
  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (!hasMore) return;
      
      if (observer.current) observer.current.disconnect();
      
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          fetchMore();
        }
      });
      
      if (node) observer.current.observe(node);
    },
    [fetchMore, hasMore]
  );
  
  return lastElementRef;
} 