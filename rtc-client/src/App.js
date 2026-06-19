import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Header from './components/Header';
import VideoTile from './components/VideoTile';
import Controls from './components/Controls';
import EndScreen from './components/EndScreen';
import './App.css';

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

const ROOM_ID = 'room1';

function App() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [connected, setConnected] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState('user');

  const socketRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);

  // Create peer connection for a remote user
  const createPeerConnection = (remoteSocketId) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);

    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current);
    });

    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({ ...prev, [remoteSocketId]: event.streams[0] }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', { to: remoteSocketId, candidate: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        removePeer(remoteSocketId);
      }
    };

    pc.pendingCandidates = [];
    peersRef.current[remoteSocketId] = pc;
    return pc;
  };

  const removePeer = (socketId) => {
    if (peersRef.current[socketId]) {
      peersRef.current[socketId].close();
      delete peersRef.current[socketId];
    }
    setRemoteStreams(prev => {
      const updated = { ...prev };
      delete updated[socketId];
      return updated;
    });
  };

  // Media controls
  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setAudioEnabled(prev => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setVideoEnabled(prev => !prev);
    }
  };

  const flipCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode }, audio: true,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      Object.values(peersRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newVideoTrack);
      });

      const oldTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldTrack) oldTrack.stop();
      localStreamRef.current.removeTrack(oldTrack);
      localStreamRef.current.addTrack(newVideoTrack);

      setLocalStream(localStreamRef.current);
      setFacingMode(newMode);
    } catch (err) {
      console.error('Flip error:', err);
    }
  };

  const endCall = () => {
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (socketRef.current) socketRef.current.disconnect();
    setLocalStream(null);
    setRemoteStreams({});
    setConnected(false);
    setCallEnded(true);
  };

  const reconnect = () => {
    window.location.href = window.location.pathname + '?t=' + Date.now();
  };

  // Socket setup and signaling
  const setupSocket = (socket) => {
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', ROOM_ID);
    });

    socket.on('existing-users', async (userIds) => {
      for (const userId of userIds) {
        const pc = createPeerConnection(userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { to: userId, offer });
      }
    });

    socket.on('user-joined', () => {});

    socket.on('offer', async ({ from, offer }) => {
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      for (const c of pc.pendingCandidates) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      pc.pendingCandidates = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { to: from, answer });
    });

    socket.on('answer', async ({ from, answer }) => {
      const pc = peersRef.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        for (const c of pc.pendingCandidates) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        pc.pendingCandidates = [];
      }
    });

    socket.on('ice-candidate', async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (pc) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pc.pendingCandidates.push(candidate);
        }
      }
    });

    socket.on('user-left', (userId) => {
      removePeer(userId);
    });
  };

  // Initialize call
  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        });
        setLocalStream(stream);
        localStreamRef.current = stream;

        const serverUrl = process.env.REACT_APP_SERVER_URL || window.location.origin;
        const socket = io(serverUrl);
        socketRef.current = socket;
        setupSocket(socket);
      } catch (err) {
        console.error('Init error:', err);
      }
    };

    init();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      Object.values(peersRef.current).forEach(pc => pc.close());
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render
  if (callEnded) {
    return (
      <div className="app-container">
        <div className="app-bg" />
        <EndScreen onReconnect={reconnect} />
      </div>
    );
  }

  const peerCount = Object.keys(remoteStreams).length;

  return (
    <div className="app-container">
      <div className="app-bg" />
      <Header connected={connected} peerCount={peerCount} />

      <div className="video-grid">
        {localStream && (
          <VideoTile stream={localStream} label="You" muted={true} audioOn={audioEnabled} />
        )}
        {Object.entries(remoteStreams).map(([id, stream]) => (
          <VideoTile key={id} stream={stream} label={`User ${id.substring(0, 6)}`} />
        ))}
      </div>

      <Controls
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        connected={connected}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onFlipCamera={flipCamera}
        onEndCall={endCall}
      />
    </div>
  );
}

export default App;
