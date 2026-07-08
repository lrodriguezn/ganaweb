import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * cn — merge class names with conflict resolution.
 * Standard shadcn helper: composes clsx (conditional) + tailwind-merge
 * (last-write-wins for conflicting Tailwind utilities).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
