import React from 'react';
import './EndScreen.css';

function EndScreen({ onReconnect }) {
  return (
    <div className="end-screen">
      <div className="end-screen-icon">👋</div>
      <h1>Thank You!</h1>
      <p>Your call has ended. See you next time!</p>
      <button className="reconnect-btn" onClick={onReconnect}>
        🔄 Connect Again
      </button>
    </div>
  );
}

export default EndScreen;
