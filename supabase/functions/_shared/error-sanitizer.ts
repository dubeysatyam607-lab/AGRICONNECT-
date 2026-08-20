/**
 * Sanitize error messages before returning them to clients.
 * Prevents leaking internal implementation details (table names, column names,
 * function names, stack traces, API keys, etc.) in production.
 */

// Patterns that indicate internal implementation details
const INTERNAL_PATTERNS = [
  /column\s+["']?\w+["']?\s+does\s+not\s+exist/i,
  /relation\s+["']?\w+["']?\s+does\s+not\s+exist/i,
  /function\s+\w+\s+does\s+not\s+exist/i,
  /table\s+["']?\w+["']?\s+does\s+not\s+exist/i,
  /permission\s+denied\s+for\s+table/i,
  /permission\s+denied\s+for\s+function/i,
  /violates\s+(?:foreign|unique|not-null)\s+key/i,
  /invalid\s+input\s+for\s+type/i,
  /SQLSTATE/i,
  /PGRST\d+/i,
  /supabase/i,
  /deno\.land/i,
  /postgres(?:ql)?/i,
  /syntax\s+error\s+at/i,
  /UNIQUE\s+violation/i,
  /DETAIL:\s+/i,
  /HINT:\s+/i,
  /CONTEXT:\s+/i,
  /STACK:/i,
];

/**
 * Sanitize an error message for client consumption.
 * Returns a generic user-friendly message if the original contains internal details.
 */
export function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  // Check if the message leaks internal details
  const isInternal = INTERNAL_PATTERNS.some(p => p.test(raw));

  if (isInternal) {
    // Return generic messages based on common error categories
    const lower = raw.toLowerCase();
    if (lower.includes('permission denied') || lower.includes('42501')) {
      return 'You do not have permission to perform this action.';
    }
    if (lower.includes('unique') || lower.includes('duplicate')) {
      return 'This item already exists. Please try a different value.';
    }
    if (lower.includes('not found') || lower.includes('does not exist')) {
      return 'The requested resource was not found.';
    }
    if (lower.includes('rate limit') || lower.includes('too many')) {
      return 'Too many requests. Please try again later.';
    }
    return 'An unexpected error occurred. Please try again.';
  }

  // If no internal patterns found, it's likely a safe user-facing message
  // Still truncate to prevent abuse
  return raw.slice(0, 200);
}

/**
 * Create a safe error response JSON body.
 */
export function safeErrorResponse(error: unknown): { error: string } {
  return { error: sanitizeError(error) };
}
