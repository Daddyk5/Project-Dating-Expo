import admin from 'firebase-admin';
import fs from 'fs';
import { env } from './env.js';

function buildCredentials() {
  // Prefer JSON file if provided
  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const json = fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
    return JSON.parse(json);
  }

  // Otherwise require the 3 inline env vars
  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    return {
      project_id: env.FIREBASE_PROJECT_ID,          // note: key name in JSON is project_id
      client_email: env.FIREBASE_CLIENT_EMAIL,
      private_key: env.FIREBASE_PRIVATE_KEY,
    };
  }

  throw new Error(
    '[firebase] Missing credentials. Set FIREBASE_SERVICE_ACCOUNT_PATH ' +
    'or all of FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.'
  );
}

if (!admin.apps.length) {
  const creds = buildCredentials();

  // Accept both raw service-account JSON and minimal object above
  const cert =
    creds.type === 'service_account'
      ? creds
      : {
          projectId: creds.project_id,
          clientEmail: creds.client_email,
          privateKey: creds.private_key,
        };

  admin.initializeApp({
    credential: admin.credential.cert(cert),
    ...(env.FIREBASE_STORAGE_BUCKET ? { storageBucket: env.FIREBASE_STORAGE_BUCKET } : {}),
  });
}

// Exports
export const adminApp = admin.app();
export const db = admin.firestore();
export const authAdmin = admin.auth();
export const storage = admin.storage();               // Storage service
export const bucket = env.FIREBASE_STORAGE_BUCKET     // Optional convenience
  ? admin.storage().bucket(env.FIREBASE_STORAGE_BUCKET)
  : null;
