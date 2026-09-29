export const MIN_AGE = 18;
export const MAX_AGE = 99;
export const MAX_PHOTOS = 6;
export const MIN_PHOTOS = 2;
export const MIN_INTERESTS = 3;
export const MAX_INTERESTS = 10;
export const MAX_BIO = 500;
export const MAX_MESSAGE = 2000;
export const DISCOVER_MAX_LIMIT = 50;
export const ONLINE_WINDOW_MINUTES = 5;

export const GENDERS = ["man", "woman", "nonbinary"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  man: "Man",
  woman: "Woman",
  nonbinary: "Non-binary",
};

export const SWIPE_ACTIONS = ["like", "pass", "superlike"] as const;
export type SwipeAction = (typeof SWIPE_ACTIONS)[number];

export const REPORT_REASONS = [
  "harassment",
  "scam",
  "explicit_content",
  "fake_profile",
  "underage",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const INTERESTS = [
  "Hiking", "Beach days", "Diving", "Surfing", "Coffee", "Cooking", "Baking",
  "Street food", "Durian", "Karaoke", "Dancing", "Live music", "K-pop", "OPM",
  "Guitar", "Photography", "Art", "Anime", "Gaming", "Board games", "Movies",
  "Netflix", "Reading", "Writing", "Basketball", "Volleyball", "Running",
  "Gym", "Yoga", "Cycling", "Travel", "Road trips", "Camping", "Pets", "Dogs",
  "Cats", "Plants", "Volunteering", "Church", "Tech", "Startups", "Fashion",
  "Thrifting", "Languages", "Mountains", "Island hopping",
] as const;
export type Interest = (typeof INTERESTS)[number];

/** Shown on interest chips. Typed against INTERESTS so a new interest can't ship without one. */
export const INTEREST_EMOJI: Record<Interest, string> = {
  Hiking: "🥾", "Beach days": "🏖️", Diving: "🤿", Surfing: "🏄", Coffee: "☕", Cooking: "🍳", Baking: "🧁",
  "Street food": "🍢", Durian: "🍈", Karaoke: "🎤", Dancing: "💃", "Live music": "🎶", "K-pop": "🎧", OPM: "🎵",
  Guitar: "🎸", Photography: "📷", Art: "🎨", Anime: "🍥", Gaming: "🎮", "Board games": "🎲", Movies: "🎬",
  Netflix: "📺", Reading: "📚", Writing: "✍️", Basketball: "🏀", Volleyball: "🏐", Running: "🏃",
  Gym: "🏋️", Yoga: "🧘", Cycling: "🚴", Travel: "✈️", "Road trips": "🚗", Camping: "⛺", Pets: "🐾", Dogs: "🐶",
  Cats: "🐱", Plants: "🪴", Volunteering: "🤝", Church: "⛪", Tech: "💻", Startups: "🚀", Fashion: "👗",
  Thrifting: "🛍️", Languages: "🗣️", Mountains: "⛰️", "Island hopping": "🏝️",
};

export const interestLabel = (i: string) => `${INTEREST_EMOJI[i as Interest] ?? "✨"} ${i}`;
