import { expect, test } from "@playwright/test";

/**
 * Walks every stage of a recorded sample project. Samples carry cached AI output,
 * so this exercises the full UI without spending model quota.
 */

test("landing page explains the pipeline and validates the idea input", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Understand it/ })).toBeVisible();
  const start = page.getByRole("button", { name: "Start with Understand" });
  await expect(start).toBeDisabled();
  await page.getByLabel("Describe your app idea").fill("A habit tracker for college students");
  await expect(start).toBeEnabled();
  for (const stage of ["Understand", "Plan", "Build", "Explain", "Learn"]) {
    await expect(page.getByText(stage, { exact: true }).first()).toBeVisible();
  }
});

test("API rejects invalid input at the boundary", async ({ request }) => {
  const short = await request.post("/api/understand", { data: { idea: "todo" } });
  expect(short.status()).toBe(400);
  const traversal = await request.post("/api/snack", { data: { name: "x", files: { "../evil.js": "x" } } });
  expect(traversal.status()).toBe(400);
  expect((await traversal.json()).error.message).toBe("Invalid file path.");
});

test("a sample project can be explored through all five stages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /HabitPulse/ }).click();
  await page.waitForURL(/\/studio\//);

  const stages = page.getByRole("navigation", { name: "Studio stages" });

  // Build is where samples open: files, editor and the phone preview.
  await expect(page.getByText("App.js").first()).toBeVisible();
  await expect(page.getByTitle("Live app preview")).toBeAttached();
  await expect(page.getByText("Project checker: imports and entry point look good")).toBeVisible();

  await stages.getByRole("button", { name: /Understand/ }).click();
  await expect(page.getByText("App brief · editable")).toBeVisible();
  await expect(page.getByText("Lunor's read")).toBeVisible();

  await stages.getByRole("button", { name: /Plan/ }).click();
  await expect(page.getByText("Stack decision")).toBeVisible();
  await expect(page.getByText("Screen flow")).toBeVisible();
  await expect(page.getByText("Data model")).toBeVisible();

  await stages.getByRole("button", { name: /Explain/ }).click();
  await expect(page.getByText("Ask about this code")).toBeVisible();
  await expect(page.getByText(/^L\d+–\d+$/).first()).toBeVisible();
  await page.getByRole("tab", { name: /Architecture map/ }).click();
  await expect(page.getByText("How your app is wired")).toBeVisible();

  await stages.getByRole("button", { name: /Learn/ }).click();
  await expect(page.getByText("Why it matters in your app")).toBeVisible();
  await page.getByRole("button", { name: /Mark as read/ }).click();
  await expect(page.getByText("Lesson complete")).toBeVisible();
  await expect(page.getByText(/^20 /)).toBeVisible();
});
