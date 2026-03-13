import React from 'react';
import { getInitials } from '../../utils/helpers';
import './avatar.css';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({ name, color, size = 'md', onClick }) => {
  return (
    <div
      className={`avatar avatar--${size}`}
      style={{ backgroundColor: color }}
      onClick={onClick}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
