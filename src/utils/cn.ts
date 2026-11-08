import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 合并 className，后面的 Tailwind 类会覆盖前面冲突的类。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
