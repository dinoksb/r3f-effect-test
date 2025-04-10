import * as THREE from "three";
import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectType } from "../../types/effect";
export interface DustEffectProps {
  type: EffectType.Dust;
  startPosition: THREE.Vector3;
  size?: number;
  opacity?: number;
  duration: number; // effect duration(ms)
  onComplete?: () => void;
}

export const Dust: React.FC<DustEffectProps> = ({
  startPosition,
  size = 1,
  opacity = 0.1,
  duration,
  onComplete,
}) => {
  const [active, setActive] = useState(true);
  const meshRef = useRef<THREE.Mesh>(null!);
  const startTime = useRef(Date.now());
  const scaleRef = useRef(0);

  // Effect cleanup function
  const removeDust = () => {
    if (active) {
      setActive(false);
      if (onComplete) onComplete();
    }
  };

  // Set up effect and cleanup timer
  useEffect(() => {
    // Reset state when the component mounts
    startTime.current = Date.now();
    scaleRef.current = 0;
    setActive(true);

    // Set timeout for effect duration
    const timer = setTimeout(() => {
      removeDust();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, onComplete]);

  // Animation loop
  useFrame(() => {
    if (!active || !meshRef.current) return;

    const elapsed = Date.now() - startTime.current;

    // Grow the particle at the beginning
    if (elapsed < duration * 0.2) {
      // Grow phase - first 20% of duration
      const growProgress = elapsed / (duration * 0.2);
      scaleRef.current = THREE.MathUtils.lerp(0, size, growProgress);
    } else {
      // Shrink phase - remaining 80% of duration
      const shrinkProgress = (elapsed - duration * 0.2) / (duration * 0.8);
      scaleRef.current = THREE.MathUtils.lerp(size, 0, shrinkProgress);
    }

    // Apply the current scale
    meshRef.current.scale.setScalar(scaleRef.current);

    // Check if effect duration has expired
    if (elapsed > duration) {
      removeDust();
    }
  });

  // Don't render if not active
  if (!active) return null;

  return (
    <mesh ref={meshRef} position={startPosition}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial
        color="white"
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};
