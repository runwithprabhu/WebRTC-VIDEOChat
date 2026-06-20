const express = require("express");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

// Generate self-signed cert if not present
let key, cert;
const keyPath = path.join(__dirname, "key.pem");
const certPath = path.join(__dirname, "cert.pem");

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  key = fs.readFileSync(keyPath);
  cert = fs.readFileSync(certPath);
} else {
  const selfsigned = require("selfsigned");
  console.log("Generating self-signed certificate...");
  const attrs = [{ name: "commonName", value: "webrtc-service" }];
  const pems = selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: "sha256",
    extensions: [
      { name: "subjectAltName", altNames: [
        { type: 2, value: "localhost" },
        { type: 7, ip: "127.0.0.1" }
      ]}
    ]
  });
  fs.writeFileSync(keyPath, pems.private);
  fs.writeFileSync(certPath, pems.cert);
  key = pems.private;
  cert = pems.cert;
  console.log("Certificate generated!");
}

const server = https.createServer({ key, cert }, app);

// Allow connections from any mobile client
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    rooms: Object.keys(rooms).length,
    connections: io.engine.clientsCount,
  });
});

// Room info endpoint (for mobile clients to check room status)
app.get("/api/rooms/:roomId", (req, res) => {
  const roomId = req.params.roomId;
  const users = rooms[roomId] || [];
  res.json({
    roomId,
    participants: users.length,
    maxParticipants: MAX_PARTICIPANTS,
    available: users.length < MAX_PARTICIPANTS,
  });
});

// List active rooms
app.get("/api/rooms", (req, res) => {
  const roomList = Object.entries(rooms).map(([id, users]) => ({
    roomId: id,
    participants: users.length,
  }));
  res.json({ rooms: roomList });
});

// ============================================================
// Configuration
// ============================================================
const PORT = process.env.PORT || 3000;
const MAX_PARTICIPANTS = parseInt(process.env.MAX_PARTICIPANTS) || 4;

// ============================================================
// Room Management
// ============================================================
const rooms = {};

function getRoomUsers(roomId) {
  if (!rooms[roomId]) rooms[roomId] = [];
  return rooms[roomId];
}

function addUserToRoom(roomId, socketId) {
  const users = getRoomUsers(roomId);
  if (users.length >= MAX_PARTICIPANTS) {
    return { success: false, reason: "Room is full" };
  }
  if (!users.includes(socketId)) {
    users.push(socketId);
  }
  return { success: true, participants: users.length };
}

function removeUserFromRoom(roomId, socketId) {
  if (!rooms[roomId]) return;
  rooms[roomId] = rooms[roomId].filter((id) => id !== socketId);
  if (rooms[roomId].length === 0) {
    delete rooms[roomId];
  }
}

// ============================================================
// Socket.IO Signaling
// ============================================================
io.on("connection", (socket) => {
  console.log(`[${new Date().toISOString()}] Connected: ${socket.id}`);

  // Client joins a room
  socket.on("join-room", (roomId, callback) => {
    // Validate roomId
    if (!roomId || typeof roomId !== "string" || roomId.length > 50) {
      if (callback) callback({ success: false, reason: "Invalid room ID" });
      return;
    }

    const result = addUserToRoom(roomId, socket.id);
    if (!result.success) {
      if (callback) callback(result);
      socket.emit("room-full", { roomId, maxParticipants: MAX_PARTICIPANTS });
      return;
    }

    socket.join(roomId);
    socket.roomId = roomId;

    // Send existing users to the new joiner
    const existingUsers = getRoomUsers(roomId).filter((id) => id !== socket.id);
    socket.emit("existing-users", existingUsers);

    // Notify others about the new user
    socket.to(roomId).emit("user-joined", socket.id);

    console.log(
      `[${new Date().toISOString()}] ${socket.id} joined room "${roomId}" (${result.participants} users)`
    );

    if (callback) callback({ success: true, participants: result.participants });
  });

  // WebRTC Signaling: Relay offer to specific peer
  socket.on("offer", ({ to, offer }) => {
    if (!to || !offer) return;
    io.to(to).emit("offer", { from: socket.id, offer });
  });

  // WebRTC Signaling: Relay answer to specific peer
  socket.on("answer", ({ to, answer }) => {
    if (!to || !answer) return;
    io.to(to).emit("answer", { from: socket.id, answer });
  });

  // WebRTC Signaling: Relay ICE candidate to specific peer
  socket.on("ice-candidate", ({ to, candidate }) => {
    if (!to || !candidate) return;
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

  // Client leaves room explicitly
  socket.on("leave-room", () => {
    handleDisconnect(socket);
  });

  // Client disconnects
  socket.on("disconnect", (reason) => {
    console.log(
      `[${new Date().toISOString()}] Disconnected: ${socket.id} (${reason})`
    );
    handleDisconnect(socket);
  });
});

function handleDisconnect(socket) {
  const roomId = socket.roomId;
  if (roomId) {
    removeUserFromRoom(roomId, socket.id);
    socket.to(roomId).emit("user-left", socket.id);
    socket.leave(roomId);
    socket.roomId = null;
    console.log(
      `[${new Date().toISOString()}] ${socket.id} left room "${roomId}"`
    );
  }
}

// ============================================================
// Start Server
// ============================================================
server.listen(PORT, "0.0.0.0", () => {
  console.log("=".repeat(50));
  console.log("  WebRTC Signaling Service (HTTPS)");
  console.log("=".repeat(50));
  console.log(`  Port: ${PORT}`);
  console.log(`  Max participants per room: ${MAX_PARTICIPANTS}`);
  console.log(`  Health: https://localhost:${PORT}/health`);
  console.log(`  Rooms API: https://localhost:${PORT}/api/rooms`);
  console.log("=".repeat(50));
});
