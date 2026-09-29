import {
  DeleteObjectCommand,
  GetBucketCorsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";

// Credentials, endpoint and region come from the AWS_* vars Neon writes for the branch.
// Neon Object Storage requires path-style addressing.
export const s3 = new S3Client({ forcePathStyle: true });
const Bucket = env.UPLOADS_BUCKET;

const READ_TTL_S = 60 * 60;
const readUrlCache = new Map<string, { url: string; expires: number }>();

export function isExternalUrl(key: string) {
  return key.startsWith("https://");
}

/**
 * Signed read URL for a private object. Cached for most of its lifetime so the
 * same photo keeps the same URL (lets clients cache the image).
 */
export async function readUrl(key: string): Promise<string> {
  if (isExternalUrl(key)) return key; // demo avatars (DiceBear)
  const hit = readUrlCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.url;
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket, Key: key }), { expiresIn: READ_TTL_S });
  readUrlCache.set(key, { url, expires: Date.now() + (READ_TTL_S - 600) * 1000 });
  return url;
}

export async function uploadUrl(key: string, contentType: string): Promise<string> {
  return getSignedUrl(s3, new PutObjectCommand({ Bucket, Key: key, ContentType: contentType }), { expiresIn: 300 });
}

export async function headObject(key: string) {
  try {
    const r = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
    return { size: r.ContentLength ?? 0, contentType: r.ContentType ?? "" };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string) {
  if (isExternalUrl(key)) return;
  readUrlCache.delete(key);
  await s3.send(new DeleteObjectCommand({ Bucket, Key: key })).catch(() => {});
}

/**
 * Browsers PUT straight to the bucket with presigned URLs, so the bucket's CORS rules
 * must allow the app origin. Neon buckets ship with a permissive default rule, and the
 * branch storage credential can't change it, so this only checks and warns.
 */
export async function checkBucketCors() {
  const { CORSRules = [] } = await s3.send(new GetBucketCorsCommand({ Bucket }));
  const allows = (origin: string) =>
    CORSRules.some(
      (r) =>
        r.AllowedMethods?.includes("PUT") &&
        r.AllowedOrigins?.some((o) => o === "*" || o === origin),
    );
  const blocked = env.CORS_ORIGINS.filter((o) => !allows(o));
  if (blocked.length) console.warn(`[storage] bucket CORS does not allow PUT from: ${blocked.join(", ")}`);
}
