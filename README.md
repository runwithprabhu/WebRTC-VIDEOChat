# WebRTC Group Video Call

A real-time multi-party video calling application built with WebRTC, Socket.IO, and React.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Client (React)                  │
│  - Captures local video/audio                   │
│  - Creates RTCPeerConnection per remote user    │
│  - Renders video grid dynamically               │
└────────────────────────┬────────────────────────┘
                         │ Socket.IO (signaling)
┌────────────────────────┴────────────────────────┐
│            Signaling Server (Node.js)            │
│  - Manages rooms and user tracking              │
│  - Relays offers, answers, ICE candidates       │
│  - HTTPS with self-signed certificate           │
└─────────────────────────────────────────────────┘
```

**Topology:** Mesh (each peer connects to every other peer directly)

## Tech Stack

- **Server:** Node.js, Express, Socket.IO, HTTPS
- **Client:** React 18 (CDN, no build step), WebRTC API
- **Containerization:** Docker
- **ICE Servers:** Google STUN + Metered TURN

## Project Structure

```
WebRTC/
├── RTC_server/
│   ├── server.js          # Signaling server (HTTPS + Socket.IO)
│   └── package.json       # Server dependencies
├── RTC_Client/
│   └── index.html         # React client (single file, no build)
├── Dockerfile             # Container image definition
├── .dockerignore
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Local Development

```bash
cd RTC_server
npm install
node server.js
```

The server starts at `https://localhost:3000`. Accept the self-signed certificate warning in your browser.

### Access from Mobile (Same Network)

1. Find your PC's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Open `https://<your-ip>:3000` on your mobile browser
3. Accept the certificate warning
4. Both devices join the same room automatically

### Docker

**Pull from Docker Hub:**

```bash
docker pull runwithprabhu/webrtc:latest
docker run -p 3000:3000 runwithprabhu/webrtc:latest
```

**Build locally:**

```bash
docker build -t webrtc-app .
docker run -p 3000:3000 webrtc-app
```

## How It Works

### Signaling Flow

1. **User A** joins a room → server tracks them
2. **User B** joins → server sends User A's ID to User B (`existing-users`)
3. **User B** creates an RTCPeerConnection and sends an **offer** to User A
4. **User A** receives the offer, creates an **answer**, sends it back
5. Both exchange **ICE candidates** for NAT traversal
6. Direct peer-to-peer media connection is established

### Key Concepts (for learning)

| Concept | What It Does |
|---------|--------------|
| `getUserMedia` | Accesses camera and microphone |
| `RTCPeerConnection` | Manages the peer-to-peer connection |
| `createOffer/createAnswer` | SDP negotiation between peers |
| `ICE Candidates` | Network path discovery for NAT traversal |
| `STUN Server` | Discovers your public IP |
| `TURN Server` | Relays media when direct connection fails |
| `Socket.IO` | Signaling channel to exchange connection metadata |

## Notes

- HTTPS is required for `getUserMedia` on non-localhost origins
- Works best with 2-4 participants (mesh topology limitation)
- Disable VPN for local network testing
- May need firewall rule: `netsh advfirewall firewall add rule name="WebRTC" dir=in action=allow protocol=TCP localport=3000`

## License

MIT
