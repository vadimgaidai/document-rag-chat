import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import type { ClassValue } from "clsx"

/** Merges Tailwind classes so a later class wins over an earlier conflicting one. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))
