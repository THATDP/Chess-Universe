import React from 'react';
import { PieceColor, PieceStyleId, PieceType } from '../types/chess';

interface ChessPieceSVGProps {
  type: PieceType;
  color: PieceColor;
  styleId?: PieceStyleId;
  className?: string;
}

export const ChessPieceSVG: React.FC<ChessPieceSVGProps> = ({
  type,
  color,
  styleId = 'neo-staunton',
  className = 'w-full h-full',
}) => {
  const isWhite = color === 'w';

  // Color palette based on piece style
  const fillPrimary =
    styleId === 'imperial'
      ? isWhite
        ? '#FFF9E6'
        : '#18181B'
      : styleId === 'cyber'
      ? isWhite
        ? '#F8FAFC'
        : '#0F172A'
      : isWhite
      ? '#FAF8F5'
      : '#1E232E';

  const strokePrimary =
    styleId === 'imperial'
      ? isWhite
        ? '#785118'
        : '#C89D54'
      : styleId === 'cyber'
      ? isWhite
        ? '#334155'
        : '#38BDF8'
      : isWhite
      ? '#262930'
      : '#090B10';

  const innerAccent =
    styleId === 'imperial'
      ? '#C89D54'
      : styleId === 'cyber'
      ? isWhite
        ? '#0284C7'
        : '#38BDF8'
      : isWhite
      ? '#D6CFC2'
      : '#4B5563';

  return (
    <svg
      viewBox="0 0 45 45"
      className={`select-none pointer-events-none drop-shadow-[0_3px_4px_rgba(0,0,0,0.48)] ${className}`}
    >
      {type === 'p' && (
        <g
          fill={fillPrimary}
          stroke={strokePrimary}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 22.5,9 C 19.5,9 17,11.5 17,14.5 C 17,16.8 18.4,18.7 20.4,19.5 C 17.5,21.2 15.5,24.5 15.5,29 L 29.5,29 C 29.5,24.5 27.5,21.2 24.6,19.5 C 26.6,18.7 28,16.8 28,14.5 C 28,11.5 25.5,9 22.5,9 z" />
          <path d="M 12.5,37 L 32.5,37 C 32.5,33.5 30,31 27,31 L 18,31 C 15,31 12.5,33.5 12.5,37 z" />
          <line x1="15.5" y1="34" x2="29.5" y2="34" stroke={innerAccent} strokeWidth="1.2" />
        </g>
      )}

      {type === 'r' && (
        <g
          fill={fillPrimary}
          stroke={strokePrimary}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z" />
          <path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z" />
          <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14" />
          <path d="M 34,14 L 31,17 L 14,17 L 11,14" />
          <path d="M 31,17 L 31,29.5 L 14,29.5 L 14,17" />
          <path d="M 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5" />
          <line x1="15" y1="20" x2="30" y2="20" stroke={innerAccent} strokeWidth="1.2" />
        </g>
      )}

      {type === 'n' && (
        <g
          fill={fillPrimary}
          stroke={strokePrimary}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
          <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" />
          <circle cx="15.5" cy="14.5" r="1.2" fill={innerAccent} stroke="none" />
          <path d="M 9.5,39 L 35.5,39 L 35.5,36 L 9.5,36 L 9.5,39 z" />
        </g>
      )}

      {type === 'b' && (
        <g
          fill={fillPrimary}
          stroke={strokePrimary}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.06 9,36 9,36 z" />
          <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z" />
          <circle cx="22.5" cy="8" r="2.2" />
          <path d="M 19.5,17.5 L 25.5,17.5 M 22.5,14.5 L 22.5,20.5" stroke={innerAccent} strokeWidth="1.5" />
        </g>
      )}

      {type === 'q' && (
        <g
          fill={fillPrimary}
          stroke={strokePrimary}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" />
          <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" />
          <circle cx="6" cy="12" r="1.8" />
          <circle cx="14" cy="9" r="1.8" />
          <circle cx="22.5" cy="8" r="2" />
          <circle cx="31" cy="9" r="1.8" />
          <circle cx="39" cy="12" r="1.8" />
          <path d="M 12,33.5 C 18,32 27,32 33,33.5" stroke={innerAccent} strokeWidth="1.3" fill="none" />
        </g>
      )}

      {type === 'k' && (
        <g
          fill={fillPrimary}
          stroke={strokePrimary}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 22.5,11.63 L 22.5,6" />
          <path d="M 20,8 L 25,8" />
          <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" />
          <path d="M 11.5,37 C 17,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 19,16 9.5,13 6.5,19.5 C 3.5,25.5 11.5,29.5 11.5,29.5 L 11.5,37 z" />
          <path d="M 11.5,30 C 17,27 27,27 32.5,30" stroke={innerAccent} strokeWidth="1.3" fill="none" />
          <path d="M 11.5,33.5 C 17,30.5 27,30.5 32.5,33.5" stroke={innerAccent} strokeWidth="1.3" fill="none" />
        </g>
      )}
    </svg>
  );
};
