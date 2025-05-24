/**
 * Checks if the waitlist feature is enabled based on environment variable
 */
export const isWaitlistEnabled = (): boolean => {
  if (typeof process.env.NEXT_PUBLIC_WAITLIST === 'undefined') {
    return false;
  }
  
  return process.env.NEXT_PUBLIC_WAITLIST === 'true';
}; 