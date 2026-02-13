import React from 'react';
import { getStepColor } from '../styles/cohive-theme';

export type HexStatus = 'completed' | 'active' | 'upcoming' | 'disabled';
export type HexSize = 'small' | 'medium' | 'large';

interface HexagonBreadcrumbProps {
  label: string;
  color?: string;
  status: HexStatus;
  size?: HexSize;
  onClick?: () => void;
  className?: string;
}

const sizeConfig = {
  small: {
    width: 80,
    height: 46,
    fontSize: '0.65rem',
    padding: 8,
  },
  medium: {
    width: 120,
    height: 69,
    fontSize: '0.875rem',
    padding: 12,
  },
  large: {
    width: 160,
    height: 92,
    fontSize: '1rem',
    padding: 16,
  },
};

export function HexagonBreadcrumb({
  label,
  color,
  status,
  size = 'medium',
  onClick,
  className = '',
}: HexagonBreadcrumbProps) {
  const config = sizeConfig[size];
  const hexColor = color || getStepColor(label);
  
  // Determine opacity and cursor based on status
  const opacity = status === 'disabled' ? 0.4 : status === 'upcoming' ? 0.6 : 1;
  const cursor = status === 'disabled' ? 'not-allowed' : 'pointer';
  const borderWidth = status === 'active' ? 3 : 2;
  
  // Determine background based on status
  const getBgColor = () => {
    if (status === 'completed') return hexColor;
    if (status === 'active') return '#ffffff';
    if (status === 'upcoming') return '#f3f4f6';
    return '#e5e7eb';
  };
  
  const getTextColor = () => {
    if (status === 'completed') return '#ffffff';
    if (status === 'active') return hexColor;
    return '#6b7280';
  };

  const handleClick = () => {
    if (status !== 'disabled' && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`hexagon-container ${className}`}
      style={{
        display: 'inline-flex',
        position: 'relative',
        cursor,
        opacity,
      }}
      onClick={handleClick}
      role="button"
      tabIndex={status === 'disabled' ? -1 : 0}
      aria-label={`${label} - ${status}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <svg
        width={config.width}
        height={config.height}
        viewBox="0 0 100 58"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: status === 'active' ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' : 'none',
          transition: 'all 0.2s ease-in-out',
        }}
        className="hexagon-svg hover:scale-105"
      >
        {/* Hexagon shape */}
        <path
          d="M 50,2 L 96,16 L 96,42 L 50,56 L 4,42 L 4,16 Z"
          fill={getBgColor()}
          stroke={hexColor}
          strokeWidth={borderWidth}
        />
        
        {/* Text label */}
        <text
          x="50"
          y="29"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={getTextColor()}
          fontSize={config.fontSize}
          fontWeight={status === 'active' ? '600' : '500'}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}

export default HexagonBreadcrumb;
