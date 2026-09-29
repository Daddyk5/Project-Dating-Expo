// End-to-end (web): two real users sign up → onboard → find each other → match → chat.
//
// Needs the API (npm run dev:api), the Expo web dev server on :8081 (npm run dev:app),
// Ollama for the AI features, and Chromium: npx playwright install chromium
// Run: npm run e2e   (screenshots land in e2e/screenshots/)
// The test deletes both accounts through the app at the end.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
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
  await page.getByLabel("Password (8+ characters)").fill(PASSWORD);
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

/** Pass on everyone until `target` is the top card, then like them. */
async function findAndLike(page, me, target) {
  for (let i = 0; i < 60; i++) {
    const card = page.getByRole("slider").first();
    await card.waitFor({ timeout: 30000 });
    const label = (await card.getAttribute("aria-label")) ?? "";
    if (label.startsWith(`${target.name},`)) {
      log(`[${me.name}] found ${target.name} after ${i} passes: "${label}"`);
      return;
    }
    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction((prev) => {
      const el = document.querySelector('[role="slider"]');
      return !el || el.getAttribute("aria-label") !== prev;
    }, label, { timeout: 15000 });
  }
  throw new Error(`${me.name} never saw ${target.name} in Discover`);
}

const browser = await chromium.launch();
try {
  const b = await newUser(browser, B, { dark: true });
  await signUpAndOnboard(b.page, B);
  const a = await newUser(browser, A);
  await signUpAndOnboard(a.page, A, { testUnderage: true });

  // Discover: A finds Bianca and likes her (card preview first)
  await findAndLike(a.page, A, B);
  await a.page.waitForTimeout(1500); // let the AI compatibility line load
  await snap(a.page, "discover-card-with-compat");
  await a.page.keyboard.press("ArrowRight");
  await a.page.waitForTimeout(1500);
  log(`[${A.name}] liked ${B.name} (no match yet)`);

  // Bianca finds Andre and likes him back → It's a Match!
  await b.page.reload();
  await b.page.getByRole("button", { name: "Like", exact: true }).waitFor();
  await findAndLike(b.page, B, A);
  await b.page.getByRole("button", { name: "Like", exact: true }).click();
  await b.page.getByText("It’s a Match!").waitFor({ timeout: 20000 });
  log(`[${B.name}] IT'S A MATCH`);
  await b.page.waitForTimeout(800);
  await snap(b.page, "its-a-match-dark");

  // Send a message → chat with AI icebreakers pre-filled
  await b.page.getByRole("button", { name: "Send a message" }).click();
  const t0 = Date.now();
  const firstIdea = b.page.getByRole("button", { name: /^Use icebreaker:/ }).first();
  await firstIdea.waitFor({ timeout: 90000 });
  log(`[${B.name}] icebreakers loaded in ${Date.now() - t0} ms:`, await b.page.getByRole("button", { name: /^Use icebreaker:/ }).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label").replace("Use icebreaker: ", ""))));
  await snap(b.page, "chat-icebreakers-dark");
  await firstIdea.click();
  const opener = await b.page.getByRole("textbox", { name: "Message", exact: true }).inputValue();
  await b.page.getByRole("button", { name: "Send message" }).click();
  log(`[${B.name}] sent: "${opener}"`);

  // Andre: new match appears via socket; open the chat
  await a.page.getByRole("tab", { name: /Matches/ }).or(a.page.getByRole("button", { name: /Matches/ })).first().click();
  await a.page.getByRole("button", { name: new RegExp(`^Chat with ${B.name}`) }).click({ timeout: 30000 });
  await a.page.getByText(opener).last().waitFor({ timeout: 20000 });
  log(`[${A.name}] received the opener in the chat`);

  // Read receipt: Bianca sees "Seen" once Andre opened the chat
  await b.page.getByText("Seen", { exact: true }).waitFor({ timeout: 20000 });
  log(`[${B.name}] read receipt shown ("Seen")`);

  // Typing indicator: Andre types, Bianca sees "typing…"
  await a.page.getByRole("textbox", { name: "Message", exact: true }).pressSequentially("Haha yes! ", { delay: 40 });
  await b.page.getByText("typing…").waitFor({ timeout: 10000 });
  log(`[${B.name}] sees typing indicator`);
  await a.page.getByRole("textbox", { name: "Message", exact: true }).pressSequentially("Best dive spot I know is off Samal island. You?", { delay: 10 });
  await a.page.getByRole("button", { name: "Send message" }).click();
  await b.page.getByText("Best dive spot I know is off Samal island. You?").last().waitFor({ timeout: 20000 });
  log(`[${B.name}] received reply in real time (no reload)`);

  // Safety: a scam message is held behind a warning for the recipient
  await b.page.getByRole("textbox", { name: "Message", exact: true }).fill("Can you send me 5000 pesos via GCash? My wallet got stolen, I'll pay you back");
  await b.page.getByRole("button", { name: "Send message" }).click();
  await a.page.getByText("This message may be unsafe").last().waitFor({ timeout: 30000 });
  log(`[${A.name}] sees "This message may be unsafe" warning`);
  await snap(a.page, "chat-unsafe-warning");
  await snap(b.page, "chat-sender-view-dark");

  // Desktop layout: sidebar with matches list ≥ 1024px
  await a.page.setViewportSize({ width: 1280, height: 800 });
  await a.page.goto(APP);
  await a.page.getByRole("button", { name: "Like", exact: true }).waitFor({ timeout: 30000 });
  await a.page.waitForTimeout(1500);
  await snap(a.page, "desktop-discover-sidebar");
  await a.page.getByRole("tab", { name: "Nearby" }).click();
  await a.page.waitForTimeout(2500);
  await snap(a.page, "desktop-people-nearby");

  // Delete account (app-store requirement) for both test users
  for (const [u, s] of [[A, a], [B, b]]) {
    await s.page.goto(`${APP}/profile`);
    await s.page.getByRole("button", { name: "Delete my account permanently" }).click();
    await s.page.getByRole("button", { name: "Create account" }).waitFor({ timeout: 30000 });
    log(`[${u.name}] account deleted → back at welcome`);
  }
  log("E2E PASSED");
} catch (e) {
  log("E2E FAILED:", e.message);
  for (const [i, c] of browser.contexts().entries()) for (const p of c.pages()) await p.screenshot({ path: out(`fail-${i}.png`) }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
