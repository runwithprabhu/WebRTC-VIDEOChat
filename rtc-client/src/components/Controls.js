import React from 'react';
import './Controls.css';
import { MicIcon, MicOffIcon, VideoIcon, VideoOffIcon, FlipIcon, EndCallIcon } from './Icons';
import CallTimer from './CallTimer';

function Controls({ audioEnabled, videoEnabled, connected, onToggleAudio, onToggleVideo, onFlipCamera, onEndCall }) {
  return (
    <div className="controls-wrapper">
      <CallTimer active={connected} />
      <div className="controls">
        <div className="control-item">
          <button
            className={`control-btn ${audioEnabled ? 'on' : 'off'}`}
            onClick={onToggleAudio}
            aria-label="Toggle microphone"
          >
            {audioEnabled ? <MicIcon /> : <MicOffIcon />}
          </button>
          <span className="control-label">Mic</span>
        </div>

        <div className="control-item">
          <button
            className={`control-btn ${videoEnabled ? 'on' : 'off'}`}
            onClick={onToggleVideo}
            aria-label="Toggle camera"
          >
            {videoEnabled ? <VideoIcon /> : <VideoOffIcon />}
          </button>
          <span className="control-label">Camera</span>
        </div>

        <div className="control-item">
          <button className="control-btn flip" onClick={onFlipCamera} aria-label="Flip camera">
            <FlipIcon />
          </button>
          <span className="control-label">Flip</span>
        </div>

        <div className="control-item">
          <button className="control-btn end-call" onClick={onEndCall} aria-label="End call">
            <EndCallIcon />
          </button>
          <span className="control-label">End</span>
        </div>
      </div>
    </div>
  );
}

export default Controls;
