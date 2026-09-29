// End-to-end (web): Likes you → like back, Blocked people, Change password,
// Reset password link states, and the 404 page. Same prerequisites as signup-to-chat.mjs.
// Run: npm run e2e:features   (both test accounts are deleted at the end, pass or fail)
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { deflateSync, crc32 } from "node:zlib";

const APP = process.env.APP_URL ?? "http://localhost:8081";
const OUT = new URL("./screenshots/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const out = (name) => fileURLToPath(new URL(name, OUT));
const ts = Date.now().toString().slice(-6);
const A = { name: "Andre", email: `e2e-a-${ts}@example.com`, gender: "Man", showMe: "Women", lat: 7.0731, lng: 125.6128, color: [40, 90, 200] };
const B = { name: "Bianca", email: `e2e-b-${ts}@example.com`, gender: "Woman", showMe: "Men", lat: 7.0795, lng: 125.6155, color: [220, 60, 120] };
const PASSWORD = "E2e-pass-12345";
let shot = 1;
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

function png(path, [r, g, b], w = 300, h = 400) {
  const chunk = (t, d) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
    const td = Buffer.concat([Buffer.from(t), d]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, c]);
  };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = y * (w * 3 + 1) + 1 + x * 3;
    const shade = ((x >> 5) + (y >> 5)) % 2 ? 1 : 0.8;
    raw[o] = r * shade; raw[o + 1] = g * shade; raw[o + 2] = b * shade;
  }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  writeFileSync(out(path), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
  return out(path);
}

async function snap(page, label) {
  const file = `${String(shot++).padStart(2, "0")}-${label}.png`;
  await page.screenshot({ path: out(file) });
  log("screenshot", file);
}

async function newUser(browser, u, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 420, height: 860 },
    geolocation: { latitude: u.lat, longitude: u.lng },
    permissions: ["geolocation"],
    colorScheme: opts.dark ? "dark" : "light",
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => log(`[${u.name}] PAGEERROR`, e.message));
  page.on("dialog", (d) => d.accept());
  return { ctx, page };
}

