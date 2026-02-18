const { test, expect } = require("@playwright/test");

test("dashboard se charge", async ({ page }) => {
  await page.addInitScript(() => {
    const now = Date.now();
    localStorage.setItem(
      "proxyservices_admin_session",
      JSON.stringify({
        email: "admin123",
        issuedAt: now,
        expiresAt: now + 60 * 60 * 1000
      })
    );
  });

  await page.goto("/admin-dashboard.html");
  await expect(page).toHaveURL(/admin-dashboard\.html/i);
  await expect(page).toHaveTitle(/Dashboard Admin/i);
  await expect(page.locator("h1")).toContainText(/V.rification des prestataires/);
});

test("app se charge", async ({ page }) => {
  await page.goto("/index.html");
  await expect(page).toHaveTitle(/App - Frames/i);
  await expect(page.locator("#to-frame-2-btn")).toBeVisible();
});

