/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last time it was invoked.
 * The debounced function comes with a cancel method to cancel delayed invocations.
 * 
 * @param func The function to debounce
 * @param waitFor Time in milliseconds to wait before invoking the function
 * @returns A debounced version of the function with a cancel method
 */
export type DebouncedFunction<F extends (...args: any[]) => any> = {
  (...args: Parameters<F>): void;
  cancel: () => void;
};

export function debounce<F extends (...args: any[]) => any>(
  func: F, 
  waitFor: number
): DebouncedFunction<F> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  // Create the debounced function
  const debounced: any = function(...args: Parameters<F>): void {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  // Add the cancel method
  debounced.cancel = function() {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced as DebouncedFunction<F>;
}