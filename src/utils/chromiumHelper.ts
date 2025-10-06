import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright'; // or 'playwright-core'

function getChromiumPath(): string | undefined {
    const base = '/opt/render/.cache/ms-playwright';
    if (!fs.existsSync(base)) return undefined;

    const dirs = fs.readdirSync(base).filter((d) => d.startsWith('chromium'));
    if (dirs.length === 0) return undefined;

    // Example: /opt/render/.cache/ms-playwright/chromium-1193/chrome-linux/chrome
    return path.join(base, dirs[0], 'chrome-linux', 'chrome');
}

export async function launchChromium() {
    const executablePath = getChromiumPath();

    const browser = await chromium.launch({
        headless: true,
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    return browser;
}
