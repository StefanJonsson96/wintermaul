// The Chromium the browser scripts drive: $CHROMIUM if set, else a preinstalled Playwright browser
// (PLAYWRIGHT_BROWSERS_PATH, /opt/pw-browsers), else whatever playwright-core finds itself.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

export function chromiumPath() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean)) {
    if (!existsSync(root)) continue;
    if (existsSync(join(root, 'chromium'))) return join(root, 'chromium');
    for (const dir of readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
      for (const sub of ['chrome-linux64', 'chrome-linux']) {
        const exe = join(root, dir, sub, 'chrome');
        if (existsSync(exe)) return exe;
      }
    }
  }
  return undefined;
}

/** Launches Chromium with software WebGL, so canvas games render headless. */
export function launchChromium(args = []) {
  return chromium.launch({ executablePath: chromiumPath(), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', ...args] });
}
