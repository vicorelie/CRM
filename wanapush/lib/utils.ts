import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Helper standard shadcn/ui : merge les classes Tailwind sans conflits.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
