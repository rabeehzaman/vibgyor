import { test, expect } from "@playwright/test";

const uniqueMobile = () => `9${Date.now().toString().slice(-9)}`;

test.describe("Customer Authentication", () => {
  test("login page loads and has form", async ({ page }) => {
    await page.goto("/customer/login");
    await expect(page.locator("h1")).toContainText("Welcome Back");
    await expect(page.locator("#mobile")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /login/i })).toBeVisible();
    await expect(page.getByText("Don't have an account?")).toBeVisible();
  });

  test("register page loads and has form", async ({ page }) => {
    await page.goto("/customer/register");
    await expect(page.locator("h1")).toContainText("Create Account");
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#mobile")).toBeVisible();
    await expect(page.locator("#accountNumber")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();
  });

  test("register link from login page works", async ({ page }) => {
    await page.goto("/customer/login");
    await page.getByRole("link", { name: "Register" }).click();
    await expect(page).toHaveURL(/\/customer\/register/);
  });

  test("login link from register page works", async ({ page }) => {
    await page.goto("/customer/register");
    await page.getByRole("main").getByRole("link", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/customer\/login/);
  });

  test("register shows error for password mismatch", async ({ page }) => {
    await page.goto("/customer/register");
    await page.locator("#name").fill("Test User");
    await page.locator("#mobile").fill("9876543210");
    await page.locator("#accountNumber").fill("ACC001");
    await page.locator("#password").fill("password123");
    await page.locator("#confirmPassword").fill("differentpassword");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  test("login shows error for invalid credentials", async ({ page }) => {
    await page.goto("/customer/login");
    await page.locator("#mobile").fill("0000000000");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: /login/i }).click();
    await expect(page.getByText("Invalid mobile number or password")).toBeVisible();
  });

  test("unauthenticated user is redirected from dashboard to login", async ({ page }) => {
    // Clear any stored session
    await page.goto("/customer/login");
    await page.evaluate(() => localStorage.removeItem("vibgyor-customer"));
    await page.goto("/customer");
    await expect(page).toHaveURL(/\/customer\/login/);
  });

  test("unauthenticated user is redirected from new-request to login", async ({ page }) => {
    await page.goto("/customer/login");
    await page.evaluate(() => localStorage.removeItem("vibgyor-customer"));
    await page.goto("/customer/new-request");
    await expect(page).toHaveURL(/\/customer\/login/);
  });

  test("track page is accessible without login", async ({ page }) => {
    await page.goto("/customer/login");
    await page.evaluate(() => localStorage.removeItem("vibgyor-customer"));
    await page.goto("/customer/track");
    await expect(page).toHaveURL(/\/customer\/track/);
    await expect(page.locator("h1")).toContainText("Track Your Request");
  });

  test("header shows Login and Track when not authenticated", async ({ page }) => {
    await page.goto("/customer/login");
    await page.evaluate(() => localStorage.removeItem("vibgyor-customer"));
    await page.goto("/customer/login");
    await expect(page.getByRole("link", { name: /track my request/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /login/i })).toBeVisible();
  });
});

test.describe("Customer Registration + Login Flow", () => {
  const mobile = uniqueMobile();
  const name = "Test Customer";
  const account = "TESTACC999";
  const password = "testpass123";

  test("full registration flow", async ({ page }) => {
    await page.goto("/customer/register");

    await page.locator("#name").fill(name);
    await page.locator("#mobile").fill(mobile);
    await page.locator("#accountNumber").fill(account);
    await page.locator("#password").fill(password);
    await page.locator("#confirmPassword").fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL("/customer", { timeout: 10000 });
    await expect(page.locator("h1")).toContainText(`Welcome, ${name}`);
    await expect(page.getByText(account)).toBeVisible();
  });

  test("duplicate registration fails", async ({ page }) => {
    await page.goto("/customer/register");
    await page.evaluate(() => localStorage.removeItem("vibgyor-customer"));
    await page.goto("/customer/register");

    await page.locator("#name").fill(name);
    await page.locator("#mobile").fill(mobile);
    await page.locator("#accountNumber").fill(account);
    await page.locator("#password").fill(password);
    await page.locator("#confirmPassword").fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText("Mobile number already registered")).toBeVisible();
  });

  test("logout and login flow", async ({ page }) => {
    // Login first
    await page.goto("/customer/login");
    await page.locator("#mobile").fill(mobile);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /login/i }).click();

    // Should be on dashboard
    await expect(page).toHaveURL("/customer", { timeout: 10000 });
    await expect(page.locator("h1")).toContainText(`Welcome, ${name}`);

    // Logout
    await page.getByRole("button", { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/customer\/login/);

    // Login again
    await page.locator("#mobile").fill(mobile);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /login/i }).click();
    await expect(page).toHaveURL("/customer", { timeout: 10000 });
    await expect(page.locator("h1")).toContainText(`Welcome, ${name}`);
  });

  test("dashboard shows correct nav when logged in", async ({ page }) => {
    await page.goto("/customer/login");
    await page.locator("#mobile").fill(mobile);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /login/i }).click();
    await expect(page).toHaveURL("/customer", { timeout: 10000 });

    // Header should show Dashboard, New Request, Track, and Logout
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(header.getByRole("link", { name: /new request/i })).toBeVisible();
    await expect(header.getByRole("link", { name: /track/i })).toBeVisible();
    await expect(header.getByRole("button", { name: /logout/i })).toBeVisible();
  });

  test("already logged-in user is redirected from login to dashboard", async ({ page }) => {
    await page.goto("/customer/login");
    await page.locator("#mobile").fill(mobile);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /login/i }).click();
    await expect(page).toHaveURL("/customer", { timeout: 10000 });

    // Try navigating to login — should redirect back to dashboard
    await page.goto("/customer/login");
    await expect(page).toHaveURL("/customer", { timeout: 10000 });
  });
});

