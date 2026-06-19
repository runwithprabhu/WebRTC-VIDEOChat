import React from 'react';
import './EndScreen.css';

function EndScreen() {
  return (
    <div className="end-screen">
      <div className="end-screen-icon">👋</div>
      <h1>Thank You!</h1>
      <p>Your call has ended. See you next time!</p>
      <a className="reconnect-btn" href="/?reconnect=1">
        🔄 Connect Again
      </a>
    </div>
  );
}

export default EndScreen;
