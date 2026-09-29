// Captures the README screenshots into docs/screenshots/ by walking the real app:
// two showcase users onboard, match through "Likes you", chat with AI icebreakers,
// and trigger a safety warning. Both accounts are deleted at the end, pass or fail.
// Needs the API, Expo web on :8081 and Ollama running. Run: npm run screenshots
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const APP = process.env.APP_URL ?? "http://localhost:8081";
const OUT = new URL("../docs/screenshots/", import.meta.url);
const TMP = new URL("./screenshots/", import.meta.url);
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const ts = Date.now().toString().slice(-6);
const PASSWORD = "Showcase-pass-12345";

const env = Object.fromEntries(
  readFileSync(new URL("../apps/app/.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^\w+=/.test(l))
    .map((l) => l.split(/=(.*)/s).slice(0, 2)),
);
const AUTH = env.EXPO_PUBLIC_NEON_AUTH_URL.replace(/\/$/, "");
const API = env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");

const MAYA = {
  name: "Maya",
  email: `showcase-maya-${ts}@example.com`,
  gender: "Woman",
  showMe: "Men",
  lat: 7.0795,
  lng: 125.6155,
  dark: false,
  avatars: ["lorelei/png?seed=maya-kxq&backgroundColor=ffd5dc", "lorelei/png?seed=maya-kxq-2&backgroundColor=c0aede"],
  interests: ["Diving", "Coffee", "Hiking", "Karaoke", "Travel"],
  bio: "Nurse by day, karaoke queen by night. Weekends are for hiking trails and hunting down the best coffee in Davao. Looking for someone who can keep up on the trail and on the mic.",
};
const MARCO = {
  name: "Marco",
  email: `showcase-marco-${ts}@example.com`,
  gender: "Man",
  showMe: "Women",
  lat: 7.0731,
  lng: 125.6128,
  dark: true,
  avatars: ["adventurer/png?seed=marco-kxq&backgroundColor=b6e3f4", "adventurer/png?seed=marco-kxq-2&backgroundColor=d1d4f9"],
  interests: ["Diving", "Coffee", "Hiking", "Photography"],
  bio: "Software dev from Davao. I dive off Samal whenever I can and I take my coffee way too seriously. Tell me your favourite dive spot.",
};

async function avatarFiles(u) {
  return Promise.all(
    u.avatars.map(async (a, i) => {
      const res = await fetch(`https://api.dicebear.com/9.x/${a}&size=512`);
      if (!res.ok) throw new Error(`DiceBear ${res.status}`);
      const path = fileURLToPath(new URL(`avatar-${u.name}-${i}.png`, TMP));
      writeFileSync(path, Buffer.from(await res.arrayBuffer()));
      return path;
    }),
  );
}

async function shot(page, name) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, OUT)) });
  log("screenshot", name);
}

const call = (page, method, path, body) =>
  page.evaluate(
    async ([AUTH, API, method, path, body]) => {
      const { token } = await (await fetch(`${AUTH}/token`, { credentials: "include" })).json();
      const r = await fetch(API + path, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      return r.status === 204 ? null : r.json();
    },
    [AUTH, API, method, path, body],
  );

async function context(browser, u, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    geolocation: u ? { latitude: u.lat, longitude: u.lng } : undefined,
    permissions: u ? ["geolocation"] : [],
    colorScheme: u?.dark ? "dark" : "light",
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => log("PAGEERROR", e.message));
  page.on("dialog", (d) => d.accept());
  return page;
}

