import React from "react";

interface DeskSurfaceProps {
  isNightMode: boolean;
  isShaking: boolean;
  children: React.ReactNode;
}

export const DeskSurface: React.FC<DeskSurfaceProps> = ({
  isNightMode,
  isShaking,
  children,
}) => {
  return (
    <div
      className={`min-h-screen w-full relative transition-colors duration-500 overflow-x-hidden ${
        isNightMode ? "bg-[#10130F] text-paper" : "bg-[#DCD4C4] text-ink"
      } ${isShaking ? "shake-active" : ""}`}
    >
      {/* Tactile paper & blotter noise texture overlay */}
      <div className="fixed inset-0 grain-overlay pointer-events-none z-10" />

      {/* Desk Lamp Radial Warm Light Cone (Night Mode) */}
      {isNightMode && (
        <div
          className="fixed inset-0 pointer-events-none z-1 transition-opacity duration-700"
          style={{
            background:
              "radial-gradient(ellipse 85% 65% at 50% 20%, rgba(255, 238, 185, 0.09) 0%, rgba(255, 238, 185, 0.035) 45%, transparent 80%)",
          }}
        />
      )}

      {/* Faint Bureau Watermark across the blotter */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 select-none overflow-hidden">
        <div
          className={`font-stamp text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-[0.25em] rotate-[-25deg] transition-opacity duration-300 ${
            isNightMode ? "text-paper/[0.015]" : "text-ink/[0.025]"
          }`}
        >
          CONFIDENTIAL // PRIOR ART ARCHIVE
        </div>
      </div>

      {/* Surface content */}
      <div className="relative z-0 min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
};
