# WebRTC Signaling Service

A lightweight WebRTC signaling server designed for mobile video chat applications. This service handles room management and relays WebRTC signaling messages (offers, answers, ICE candidates) between peers.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with uptime and stats |
| GET | `/api/rooms` | List all active rooms |
| GET | `/api/rooms/:roomId` | Get room info (participants, availability) |

## Socket.IO Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-room` | `roomId` (string) | Join a video call room |
| `offer` | `{ to, offer }` | Send SDP offer to a peer |
| `answer` | `{ to, answer }` | Send SDP answer to a peer |
| `ice-candidate` | `{ to, candidate }` | Send ICE candidate to a peer |
| `leave-room` | — | Leave the current room |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `existing-users` | `[socketId, ...]` | Users already in the room |
| `user-joined` | `socketId` | New user joined the room |
| `user-left` | `socketId` | User left the room |
| `offer` | `{ from, offer }` | Received SDP offer |
| `answer` | `{ from, answer }` | Received SDP answer |
| `ice-candidate` | `{ from, candidate }` | Received ICE candidate |
| `room-full` | `{ roomId, maxParticipants }` | Room is at capacity |

## Mobile Client Integration

### iOS (Swift)

```swift
import SocketIO

let manager = SocketManager(socketURL: URL(string: "https://your-ec2-url.com")!)
let socket = manager.defaultSocket

socket.on(clientEvent: .connect) { _, _ in
    socket.emit("join-room", "my-room-id")
}

socket.on("existing-users") { data, _ in
    // Create peer connections for each existing user
}

socket.on("offer") { data, _ in
    // Handle incoming offer, create answer
}
```

### Android (Kotlin)

```kotlin
val socket = IO.socket("https://your-ec2-url.com")

socket.on(Socket.EVENT_CONNECT) {
    socket.emit("join-room", "my-room-id")
}

socket.on("existing-users") { args ->
    // Create peer connections for each existing user
}

socket.on("offer") { args ->
    // Handle incoming offer, create answer
}
```

### React Native

```javascript
import { io } from 'socket.io-client';

const socket = io('https://your-ec2-url.com');

socket.on('connect', () => {
  socket.emit('join-room', 'my-room-id');
});

socket.on('existing-users', (userIds) => {
  // Create peer connections for each existing user
});
```

## Deploy to AWS EC2

```bash
# On EC2 instance
docker pull runwithprabhu/webrtc-service:latest
docker run -d --name webrtc-service \
  -p 80:3000 \
  -e MAX_PARTICIPANTS=4 \
  --restart unless-stopped \
  runwithprabhu/webrtc-service:latest
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `MAX_PARTICIPANTS` | `4` | Max users per room |

## Local Development

```bash
npm install
npm start
```

Server runs on `http://localhost:3000`.
