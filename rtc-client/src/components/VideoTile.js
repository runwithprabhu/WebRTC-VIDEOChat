import React, { useEffect, useRef } from 'react';
import './VideoTile.css';

function VideoTile({ stream, label, muted = false, audioOn = true }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-container">
      <video ref={videoRef} autoPlay playsInline muted={muted} />
      <div className="video-overlay">
        <span className="video-label">{label}</span>
        <div className="video-status">
          {!audioOn && <span className="status-dot muted">🔇</span>}
        </div>
      </div>
    </div>
  );
}

export default VideoTile;
