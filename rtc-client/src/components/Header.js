import React from 'react';
import './Header.css';

function Header({ connected, peerCount }) {
  return (
    <div className="header">
      <div className="header-left">
        <div className="header-logo">🌐</div>
        <h1>Video Call</h1>
      </div>
      <span className="room-badge">
        {connected && <span className="dot" />}
        {connected ? `${peerCount + 1} online` : 'connecting...'}
      </span>
    </div>
  );
}

export default Header;
