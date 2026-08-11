import React, { useEffect, useState } from "react";

interface Particle {
  id: number;
  type: "leaf" | "pollen" | "sunbeam";
  left: number; // percentage
  top: number; // percentage
  size: number; // px
  duration: number; // seconds
  delay: number; // seconds
  opacity: number;
}

/**
 * World-Class 60 FPS Atmospheric Particles Engine.
 * Simulates floating agricultural leaves, golden wheat pollen, and celestial sunbeams.
 */
const AtmosphericParticles: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate 20 lightweight floating particles with hardware acceleration
    const generated: Particle[] = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      type: i % 4 === 0 ? "leaf" : i % 4 === 1 ? "sunbeam" : "pollen",
      left: Math.random() * 95,
      top: Math.random() * 90,
      size: i % 4 === 0 ? 16 + Math.random() * 8 : i % 4 === 1 ? 24 + Math.random() * 16 : 4 + Math.random() * 5,
      duration: 10 + Math.random() * 12,
      delay: Math.random() * 5,
      opacity: i % 4 === 0 ? 0.4 : i % 4 === 1 ? 0.25 : 0.65,
    }));
    setParticles(generated);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute transition-transform will-change-transform flex items-center justify-center"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            transform: 'translate3d(0, 0, 0)',
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        >
          {p.type === "leaf" ? (
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-emerald-500/45 dark:text-emerald-400/35 transform -rotate-45 drop-shadow-sm"
            >
              <path d="M17 8C8 10 5 16 5 22C11 22 17 19 19 10C19.5 7.5 19 5.5 17 4C15.5 2 13.5 1.5 11 2C2 4 -1 10 1 18" />
            </svg>
          ) : p.type === "sunbeam" ? (
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-300/30 via-amber-400/15 to-transparent blur-md animate-pulse" />
          ) : (
            <div className="w-full h-full rounded-full bg-amber-400/60 dark:bg-amber-300/50 shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
          )}
        </div>
      ))}
    </div>
  );
};

export default AtmosphericParticles;
