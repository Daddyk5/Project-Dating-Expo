import 'dotenv/config';

const maybe = (k) => process.env[k] ?? '';
const normalizeKey = (k) => (k ? k.replace(/\\n/g, '\n') : '');

export const env = {
  PORT: process.env.PORT || 8080,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  // Option A: use a JSON file path
  FIREBASE_SERVICE_ACCOUNT_PATH: maybe('FIREBASE_SERVICE_ACCOUNT_PATH'),

  // Option B: use inline creds (only if all 3 are set)
  FIREBASE_PROJECT_ID: maybe('FIREBASE_PROJECT_ID'),
  FIREBASE_CLIENT_EMAIL: maybe('FIREBASE_CLIENT_EMAIL'),
  FIREBASE_PRIVATE_KEY: normalizeKey(maybe('FIREBASE_PRIVATE_KEY')),

  // Optional for storage bucket shortcuts
  FIREBASE_STORAGE_BUCKET: maybe('FIREBASE_STORAGE_BUCKET'),
};
