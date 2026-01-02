import React from "react";

interface GradientAvatarProps {
  seed: string; // Used to generate consistent random colors
  name?: string;
  size?: number;
  className?: string;
}

/**
 * Generates a consistent random gradient avatar based on a seed string
 * Creates beautiful blurred gradients similar to the reference image
 */
export function GradientAvatar({
  seed,
  name,
  size = 32,
  className = "",
}: GradientAvatarProps) {
  // Generate consistent "random" colors from seed
  const hash = React.useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }, [seed]);

  // Generate 3 colors from hash
  const colors = React.useMemo(() => {
    const colorPalettes = [
      // Warm palettes
      ["#FF6B6B", "#FFB84D", "#FFA726"],
      ["#FF5722", "#FF9800", "#FFEB3B"],
      ["#E91E63", "#F06292", "#FFB300"],
      
      // Cool palettes
      ["#4A90E2", "#667EEA", "#764BA2"],
      ["#00BCD4", "#2196F3", "#3F51B5"],
      ["#26C6DA", "#42A5F5", "#5C6BC0"],
      
      // Purple/Pink palettes
      ["#AB47BC", "#EC407A", "#F06292"],
      ["#9C27B0", "#E91E63", "#FF4081"],
      ["#BA68C8", "#F48FB1", "#FF80AB"],
      
      // Green/Teal palettes
      ["#00BFA5", "#1DE9B6", "#64FFDA"],
      ["#00C853", "#69F0AE", "#B9F6CA"],
      ["#00E676", "#76FF03", "#AEEA00"],
      
      // Orange/Yellow palettes
      ["#FF6F00", "#FF9100", "#FFC400"],
      ["#FF3D00", "#FF6E40", "#FF9E80"],
      ["#FFD600", "#FFEA00", "#FFF176"],
      
      // Multi-color blends
      ["#667EEA", "#F093FB", "#4FACFE"],
      ["#43E97B", "#38F9D7", "#48C6EF"],
      ["#FA709A", "#FEE140", "#30CFD0"],
      ["#A8EDEA", "#FED6E3", "#C471F5"],
      ["#FFD89B", "#19547B", "#FF6B6B"],
    ];

    const paletteIndex = hash % colorPalettes.length;
    return colorPalettes[paletteIndex];
  }, [hash]);

  // Generate random angle (0-360 degrees)
  const angle = React.useMemo(() => {
    return (hash % 360);
  }, [hash]);

  return (
    <div
      className={`relative flex items-center justify-center rounded-full overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`,
        filter: "blur(0px)", // No blur on container
      }}
    >
      {/* Blur overlay */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`,
          filter: "blur(12px)", // Heavy blur for soft edges
          opacity: 0.8,
        }}
      />
      
      {/* Content (initials) - optional */}
      {/* Uncomment if you want to show initials on top of gradient */}
      {/*
      <span
        className="relative z-10 font-semibold text-white"
        style={{ fontSize: size * 0.4 }}
      >
        {initials}
      </span>
      */}
    </div>
  );
}