async function signUpAndOnboard(page, u, { testUnderage = false } = {}) {
  await page.goto(APP);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("First name").fill(u.name);
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("checkbox", { name: "I confirm I am 18 or older" }).click();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  log(`[${u.name}] signed up`);

  // Name (prefilled from the account)
  await page.getByText("What's your first name?").waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "Continue" }).click();

  // Birthdate
  await page.getByLabel("Month").fill("03");
  await page.getByLabel("Day").fill("14");
  if (testUnderage) {
    await page.getByLabel("Year").fill("2012");
    await page.getByRole("alert").filter({ hasText: "You must be 18 or older" }).waitFor();
    const disabled = await page.getByRole("button", { name: "Continue" }).isDisabled();
    log(`[${u.name}] under-18 blocked in UI: continue disabled = ${disabled}`);
    await snap(page, "onboarding-under-18-blocked");
  }
  await page.getByLabel("Year").fill(u.gender === "Man" ? "1996" : "1998");
  await page.getByRole("button", { name: "Continue" }).click();

  // Gender + show me
  await page.getByRole("checkbox", { name: u.gender, exact: true }).click();
  await page.getByRole("checkbox", { name: u.showMe, exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Photos: real uploads through presigned URLs to the Neon bucket
  await page.getByText("Add your photos").waitFor({ timeout: 30000 });
  for (let i = 0; i < 2; i++) {
    const file = png(`photo-${u.name}-${i}.png`, u.color.map((c) => Math.min(255, c + i * 30)));
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Add a photo" }).click()]);
    await chooser.setFiles(file);
    await page.getByLabel(new RegExp(`^Photo ${i + 1}`)).waitFor({ timeout: 60000 });
    log(`[${u.name}] uploaded photo ${i + 1}`);
  }
  if (testUnderage) await snap(page, "onboarding-photos");
  await page.getByRole("button", { name: "Continue" }).click();

  // Interests
  for (const i of ["Diving", "Coffee", "Hiking", "Karaoke"]) await page.getByRole("checkbox", { name: i, exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Bio + AI polish (Ollama)
  const draft = u.gender === "Man"
    ? "i like diving and coffee. from davao, work in IT. looking for someone chill to go island hopping with"
    : "nurse in davao, love karaoke nights and hiking on weekends. coffee first always";
  await page.getByRole("textbox", { name: /Bio/ }).fill(draft);
  if (testUnderage) {
    const t0 = Date.now();
    await page.getByRole("button", { name: "Polish my bio with AI" }).click();
    await page.getByText("Suggestion 1 · tap to use").waitFor({ timeout: 90000 });
    log(`[${u.name}] AI bio polish returned in ${Date.now() - t0} ms`);
    await snap(page, "onboarding-bio-ai-polish");
    await page.getByRole("button", { name: /^Use suggestion 1/ }).click();
  }
  await page.getByRole("button", { name: "Continue" }).click();

  // Location (browser geolocation)
  await page.getByRole("button", { name: "Share my location" }).click();
  await page.getByRole("button", { name: "Start swiping" }).click();
  await page.getByRole("button", { name: "Like", exact: true }).waitFor({ timeout: 60000 });
  log(`[${u.name}] onboarding complete → Discover`);
}

const env = Object.fromEntries(readFileSync(new URL("../apps/app/.env", import.meta.url), "utf8").split(/\r?\n/).filter((l) => /^\w+=/.test(l)).map((l) => l.split(/=(.*)/s).slice(0, 2)));
const AUTH = env.EXPO_PUBLIC_NEON_AUTH_URL.replace(/\/$/, ""), API = env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
const call = (page, method, path, body) => page.evaluate(async ([AUTH, API, method, path, body]) => {
  const { token } = await (await fetch(`${AUTH}/token`, { credentials: "include" })).json();
  const r = await fetch(API + path, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return r.status === 204 ? null : r.json();
}, [AUTH, API, method, path, body]);

const browser = await chromium.launch();
const made = [];
try {
  const b = await newUser(browser, B); made.push(b);
  b.page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) log("[B] CONSOLE", m.text().slice(0, 200)); });
  await signUpAndOnboard(b.page, B);
  const a = await newUser(browser, A, { dark: true }); made.push(a);
  await signUpAndOnboard(a.page, A);
  const bMe = await call(b.page, "GET", "/me");
  log("A superlikes B:", JSON.stringify(await call(a.page, "POST", "/swipes", { targetId: bMe.id, action: "superlike" })));

  // Likes banner on Matches → Likes you → like back → match
  await b.page.goto(`${APP}/matches`);
  await b.page.getByRole("button", { name: /(people like|person likes) you/ }).waitFor({ timeout: 20000 });
  await snap(b.page, "matches-likes-banner");
  await b.page.getByRole("button", { name: /(people like|person likes) you/ }).click();
  await b.page.getByRole("button", { name: `Like ${A.name} back` }).waitFor({ timeout: 20000 });
  await b.page.waitForTimeout(1000);
  await snap(b.page, "likes-you");
  await b.page.getByRole("button", { name: `Like ${A.name} back` }).click();
  await b.page.getByText("It’s a Match!").waitFor({ timeout: 20000 });
  log("[B] liked back from Likes you → IT'S A MATCH");
  await b.page.goto(`${APP}/likes`);
  await b.page.getByRole("button", { name: `Like ${A.name} back` }).waitFor({ state: "detached", timeout: 20000 });
  log("[B] Andre is no longer in Likes you");

  // Blocked people: block via API, unblock in the UI
  const aMe = await call(a.page, "GET", "/me");
  await call(b.page, "POST", "/blocks", { userId: aMe.id });
  await b.page.goto(`${APP}/settings`);
  await b.page.getByRole("button", { name: /^Blocked people/ }).click();
  await b.page.getByRole("button", { name: `Unblock ${A.name}` }).waitFor({ timeout: 20000 });
  await snap(b.page, "blocked-people");
  await b.page.getByRole("button", { name: `Unblock ${A.name}` }).click();
  await b.page.getByText("You haven’t blocked anyone").waitFor({ timeout: 20000 });
  log("[B] unblocked Andre from Blocked people");

  // Change password (A, dark)
  await a.page.goto(`${APP}/settings`);
  await a.page.getByRole("button", { name: /^Change password/ }).click();
  await a.page.getByLabel("Current password").fill("wrong-password-1");
  await a.page.getByLabel("New password", { exact: true }).fill("New-pass-67890!");
  await a.page.getByLabel("Confirm new password").fill("New-pass-67890!");
  await a.page.getByRole("button", { name: "Change password", exact: true }).click();
  await a.page.waitForTimeout(2500);
  log("[A] wrong current password →", (await a.page.getByRole("alert").allInnerTexts().catch(() => [])).join(" | ") || "(no alert role)");
  await a.page.getByLabel("Current password").fill(PASSWORD);
  await a.page.getByRole("button", { name: "Change password", exact: true }).click();
  await a.page.getByText(/Password changed/).waitFor({ timeout: 20000 });
  await snap(a.page, "change-password-dark");
  log("[A] password changed");

  // Signed-out screens
  const guest = await newUser(browser, { name: "guest", lat: 7, lng: 125 }); made.push(guest);
  await guest.page.goto(`${APP}/reset-password`);
  await guest.page.getByText("This link has expired").waitFor({ timeout: 20000 });
  await snap(guest.page, "reset-password-no-token");
  await guest.page.goto(`${APP}/reset-password?token=bogus-token`);
  await guest.page.getByLabel("New password", { exact: true }).fill("Another-pass-1!");
  await guest.page.getByLabel("Confirm new password").fill("Another-pass-1!");
  await guest.page.getByRole("button", { name: "Update password" }).click();
  await guest.page.getByText("This link has expired").waitFor({ timeout: 20000 });
  await snap(guest.page, "reset-password-bad-token");
  await guest.page.goto(`${APP}/this/does-not-exist`);
  await guest.page.getByText("This page wandered off").waitFor({ timeout: 20000 });
  await snap(guest.page, "not-found");
  log("guest screens OK");
  log("NEW SCREENS PASSED");
} catch (e) {
  log("FAILED:", e.message.split("\n")[0]);
  for (const [i, c] of browser.contexts().entries()) for (const p of c.pages()) await p.screenshot({ path: out(`fail-${i}.png`) }).catch(() => {});
  process.exitCode = 1;
} finally {
  for (const u of made.slice(0, 2)) {
    const r = await call(u.page, "DELETE", "/me").then(() => "deleted", (e) => "DELETE FAILED " + e.message);
    log("cleanup:", r);
  }
  await browser.close();
}
