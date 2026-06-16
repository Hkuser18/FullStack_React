import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BROWSER_PATH = 'C:\\Users\\amit ginzberg\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe';
const BASE = 'http://localhost:5173';
const SHOTS = './smoke-shots';

await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: BROWSER_PATH, headless: true });
const page    = await browser.newPage();

async function shot(name) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
  console.log(`📸 ${name}`);
}

// ── 1. Login page ──────────────────────────────────────────────────────────
await page.goto(BASE);
await page.waitForLoadState('networkidle');
await shot('01-login');

// ── 2. Login as teacher ────────────────────────────────────────────────────
await page.click('button:has-text("Teacher")');
await page.fill('input[placeholder*="sername"], input[name="username"]', 'teacher1');
await page.fill('input[type="password"]', 'pass123');
await page.click('button[type="submit"]');
await page.waitForSelector('button.btn-logout', { timeout: 10000 });
await shot('02-teacher-examlist');

// ── 3. Navigate to create exam ────────────────────────────────────────────
const createBtn = page.locator('button:has-text("Create"), button:has-text("New Exam")').first();
if (await createBtn.count()) {
  await createBtn.click();
  await page.waitForLoadState('networkidle');
  await shot('03-create-exam');
}

// ── 4. Logout and login as student ────────────────────────────────────────
await page.click('button.btn-logout');
await page.waitForSelector('input[placeholder*="sername"]', { timeout: 10000 });

await page.click('button:has-text("Student")').catch(() => {});
await page.fill('input[placeholder*="sername"]', 'student1');
await page.fill('input[type="password"]', 'pass123');
await page.click('button[type="submit"]');
await page.waitForSelector('button.btn-logout', { timeout: 10000 });
await shot('04-student-availableexams');

// ── 5. My Results ─────────────────────────────────────────────────────────
const resultsLink = page.locator('text=My Results, text=התוצאות שלי').first();
if (await resultsLink.count()) {
  await resultsLink.click();
  await page.waitForLoadState('networkidle');
  await shot('05-my-results');
}

await browser.close();
console.log('\n✅ Smoke test complete — screenshots saved to smoke-shots/');
