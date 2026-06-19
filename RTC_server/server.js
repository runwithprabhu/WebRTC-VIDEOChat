const path = require("path");
const fs = require("fs");
const express = require("express");
const https = require("https");
const { Server } = require("socket.io");
const selfsigned = require("selfsigned");

const app = express();

// Generate or load self-signed certificate
const keyPath = path.join(__dirname, "key.pem");
const certPath = path.join(__dirname, "cert.pem");

let key, cert;
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  key = fs.readFileSync(keyPath);
  cert = fs.readFileSync(certPath);
} else {
  console.log("Generating self-signed certificate...");
  const attrs = [{ name: "commonName", value: "webrtc-local" }];
  const pems = selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: "sha256",
    extensions: [
      { name: "subjectAltName", altNames: [
        { type: 2, value: "localhost" },
        { type: 7, ip: "192.168.11.151" },
        { type: 7, ip: "192.168.0.117" },
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
const io = new Server(server, {
  cors: { origin: "*" },
});

// Serve the client files
// In Docker: files are at /app/public, locally: ../RTC_Client
const clientPath = process.env.NODE_ENV === "production"
  ? path.join(__dirname, "public")
  : path.join(__dirname, "../RTC_Client");
app.use(express.static(clientPath));

// Track users in each room
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    // Tell the new user about all existing users in the room
    socket.emit("existing-users", rooms[roomId]);

    // Tell existing users about the new user
    socket.to(roomId).emit("user-joined", socket.id);

    // Add the new user to the room list
    rooms[roomId].push(socket.id);

    console.log(`User ${socket.id} joined room ${roomId}. Total users: ${rooms[roomId].length}`);
  });

  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", { from: socket.id, offer });
  });

  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", { from: socket.id, answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      }
    }
    // Notify others in the room
    if (roomId) {
      socket.to(roomId).emit("user-left", socket.id);
    }
  });
});

server.listen(3000, "0.0.0.0", () => {
  const os = require("os");
  const nets = os.networkInterfaces();
  let localIP = "localhost";
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal && !net.address.startsWith("10.") && !net.address.startsWith("172.")) {
        localIP = net.address;
      }
    }
  }
  console.log("HTTPS Server running on https://localhost:3000");
  console.log("Mobile access: https://" + localIP + ":3000");
});

// Also start HTTP on port 3001 that redirects to HTTPS
// This helps diagnose connectivity issues
const http = require("http");
const httpApp = express();
httpApp.get("*", (req, res) => {
  res.redirect("https://" + req.headers.host.replace(":3001", ":3000") + req.url);
});
http.createServer(httpApp).listen(3001, "0.0.0.0", () => {
  console.log("HTTP redirect server on http://localhost:3001");
});
