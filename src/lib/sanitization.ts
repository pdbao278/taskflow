/**
 * Centralized sanitization utility to prevent XSS (PRD 10.1).
 * Strips HTML tags and trims whitespace.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (input === null || input === undefined) return "";
  
  // Basic regex to strip HTML tags. 
  // For a more robust solution, a library like 'sanitize-html' could be used,
  // but this satisfies the current requirement of "sanitize toàn bộ, không render HTML".
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Sanitizes an object with specific text fields.
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
  const result = { ...obj };
  for (const field of fields) {
    if (typeof result[field] === "string") {
      result[field] = sanitizeText(result[field]) as any;
    }
  }
  return result;
}
