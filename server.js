/**
 * Custom Node server: Next.js + Socket.io ek hi port par chalte hain.
 *  - Socket auth: JWT cookie se
 *  - Rooms: `user:<id>` (har user ka personal room), `conv:<id>` (typing ke liye)
 *  - Presence: kaun online hai
 */
const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { loadEnvConfig } = require("@next/env");

const dev = process.env.NODE_ENV !== "production";
loadEnvConfig(process.cwd(), dev);

const port = parseInt(process.env.PORT || "3000", 10);
const { JWT_SECRET, MONGODB_URI } = process.env;

if (!JWT_SECRET || !MONGODB_URI) {
  console.error("❌ .env.local me MONGODB_URI aur JWT_SECRET set karo (.env.example dekho)");
  process.exit(1);
}

const httpServer = createServer((req, res) => handle(req, res));
const app = next({ dev, hostname: "localhost", port, httpServer });
const handle = app.getRequestHandler();

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((p) => p.trim().split("="))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))])
  );
}

app.prepare().then(async () => {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ MongoDB connected");

  const io = new Server(httpServer, { maxHttpBufferSize: 1e6, destroyUpgrade: false });
  globalThis.io = io; // API routes isi se events emit karte hain

  const online = new Map(); // userId -> socket count

  io.use((socket, nextFn) => {
    try {
      const { token } = parseCookies(socket.handshake.headers.cookie);
      const payload = jwt.verify(token, JWT_SECRET);
      socket.data.userId = String(payload.sub);
      nextFn();
    } catch {
      nextFn(new Error("unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    try {
      const rows = await mongoose.connection
        .collection("conversations")
        .find({ members: new mongoose.Types.ObjectId(userId) }, { projection: { _id: 1 } })
        .toArray();
      rows.forEach((r) => socket.join(`conv:${r._id}`));
    } catch (err) {
      console.error("room join error", err);
    }

    const count = (online.get(userId) || 0) + 1;
    online.set(userId, count);
    socket.emit("presence:list", Array.from(online.keys()));
    if (count === 1) io.emit("presence:update", { userId, online: true });

    socket.on("typing", ({ conversationId, isTyping } = {}) => {
      const room = `conv:${conversationId}`;
      if (!socket.rooms.has(room)) return; // sirf members hi typing bhej sakte hain
      socket.to(room).emit("typing", { conversationId, userId, isTyping: !!isTyping });
    });

    socket.on("disconnect", () => {
      const left = (online.get(userId) || 1) - 1;
      if (left <= 0) {
        online.delete(userId);
        io.emit("presence:update", { userId, online: false });
      } else {
        online.set(userId, left);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`🚀 Chatly ready on http://localhost:${port} (${dev ? "dev" : "production"})`);
  });
});
