import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, logCallEvent } from './src/db/users.ts';

interface User {
  peerId: string;
  name: string;
  lastSeen: number;
}

const rooms: Record<string, User[]> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const dbUser = await getOrCreateUser(
        user.uid,
        user.email || '',
        user.name || '',
        user.picture || ''
      );
      res.json({ success: true, user: dbUser });
    } catch (err: any) {
      console.error('Error syncing auth profile:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/room/join', async (req, res) => {
    const { roomName, peerId, name } = req.body;
    if (!roomName || !peerId || !name) {
      res.status(400).json({ error: 'Missing roomName, peerId or name' });
      return;
    }

    if (!rooms[roomName]) {
      rooms[roomName] = [];
    }

    // Remove any previous entry of this peerId
    rooms[roomName] = rooms[roomName].filter((u) => u.peerId !== peerId);

    // Add new user
    const newUser: User = { peerId, name, lastSeen: Date.now() };
    rooms[roomName].push(newUser);

    // Log call join event to Cloud SQL database
    await logCallEvent(roomName, name, peerId, 'join');

    // Get other users
    const otherUsers = rooms[roomName].filter((u) => u.peerId !== peerId);
    res.json({ success: true, otherUsers, allUsers: rooms[roomName] });
  });

  app.post('/api/room/heartbeat', (req, res) => {
    const { roomName, peerId } = req.body;
    if (!roomName || !peerId) {
      res.status(400).json({ error: 'Missing roomName or peerId' });
      return;
    }

    const room = rooms[roomName];
    if (room) {
      const user = room.find((u) => u.peerId === peerId);
      if (user) {
        user.lastSeen = Date.now();
      } else {
        // If they aren't registered (e.g. server restarted or they were cleaned up), ask them to re-register
        res.json({ success: false, code: 'NOT_FOUND' });
        return;
      }
    }
    res.json({ success: true, allUsers: rooms[roomName] || [] });
  });

  app.post('/api/room/leave', async (req, res) => {
    const { roomName, peerId } = req.body;
    if (!roomName || !peerId) {
      res.status(400).json({ error: 'Missing roomName or peerId' });
      return;
    }

    let name = 'Anônimo';
    if (rooms[roomName]) {
      const foundUser = rooms[roomName].find((u) => u.peerId === peerId);
      if (foundUser) {
        name = foundUser.name;
      }
      rooms[roomName] = rooms[roomName].filter((u) => u.peerId !== peerId);
    }

    // Log call leave event to Cloud SQL database
    await logCallEvent(roomName, name, peerId, 'leave');

    res.json({ success: true });
  });

  // Clean stale users every 5 seconds
  setInterval(() => {
    const now = Date.now();
    const staleThreshold = 12000; // 12 seconds
    for (const roomName of Object.keys(rooms)) {
      rooms[roomName] = rooms[roomName].filter((user) => {
        const isStale = now - user.lastSeen > staleThreshold;
        return !isStale;
      });
    }
  }, 5000);

  // Serve Vite or static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
