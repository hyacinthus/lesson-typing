import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Shared recipe for the rounded header controls (selects, user menu, theme toggle)
export const pillClass =
  "rounded-full border-border bg-card text-sm font-medium text-muted-foreground shadow-sm transition-shadow hover:shadow-md"

// The page's main call to action (start practicing, download the app)
export const ctaClass =
  "bg-primary text-primary-foreground text-xl font-medium rounded-[10px] shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200"
