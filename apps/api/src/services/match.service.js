import { db } from '../config/firebase.js';
import admin from 'firebase-admin';

/**
 * Get all matches that include the given user.
 */
export async function getMatches(uid) {
  const snap = await db.collection('matches')
    .where('users', 'array-contains', uid)
    // .orderBy('updatedAt', 'desc') // enable if you maintain updatedAt indexes
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Like a user. If reciprocal like exists, create (or ensure) a match.
 * Collections:
 * - likes_by_pair/{from_to} = { fromUser, toUser, createdAt }
 * - matches/{minUid_maxUid} = { users, createdAt, updatedAt, lastMessage }
 *
 * Returns: { matched:boolean, matchId?:string }
 */
export async function registerLike(fromUid, toUid) {
  if (!fromUid || !toUid) throw new Error('fromUid and toUid required');
  if (fromUid === toUid) return { matched: false };

  const pairsCol = db.collection('likes_by_pair');
  const pairId = `${fromUid}_${toUid}`;
  const reversePairId = `${toUid}_${fromUid}`;

  // Deterministic match id so you never create duplicates
  const usersSorted = [fromUid, toUid].sort();
  const matchId = `${usersSorted[0]}_${usersSorted[1]}`;
  const matchRef = db.collection('matches').doc(matchId);

  const result = await db.runTransaction(async (tx) => {
    // READS (all reads first in a txn)
    const [pairSnap, reverseSnap, matchSnap] = await Promise.all([
      tx.get(pairsCol.doc(pairId)),
      tx.get(pairsCol.doc(reversePairId)),
      tx.get(matchRef),
    ]);

    // WRITE: ensure our like exists
    if (!pairSnap.exists) {
      tx.set(pairsCol.doc(pairId), {
        fromUser: fromUid,
        toUser: toUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // If the other side already liked us, ensure a match doc exists
    if (reverseSnap.exists) {
      if (!matchSnap.exists) {
        const now = admin.firestore.FieldValue.serverTimestamp();
        tx.set(matchRef, {
          users: usersSorted,
          createdAt: now,
          updatedAt: now,
          lastMessage: null,
        });
      }
      return { matched: true, matchId };
    }

    // Not yet a mutual like
    return { matched: false };
  });

  return result;
}

/**
 * Ensure a user belongs to a given match.
 */
export async function ensureUserInMatch(uid, matchId) {
  const snap = await db.collection('matches').doc(matchId).get();
  if (!snap.exists) return false;
  const { users } = snap.data() ?? {};
  return Array.isArray(users) && users.includes(uid);
}

/**
 * Add a message to a match and update match metadata.
 */
export async function addMessage(matchId, from, text) {
  const matchRef = db.collection('matches').doc(matchId);
  const messagesRef = matchRef.collection('messages');
  const now = admin.firestore.FieldValue.serverTimestamp();

  const doc = await messagesRef.add({
    from,
    text,
    createdAt: now,
    seenBy: [from],
  });

  await matchRef.set(
    {
      updatedAt: now,
      lastMessage: { from, text, createdAt: now },
    },
    { merge: true }
  );

  return { id: doc.id };
}
