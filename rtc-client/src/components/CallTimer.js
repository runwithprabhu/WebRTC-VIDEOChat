import React, { useState, useEffect } from 'react';
import './CallTimer.css';

function CallTimer({ active }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  return <div className="call-timer">⏱ {mins}:{secs}</div>;
}

export default CallTimer;
