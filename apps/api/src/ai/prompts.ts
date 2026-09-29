import { z } from "zod";
import { MAX_BIO } from "@kxq/shared";

/** Profile facts we let the model see. Never include email, location or photos. */
export interface ProfileFacts {
  name: string;
  age: number;
  bio: string;
  interests: string[];
  city: string | null;
}

const describe = (p: ProfileFacts) =>
  [
    `Name: ${p.name}`,
    `Age: ${p.age}`,
    p.city ? `City: ${p.city}` : null,
    `Interests: ${p.interests.join(", ") || "(none listed)"}`,
    `Bio: ${p.bio.trim() || "(empty)"}`,
  ]
    .filter(Boolean)
    .join("\n");

// ---------- Icebreakers ----------

export const icebreakersOutput = z.object({
  icebreakers: z.array(z.string().min(5).max(160)).length(3),
});

export const icebreakers = {
  system: `You help people on a dating app start a friendly first conversation.
Write exactly 3 short opening messages the SENDER could send to the RECIPIENT.
Rules:
- Each opener is one or two sentences, under 160 characters, and ends with a question.
- Base every opener on something specific: a shared interest, or a detail from the recipient's bio.
- Warm, curious and respectful. No pickup lines, no compliments about looks, nothing sexual or suggestive.
- Do not invent facts that are not in the profiles.
- Write in English. No emojis except at most one per opener.
Respond with JSON only: {"icebreakers": ["...", "...", "..."]}`,
  prompt: (sender: ProfileFacts, recipient: ProfileFacts, shared: string[]) =>
    `SENDER\n${describe(sender)}\n\nRECIPIENT\n${describe(recipient)}\n\nShared interests: ${
      shared.join(", ") || "(none)"
    }`,
};

// ---------- Bio polish ----------

export const bioPolishOutput = z.object({
  versions: z.array(z.string().min(10).max(MAX_BIO)).length(2),
});

export const bioPolish = {
  system: `You edit dating profile bios.
Rewrite the user's draft bio in two different ways.
Rules:
- Keep the user's voice, tone and every fact they stated. Never add facts, jobs, hobbies, places or numbers that are not in the draft.
- Fix capitalization, grammar and punctuation, and make it flow; you may reorder and trim.
- Write in first person as the user. Do not wrap the bio in quotation marks.
- Each version must be under ${MAX_BIO} characters and must read differently from the draft.
- Version 1: close to the original, just cleaner. Version 2: a bit more playful.
- Nothing sexual. No hashtags.
Example
Draft: "love hiking n coffee. nurse in cebu. looking for someone to explore with"
Output: {"versions": ["Nurse in Cebu who loves hiking and good coffee. Looking for someone to explore with.", "Cebu-based nurse by day, trail and coffee hunter on weekends. Want to explore together?"]}
Respond with JSON only: {"versions": ["...", "..."]}`,
  prompt: (draft: string) => `Draft bio:\n"""\n${draft}\n"""`,
};

// ---------- Compatibility ----------

/** Must fit two lines on a phone card; longer output is rejected and retried. */
export const COMPAT_MAX = 90;

export const compatibilityOutput = z.object({
  summary: z.string().trim().min(10).max(COMPAT_MAX),
});

export const compatibility = {
  system: `You write one friendly sentence for a dating app profile card that tells the VIEWER what they have in common with the PROFILE they are looking at.
Rules:
- One short sentence of at most 90 characters, addressed to the viewer as "you" (e.g. "You both love diving and weekend road trips."). Count carefully; longer replies are rejected.
- Mention only things that are actually shared or clearly related. Never invent facts.
- If little is shared, point out one genuine, related detail kindly.
- No judgments about attractiveness, nothing sexual, no percentages or scores.
Respond with JSON only: {"summary": "..."}`,
  prompt: (viewer: ProfileFacts, profile: ProfileFacts, shared: string[]) =>
    `VIEWER\n${describe(viewer)}\n\nPROFILE\n${describe(profile)}\n\nShared interests: ${shared.join(", ") || "(none)"}`,
};

// ---------- Message safety ----------

export const safetyOutput = z.object({
  flagged: z.boolean(),
  category: z.enum(["none", "harassment", "scam", "explicit"]),
  reason: z.string().max(200),
});

export const messageSafety = {
  system: `You are a safety filter for private messages between two adults on a dating app.
Decide if a single message should be held with a warning for the recipient.
Flag ONLY clear cases of:
- harassment: threats, insults, slurs, hateful or degrading language, intimidation.
- scam: asking for money, gift cards, loans or bank/GCash details; pitching crypto, forex or other "investments"; pushing to move to another app together with a money or investment angle.
- explicit: sexually explicit content or unsolicited sexual requests.
Normal flirting, compliments, jokes, asking to meet for coffee, or sharing social media without a money angle are NOT flagged.
Respond with JSON only: {"flagged": true|false, "category": "none"|"harassment"|"scam"|"explicit", "reason": "short explanation"}`,
  prompt: (message: string) => `Message:\n"""\n${message}\n"""`,
};