test.describe("Customer Service Request Flow", () => {
  const mobile = uniqueMobile();
  const name = "Request Tester";
  const account = "REQACC001";
  const password = "reqpass123";
  async function ensureLoggedIn(page: import("@playwright/test").Page) {
    // Clear session
    await page.goto("/customer/login");
    await page.evaluate(() => localStorage.removeItem("vibgyor-customer"));
    await page.goto("/customer/login");

    await page.locator("#mobile").fill(mobile);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /login/i }).click();

    // Wait for either redirect to dashboard or error message
    const dashboardUrl = /\/customer$/;
    const result = await Promise.race([
      page.waitForURL(dashboardUrl, { timeout: 10000 }).then(() => "success" as const),
      page.getByText("Invalid mobile number or password").waitFor({ timeout: 10000 }).then(() => "error" as const),
    ]);

    if (result === "error") {
      // Not registered yet — register
      await page.goto("/customer/register");
      await page.locator("#name").fill(name);
      await page.locator("#mobile").fill(mobile);
      await page.locator("#accountNumber").fill(account);
      await page.locator("#password").fill(password);
      await page.locator("#confirmPassword").fill(password);
      await page.getByRole("button", { name: /create account/i }).click();

      // Registration inserts to DB + redirects — give it enough time
      try {
        await page.waitForURL(dashboardUrl, { timeout: 15000 });
      } catch {
        // If redirect didn't happen, manually navigate after registration succeeded
        await page.goto("/customer/login");
        await page.locator("#mobile").fill(mobile);
        await page.locator("#password").fill(password);
        await page.getByRole("button", { name: /login/i }).click();
        await page.waitForURL(dashboardUrl, { timeout: 10000 });
      }
    }
  }

  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("new request page loads with pre-filled customer info", async ({ page }) => {
    await page.goto("/customer/new-request");
    await expect(page.locator("h1")).toContainText("New Service Request");

    // Click a service card (Balance Enquiry)
    await page.getByText("Check your account balance").click();

    // Form should have pre-filled read-only fields
    const nameInput = page.locator("#customerName");
    await expect(nameInput).toHaveValue(name);
    await expect(nameInput).toHaveAttribute("readonly", "");

    const mobileInput = page.locator("#customerMobile");
    await expect(mobileInput).toHaveValue(mobile);
    await expect(mobileInput).toHaveAttribute("readonly", "");

    const accountInput = page.locator("#accountNumber");
    await expect(accountInput).toHaveValue(account);
    await expect(accountInput).toHaveAttribute("readonly", "");
  });

  test("submit a service request and see it in dashboard", async ({ page }) => {
    await page.goto("/customer/new-request");

    // Click Balance Enquiry
    await page.getByText("Check your account balance").click();

    // Submit the form (fields are pre-filled)
    await page.getByRole("button", { name: /submit request/i }).click();

    // Confirmation dialog should show
    await expect(page.getByText("Request Submitted!")).toBeVisible();
    const refNumber = await page.locator(".font-mono.tracking-wider").textContent();
    expect(refNumber).toMatch(/^VBG-\d{4}-\d{5}$/);

    // Click "My Requests" to go to dashboard
    await page.getByRole("link", { name: /my requests/i }).click();
    await expect(page).toHaveURL("/customer", { timeout: 10000 });

    // Ticket should appear in the dashboard
    await expect(page.getByText("Balance Enquiry")).toBeVisible();
    await expect(page.getByText(refNumber!)).toBeVisible();
  });

  test("click ticket in dashboard opens detail page", async ({ page }) => {
    // First create a ticket
    await page.goto("/customer/new-request");
    await page.getByText("Request passbook update").click();
    await page.getByRole("button", { name: /submit request/i }).click();
    await expect(page.getByText("Request Submitted!")).toBeVisible();
    await page.getByRole("link", { name: /my requests/i }).click();
    await expect(page).toHaveURL("/customer", { timeout: 10000 });

    // Click on the Passbook Request ticket
    await page.getByText("Passbook Request").first().click();
    await expect(page).toHaveURL(/\/customer\/ticket\//);

    // Detail page should show ticket info
    await expect(page.getByText("Passbook Request")).toBeVisible();
    await expect(page.getByRole("main").getByText(name)).toBeVisible();
    await expect(page.getByRole("main").getByText(account)).toBeVisible();

    // Back to Dashboard link should work
    await page.getByRole("link", { name: /back to dashboard/i }).click();
    await expect(page).toHaveURL("/customer", { timeout: 10000 });
  });

  test("track page shows 'Back to Dashboard' when logged in", async ({ page }) => {
    await page.goto("/customer/track");
    await expect(page.getByText("Back to Dashboard")).toBeVisible();
  });

  test("dashboard stats update after creating requests", async ({ page }) => {
    // Check stats — count ticket rows before
    await page.goto("/customer");
    const ticketsBefore = await page.locator("a[href^='/customer/ticket/']").count();

    // Create a new request
    await page.goto("/customer/new-request");
    await page.getByText("Check registered mobile").click();
    await page.getByRole("button", { name: /submit request/i }).click();
    await expect(page.getByText("Request Submitted!")).toBeVisible();
    await page.getByRole("link", { name: /my requests/i }).click();
    await expect(page).toHaveURL("/customer", { timeout: 10000 });

    // Should have one more ticket row
    const ticketsAfter = await page.locator("a[href^='/customer/ticket/']").count();
    expect(ticketsAfter).toBeGreaterThan(ticketsBefore);
  });
});
