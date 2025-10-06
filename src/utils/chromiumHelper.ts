import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';

export function getChromiumPath(): string | undefined {
    const base = '/opt/render/.cache/ms-playwright';
    if (!fs.existsSync(base)) return undefined;

    const dirs = fs.readdirSync(base).filter((d) => d.startsWith('chromium'));
    if (dirs.length === 0) return undefined;

    return path.join(base, dirs[0], 'chrome-linux', 'chrome');
}

export async function launchChromium() {
    const executablePath = getChromiumPath();
    executablePath;
    console.log({});
    if (!executablePath) throw new Error('Chromium not found');

    const browser = await chromium.launch({
        headless: true,
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    return browser;
}