async function onboard(page, u, { capture = false } = {}) {
  const photos = await avatarFiles(u);
  await page.goto(APP);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("First name").fill(u.name);
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("checkbox", { name: "I confirm I am 18 or older" }).click();
  if (capture) await shot(page, "sign-up");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByText("What's your first name?").waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Month").fill("03");
  await page.getByLabel("Day").fill("14");
  await page.getByLabel("Year").fill(u.gender === "Man" ? "1996" : "1998");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("checkbox", { name: u.gender, exact: true }).click();
  await page.getByRole("checkbox", { name: u.showMe, exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Add your photos").waitFor({ timeout: 30000 });
  for (let i = 0; i < photos.length; i++) {
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Add a photo" }).click()]);
    await chooser.setFiles(photos[i]);
    await page.getByLabel(new RegExp(`^Photo ${i + 1}`)).waitFor({ timeout: 60000 });
  }
  if (capture) await shot(page, "onboarding-photos");
  await page.getByRole("button", { name: "Continue" }).click();
  for (const i of u.interests) await page.getByRole("checkbox", { name: i, exact: true }).click();
  if (capture) await shot(page, "onboarding-interests");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("textbox", { name: /Bio/ }).fill(u.bio);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Share my location" }).click();
  await page.getByRole("button", { name: "Start swiping" }).click();
  await page.getByRole("button", { name: "Like", exact: true }).waitFor({ timeout: 60000 });
  log(`[${u.name}] onboarded`);
}

/**
 * Pass on leftover test accounts (API fixtures named "Test xxxx", e2e users with
 * placeholder photos) so the deck shows a real-looking profile. `keep` is the showcase partner.
 */
async function cleanTopCard(page, keep) {
  for (let i = 0; i < 80; i++) {
    const label = (await page.getByRole("slider").first().getAttribute("aria-label", { timeout: 30000 })) ?? "";
    const leftover = label.startsWith("Test ") || (/^(Andre|Bianca),/.test(label) && !label.startsWith(`${keep},`));
    if (!leftover) return label;
    await page.getByRole("button", { name: "Pass", exact: true }).click();
    await page.waitForTimeout(700);
  }
  return "(gave up)";
}

const browser = await chromium.launch();
const users = [];
try {
  // Signed out
  const guest = await context(browser, null);
  await guest.goto(APP);
  await guest.getByRole("button", { name: "Create account" }).waitFor();
  await shot(guest, "welcome");
  await guest.goto(`${APP}/sign-in`);
  await shot(guest, "sign-in");

  const maya = await context(browser, MAYA);
  users.push(maya);
  await onboard(maya, MAYA, { capture: true });
  const marco = await context(browser, MARCO);
  users.push(marco);
  await onboard(marco, MARCO);

  // Hide leftover test accounts from Maya's deck and Nearby by blocking them. Blocks belong
  // to Maya, so they disappear with her account at the end; nobody else's data is touched.
  const marcoMe = await call(marco, "GET", "/me");
  for (let round = 0; round < 5; round++) {
    const seen = [
      ...(await call(maya, "GET", "/nearby?limit=50")).profiles,
      ...(await call(maya, "GET", "/discover?limit=50")).profiles,
      ...(await call(maya, "GET", "/likes?limit=50")).likes.map((l) => l.profile),
    ];
    const junk = [...new Set(seen.filter((p) => !p.isDemo && p.id !== marcoMe.id).map((p) => p.id))];
    if (!junk.length) break;
    for (const id of junk) await call(maya, "POST", "/blocks", { userId: id });
    log(`hid ${junk.length} leftover test profiles`);
  }

  // Discover with the AI compatibility line
  await maya.reload();
  log("top card:", await cleanTopCard(maya, MARCO.name));
  await maya.waitForTimeout(4000);
  await shot(maya, "discover");
  await maya.getByRole("button", { name: "View full profile" }).click();
  await maya.waitForTimeout(3000);
  await shot(maya, "profile-detail");
  await maya.goto(APP);

  await maya.getByRole("tab", { name: /Nearby/ }).click();
  await maya.waitForTimeout(3000);
  await shot(maya, "nearby");

  // Andre super likes Maya → she sees him in Likes you → match
  const mayaMe = await call(maya, "GET", "/me");
  await call(marco, "POST", "/swipes", { targetId: mayaMe.id, action: "superlike" });
  await maya.goto(`${APP}/matches`);
  await maya.getByRole("button", { name: /(people like|person likes) you/ }).click();
  await maya.getByRole("button", { name: `Like ${MARCO.name} back` }).waitFor({ timeout: 20000 });
  await maya.waitForTimeout(1500);
  await shot(maya, "likes-you");
  await maya.getByRole("button", { name: `Like ${MARCO.name} back` }).click();
  await maya.getByText("It’s a Match!").waitFor({ timeout: 20000 });
  await maya.waitForTimeout(1200);
  await shot(maya, "its-a-match");

  // Chat: AI icebreakers, live replies, safety warning
  await maya.getByRole("button", { name: "Send a message" }).click();
  const idea = maya.getByRole("button", { name: /^Use icebreaker:/ }).first();
  await idea.waitFor({ timeout: 90000 });
  await shot(maya, "chat-icebreakers");
  await idea.click();
  await maya.getByRole("button", { name: "Send message" }).click();
  await marco.goto(`${APP}/matches`);
  await marco.getByRole("button", { name: new RegExp(`^Chat with ${MAYA.name}`) }).click({ timeout: 30000 });
  await marco.getByRole("textbox", { name: "Message", exact: true }).fill("Haha yes! Best dive spot I know is off Samal island. Coffee after?");
  await marco.getByRole("button", { name: "Send message" }).click();
  await maya.getByText("Coffee after?").last().waitFor({ timeout: 20000 });
  await maya.getByRole("textbox", { name: "Message", exact: true }).fill("Deal ☕ Saturday morning works for me");
  await maya.getByRole("button", { name: "Send message" }).click();
  await marco.getByText("Saturday morning works").last().waitFor({ timeout: 20000 });
  await shot(maya, "chat");
  await shot(marco, "chat-dark");
  await marco.getByRole("textbox", { name: "Message", exact: true }).fill("Can you send me 5000 pesos via GCash? My wallet got stolen, I'll pay you back");
  await marco.getByRole("button", { name: "Send message" }).click();
  await maya.getByText("This message may be unsafe").last().waitFor({ timeout: 45000 });
  await shot(maya, "chat-safety-warning");

  // Tabs & settings
  await maya.goto(`${APP}/matches`);
  await maya.waitForTimeout(2500);
  await shot(maya, "matches");
  await maya.goto(`${APP}/profile`);
  await maya.waitForTimeout(2500);
  await shot(maya, "profile");
  await maya.goto(`${APP}/settings`);
  await shot(maya, "settings");
  await maya.goto(`${APP}/premium`);
  await shot(maya, "premium");
  await maya.goto(`${APP}/safety`);
  await shot(maya, "safety");

  // Desktop web: sidebar layout
  await maya.setViewportSize({ width: 1440, height: 900 });
  await maya.goto(APP);
  await maya.getByRole("button", { name: "Like", exact: true }).waitFor({ timeout: 30000 });
  log("desktop top card:", await cleanTopCard(maya, "(none)"));
  await maya.waitForTimeout(3500);
  await shot(maya, "desktop-discover");
  await maya.getByRole("tab", { name: "Nearby" }).click();
  await maya.waitForTimeout(3000);
  await shot(maya, "desktop-nearby");
  log("SCREENSHOTS DONE");
} catch (e) {
  log("FAILED:", e.message.split("\n")[0]);
  for (const [i, c] of browser.contexts().entries())
    for (const p of c.pages()) await p.screenshot({ path: fileURLToPath(new URL(`fail-${i}.png`, TMP)) }).catch(() => {});
  process.exitCode = 1;
} finally {
  for (const page of users) log("cleanup:", await call(page, "DELETE", "/me").then(() => "deleted", (e) => "DELETE FAILED " + e.message));
  await browser.close();
}
