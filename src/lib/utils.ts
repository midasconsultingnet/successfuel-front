import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { HTMLAttributes, HTMLAnchorAttributes, HTMLButtonAttributes, HTMLTableAttributes, HTMLTdAttributes, HTMLThAttributes, HTMLInputAttributes } from 'svelte/elements';

export function cn(...args: ClassValue[]) {
  return twMerge(clsx(args));
}

export type Without<T, K> = Pick<T, Exclude<keyof T, K>>;
export type WithoutChildrenOrChild<T> = Without<T, 'children' | 'child'>;
export type WithElementRef<T> = T & { ref?: HTMLElement | null };

// Theme utility functions
export function setDarkMode(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
}

export function initDarkMode() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    setDarkMode(true);
  } else {
    setDarkMode(false);
  }
}

// Theme switching functionality for alternative themes
export function setTheme(themeName: string) {
  // Remove any existing theme classes
  document.documentElement.classList.remove('theme-stone', 'theme-purple', 'theme-sky', 'theme-lime', 'theme-successfuel');

  if (themeName !== 'default') {
    document.documentElement.classList.add(`theme-${themeName}`);
  }

  localStorage.setItem('selectedTheme', themeName);
}

// Apply theme based on saved preference
export function applySavedTheme() {
  const savedTheme = localStorage.getItem('selectedTheme');
  if (savedTheme && savedTheme !== 'default') {
    document.documentElement.classList.add(`theme-${savedTheme}`);
  }
}