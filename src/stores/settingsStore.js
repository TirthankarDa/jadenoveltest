// src/stores/settingsStore.js
import { atom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

// Use persistentAtom to automatically sync with localStorage
// The format is: persistentAtom(keyInLocalStorage, defaultValue)
export const theme = persistentAtom('readingTheme', 'light');
export const fontSize = persistentAtom('readingFontSize', 16);
export const fontFamily = persistentAtom('readingFontFamily', 'serif');
export const isInfiniteScroll = persistentAtom('readingInfiniteScroll', 'off');

// Actions to modify the state. This keeps all logic in one place.
export function changeTheme(newTheme) {
    theme.set(newTheme);
}

export function changeFontFamily(newFamily) {
    fontFamily.set(newFamily);
}

export function changeInfiniteScroll(mode) {
    isInfiniteScroll.set(mode);
}

export function toggleInfiniteScroll() {
    isInfiniteScroll.set(isInfiniteScroll.get() === 'on' ? 'off' : 'on');
}

export function changeFontSize(amount) {
    const currentSize = parseInt(fontSize.get(), 10) || 16; // Use 16 as a fallback if parseInt fails

    // Now this math is guaranteed to be safe
    const newSize = Math.max(12, Math.min(32, currentSize + amount));

    console.log(`Changing font size from ${currentSize} to ${newSize}`); // Let's add your log here!
    
    fontSize.set(newSize);
}