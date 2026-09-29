import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { MAX_PHOTOS } from "@kxq/shared";
import { db } from "../db/client";
import { env } from "../env";
import { badRequest, conflict, forbidden, notFound } from "../lib/http";
import { deleteObject, headObject, uploadUrl } from "../lib/storage";
import { getMyProfile } from "./profiles";

const MAX_BYTES = 10 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function photoCount(profileId: string) {
  const { rows } = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from photos where profile_id = ${profileId}`,
  );
  return rows[0].n;
}

/** Step 1: short-lived presigned PUT straight to the private `uploads` bucket. */
export async function createUploadUrl(profileId: string, contentType: string) {
  if (!(await getMyProfile(profileId))) throw conflict("Create your profile first");
  if ((await photoCount(profileId)) >= MAX_PHOTOS) throw badRequest(`You can have up to ${MAX_PHOTOS} photos`);
  const storageKey = `photos/${profileId}/${randomUUID()}.${EXT[contentType]}`;
  return { uploadUrl: await uploadUrl(storageKey, contentType), storageKey, expiresIn: 300 };
}

/** Step 2: after the upload, check the object really exists and register it. */
export async function confirmUpload(profileId: string, storageKey: string) {
  if (!storageKey.startsWith(`photos/${profileId}/`)) throw forbidden("That upload isn't yours");
  const head = await headObject(storageKey);
  if (!head) throw badRequest("Upload not found — try again");
  if (head.size > MAX_BYTES || !head.contentType.startsWith("image/")) {
    await deleteObject(storageKey);
    throw badRequest("Photos must be images under 10 MB");
  }
  const count = await photoCount(profileId);
  if (count >= MAX_PHOTOS) {
    await deleteObject(storageKey);
    throw badRequest(`You can have up to ${MAX_PHOTOS} photos`);
  }
  // Production photos wait for moderation; development auto-approves.
  const status = env.isProd ? "pending" : "approved";
  await db.execute(sql`
    insert into photos (profile_id, storage_key, position, is_primary, moderation_status)
    values (${profileId}, ${storageKey}, ${count}, ${count === 0}, ${status})`);
  return getMyProfile(profileId);
}

async function renumber(profileId: string, orderedIds: string[]) {
  await db.transaction(async (tx) => {
    for (const [i, id] of orderedIds.entries()) {
      await tx.execute(sql`update photos set position = ${i}, is_primary = ${i === 0}
                           where id = ${id} and profile_id = ${profileId}`);
    }
  });
}

export async function reorderPhotos(profileId: string, photoIds: string[]) {
  const { rows } = await db.execute<{ id: string }>(sql`select id from photos where profile_id = ${profileId}`);
  const mine = new Set(rows.map((r) => r.id));
  if (photoIds.length !== mine.size || !photoIds.every((id) => mine.has(id))) {
    throw badRequest("Send every one of your photo ids exactly once");
  }
  await renumber(profileId, photoIds);
  return getMyProfile(profileId);
}

export async function deletePhoto(profileId: string, photoId: string) {
  const { rows } = await db.execute<{ storage_key: string }>(
    sql`delete from photos where id = ${photoId} and profile_id = ${profileId} returning storage_key`,
  );
  if (!rows[0]) throw notFound("Photo not found");
  await deleteObject(rows[0].storage_key);
  const rest = await db.execute<{ id: string }>(
    sql`select id from photos where profile_id = ${profileId} order by position`,
  );
  await renumber(profileId, rest.rows.map((r) => r.id));
  return getMyProfile(profileId);
}
