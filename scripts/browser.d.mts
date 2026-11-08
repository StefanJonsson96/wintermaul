import type { Browser } from 'playwright-core';

export function chromiumPath(): string | undefined;
export function launchChromium(args?: string[]): Promise<Browser>;
