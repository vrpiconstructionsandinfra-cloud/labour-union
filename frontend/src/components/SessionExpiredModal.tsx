import React, { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import './SessionExpiredModal.css';

interface SessionExpiredModalProps {
  onGoToLogin: () => void;
}

const COUNTDOWN_SECONDS = 3;

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({ onGoToLogin }) => {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onGoToLogin();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft, onGoToLogin]);

  const progressPercent = (secondsLeft / COUNTDOWN_SECONDS) * 100;

  return (
    <div className="session-expired-overlay" role="dialog" aria-modal="true" aria-label="Session expired">
      <div className="session-expired-card">
        <div className="session-icon-ring" aria-hidden="true">🔒</div>

        <h2 className="session-expired-title">Session Expired</h2>
        <p className="session-expired-subtitle">
          Your session has timed out due to inactivity or an expired token.
          <br />
          Please log in again to continue.
        </p>

        <div className="session-countdown-bar-wrapper" role="progressbar" aria-valuenow={secondsLeft} aria-valuemin={0} aria-valuemax={COUNTDOWN_SECONDS}>
          <div
            className="session-countdown-bar"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="session-countdown-text">
          Redirecting in <strong>{secondsLeft}s</strong>…
        </p>

        <button
          id="session-expired-login-btn"
          className="session-expired-btn"
          onClick={onGoToLogin}
          autoFocus
        >
          <LogIn size={16} />
          Go to Login
        </button>
      </div>
    </div>
  );
};
