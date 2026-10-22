// What kind of screen we are on: phones and tablets get touch controls and a compact layout.

/** A touch screen is the main way to play (a phone or a tablet, not a laptop with a touch screen). */
export const touchDevice = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

/** Marks the page so the styles can adapt (the `touch` class on the root element). */
export function markDevice(): void {
  document.documentElement.classList.toggle('touch', touchDevice);
}
