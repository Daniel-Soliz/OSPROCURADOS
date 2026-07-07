import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const callLogs = pgTable('call_logs', {
  id: serial('id').primaryKey(),
  roomName: text('room_name').notNull(),
  username: text('username').notNull(),
  peerId: text('peer_id').notNull(),
  action: text('action').notNull(), // 'join' or 'leave'
  timestamp: timestamp('timestamp').defaultNow(),
});
