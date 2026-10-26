import React from "react";

interface PaperclipProps {
  className?: string;
  size?: number;
  rotation?: number;
}

/**
 * Realistic metal wire paperclip with specular highlight and ink drop-shadow.
 * Pins evidence cards, dossiers, and sticky notes to the detective desk.
 */
export const Paperclip: React.FC<PaperclipProps> = ({
  className = "",
  size = 42,
  rotation = 0,
}) => {
  return (
    <div
      style={{
        transform: `rotate(${rotation}deg)`,
        width: `${size * 0.45}px`,
        height: `${size}px`,
      }}
      className={`relative z-20 pointer-events-none drop-shadow-[2px_3px_1px_rgba(27,26,23,0.45)] ${className}`}
    >
      <svg
        viewBox="0 0 24 54"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Soft shadow layer */}
        <path
          d="M7 40V12C7 7.5 10.5 4 15 4C19.5 4 23 7.5 23 12V43C23 48.5 18.5 53 13 53C7.5 53 3 48.5 3 43V17C3 14 5.5 11.5 8.5 11.5C11.5 11.5 14 14 14 17V38"
          stroke="#1B1A17"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.35"
        />

        {/* Steel wire base */}
        <path
          d="M6 39V11C6 6.5 9.5 3 14 3C18.5 3 22 6.5 22 11V42C22 47.5 17.5 52 12 52C6.5 52 2 47.5 2 42V16C2 13 4.5 10.5 7.5 10.5C10.5 10.5 13 13 13 16V37"
          stroke="#7E8287"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Metallic chrome highlight */}
        <path
          d="M5.5 38.5V11C5.5 6.8 9.2 3.5 13.5 3.5C17.8 3.5 21.5 6.8 21.5 11V41.5C21.5 46.8 17.2 51.5 12 51.5C6.8 51.5 2.5 46.8 2.5 41.5V16C2.5 13.2 4.8 11 7.5 11C10.2 11 12.5 13.2 12.5 16V36.5"
          stroke="#E2E8F0"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>
    </div>
  );
};
