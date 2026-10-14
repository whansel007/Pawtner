import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const BASE = "http://localhost:5180";
const OUT = join(import.meta.dirname, "..", "proof");

mkdirSync(OUT, { recursive: true });

const sizes = [
  { w: 360, h: 740, label: "360x740" },
  { w: 390, h: 844, label: "390x844" },
  { w: 430, h: 932, label: "430x932" },
  { w: 1280, h: 800, label: "1280x800" },
  { w: 360, h: 640, label: "360x640" },
];

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  saved ${name}.png`);
}

function centerX(width) {
  return width <= 430 ? width / 2 : 640;
}

async function skipIntro(page, width) {
  const cx = centerX(width);
  await page.mouse.click(cx, 400);
  await page.waitForTimeout(800);
  await page.mouse.click(cx, 400);
  await page.waitForTimeout(800);
}

async function navigateToHealth(page, width) {
  await page.goto(BASE);
  await page.waitForTimeout(800);
  await skipIntro(page, width);
  await page.waitForSelector('.bottom-nav button', { timeout: 5000 });
  const healthBtn = page.locator('.bottom-nav button').nth(2);
  await healthBtn.click();
  await page.waitForTimeout(800);
}

async function navigateToHome(page, width) {
  await page.goto(BASE);
  await page.waitForTimeout(800);
  await skipIntro(page, width);
}

async function fillBpForm(page, sys, dia, note) {
  const inputs = page.locator('.bp-form__input');
  await inputs.nth(0).fill(String(sys));
  await inputs.nth(1).fill(String(dia));
  if (note) {
    await inputs.nth(2).fill(note);
  }
  await page.locator('.bp-form__submit').click();
  await page.waitForTimeout(800);
}

async function openDecisionLog(page) {
  const btn = page.locator('.decision-log__toggle');
  if (await btn.count() > 0) {
    await btn.click();
    await page.waitForTimeout(300);
  }
}

async function tapDog(page) {
  const dog = page.locator('.dog-stage__pet');
  if (await dog.count() > 0) {
    await dog.click();
  }
}

const browser = await chromium.launch({ headless: true });

for (const size of sizes) {
  console.log(`\n=== ${size.label} ===`);
  const context = await browser.newContext({
    viewport: { width: size.w, height: size.h },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // 1. Health form (empty)
  await navigateToHealth(page, size.w);
  await shot(page, `health-form-${size.label}`);

  // 2. 185/120 + "bad headache" result with attentive dog
  await fillBpForm(page, 185, 120, "bad headache");
  await shot(page, `emergency-result-${size.label}`);

  // 3. Decision log open
  await openDecisionLog(page);
  await shot(page, `decision-log-${size.label}`);

  await context.close();

  // 4. Pet reactions — fresh context so the dog is not in attentive mood.
  const playContext = await browser.newContext({
    viewport: { width: size.w, height: size.h },
    deviceScaleFactor: 1,
  });
  const playPage = await playContext.newPage();
  await navigateToHome(playPage, size.w);

  // hop (first tap)
  await tapDog(playPage);
  await playPage.waitForTimeout(150);
  await shot(playPage, `pet-hop-${size.label}`);

  // Wait for cooldown
  await playPage.waitForTimeout(700);

  // hearts (second tap)
  await tapDog(playPage);
  await playPage.waitForTimeout(550);
  await shot(playPage, `pet-hearts-${size.label}`);

  // Wait for cooldown
  await playPage.waitForTimeout(1300);

  // bubble (third tap)
  await tapDog(playPage);
  await playPage.waitForTimeout(300);
  await shot(playPage, `pet-bubble-${size.label}`);

  await playContext.close();
}

await browser.close();
console.log("\nDone.");
