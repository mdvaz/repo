import React, { useEffect, useState } from 'react';

interface ParticleStyle {
  left: string;
  top: string;
  width: string;
  height: string;
  animationDelay: string;
  animationDuration: string;
}

const FloatingParticles: React.FC = () => {
  const [particles, setParticles] = useState<ParticleStyle[]>([]);

  useEffect(() => {
    const generateParticles = () => {
      const newParticles: ParticleStyle[] = [];
      for (let i = 0; i < 15; i++) {
        const size = Math.random() * 10 + 5;
        newParticles.push({
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${size}px`,
          height: `${size}px`,
          animationDelay: `${Math.random() * 6}s`,
          animationDuration: `${Math.random() * 4 + 4}s` // Vary duration for more randomness
        });
      }
      setParticles(newParticles);
    };
    generateParticles();
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden">
      {particles.map((style, index) => (
        <div
          key={index}
          className="absolute bg-white/10 rounded-full particle-animation" // Use class from index.html for animation
          style={{ 
            ...style, 
            animationName: 'float' // Ensure keyframe name matches
          }}
        />
      ))}
    </div>
  );
};

export default FloatingParticles;
