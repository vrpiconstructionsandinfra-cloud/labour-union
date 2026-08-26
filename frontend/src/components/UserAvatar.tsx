import React from 'react';
import './UserAvatar.css';

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  size?: number;
}

// Generate consistent background color based on string hash
const getColorFromName = (name: string): string => {
  if (!name) return '#2563EB';
  const colors = [
    '#2563EB', // Blue
    '#059669', // Emerald
    '#7C3AED', // Purple
    '#D97706', // Amber
    '#DC2626', // Red
    '#0891B2', // Cyan
    '#4F46E5', // Indigo
    '#DB2777'  // Pink
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Generate initials from name (e.g. "Suresh G" -> "SG", "Rajesh" -> "R")
const getInitials = (name: string): string => {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = 'User',
  className = 'table-avatar',
  size
}) => {
  const hasValidPhoto = Boolean(src && src.trim() && src !== 'null' && src !== 'undefined');

  if (hasValidPhoto) {
    return (
      <img
        src={src!}
        alt={name}
        className={className}
        style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
      />
    );
  }

  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  return (
    <div
      className={`avatar-initials-badge ${className}`}
      style={{
        backgroundColor: bgColor,
        color: '#FFFFFF',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        flexShrink: 0,
        userSelect: 'none',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        fontSize: size ? `${Math.round(size * 0.42)}px` : undefined,
        ...(size ? { width: `${size}px`, height: `${size}px` } : {})
      }}
      title={name}
    >
      {initials}
    </div>
  );
};
