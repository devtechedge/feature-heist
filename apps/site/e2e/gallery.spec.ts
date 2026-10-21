import { test, expect } from "@playwright/test";

test("gallery lists all five rebuilt features", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("feature-card")).toHaveCount(5);
  await expect(page.getByText("evidence missing")).toHaveCount(0);
});

test("markdown toggle demo bolds and un-bolds a selection", async ({ page }) => {
  await page.goto("/features/electron-markdownify-bold-italic-strikethrough-toggle/");
  const box = page.getByTestId("toggle-input");
  await box.fill("say hi now");
  await box.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(4, 6));
  await page.getByTestId("toggle-bold").click();
  await expect(box).toHaveValue("say **hi** now");
  await page.getByTestId("toggle-bold").click();
  await expect(box).toHaveValue("say hi now");
  await expect(page.getByTestId("evidence-id")).toContainText("ev_");
});

test("WETH9 demo deposits", async ({ page }) => {
  await page.goto("/features/weth9-hex-weth9-wrap-unwrap-token/");
  await page.getByTestId("weth-amount").fill("7");
  await page.getByTestId("weth-deposit").click();
  await expect(page.getByTestId("weth-log")).toContainText("alice=7 bob=0 totalSupply=7");
});

test("npm demo builds the recorded URL shape", async ({ page }) => {
  await page.goto("/features/npm-search-redacted-har-npm-registry-search-client/");
  await expect(page.getByTestId("npm-url")).toHaveText("https://registry.npmjs.org/-/v1/search?text=keywords:electron%20author:sindresorhus&size=5");
});

test("number words demo", async ({ page }) => {
  await page.goto("/features/humanizer-dll-english-number-to-words/");
  await page.getByTestId("words-n").fill("101");
  await expect(page.getByTestId("words-out")).toContainText("ToWords: one hundred and one");
  await expect(page.getByTestId("words-out")).toContainText("ToOrdinalWords: hundred and first");
});

test("theme toggle switches and persists", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("native demo runs the rebuilt pan and CRC with Ghidra pseudocode shown", async ({ page }) => {
  await page.goto("/features/pancrc-fh-pan-native/");
  await expect(page.getByTestId("crc-out")).toHaveText("fh_crc16 = 0x29B1");
  await expect(page.getByTestId("pan-out")).toContainText("fh_pan(480, 640) = 64");
  await expect(page.getByTestId("pseudocode")).toHaveCount(2);
});
