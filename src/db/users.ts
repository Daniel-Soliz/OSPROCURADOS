import { db } from './index.ts';
import { users, callLogs } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, name?: string, avatar?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name: name || null,
        avatar: avatar || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          name: name || null,
          avatar: avatar || null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw new Error('Failed to register or retrieve user', { cause: error });
  }
}

export async function logCallEvent(roomName: string, username: string, peerId: string, action: 'join' | 'leave') {
  try {
    const result = await db.insert(callLogs)
      .values({
        roomName,
        username,
        peerId,
        action,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error logging call event:', error);
  }
}
