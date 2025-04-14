import * as THREE from "three";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

const DEFAULT_OPACITY = 0.3;
const DEFAULT_SIZE = 0.3;
const DEFAULT_DURATION = 300;

export interface DustProps {
  config: { [key: string]: PrimitiveOrArray };
  onComplete: () => void;
}

// Utility to convert THREE.Vector3 to array (needed for store/server)
const vecToArray = (vec: THREE.Vector3): [number, number, number] => {
  return [vec.x, vec.y, vec.z];
};

// Utility to convert Vector3 array to THREE.Vector3 (needed for rendering)
const arrayToVec = (arr?: [number, number, number]): THREE.Vector3 => {
  if (!arr) {
    console.error("Missing required config properties");
    return new THREE.Vector3();
  }
  return new THREE.Vector3(arr[0], arr[1], arr[2]);
};

export const createDustConfig = (
  startPosition: THREE.Vector3,
  size?: number,
  opacity?: number,
  duration?: number
): { [key: string]: PrimitiveOrArray } => {
  return {
    startPosition: vecToArray(startPosition),
    size: size || DEFAULT_SIZE,
    opacity: opacity || DEFAULT_OPACITY,
    duration: duration || DEFAULT_DURATION,
  };
};

const parseConfig = (config: { [key: string]: any }) => {
  return {
    startPosition: arrayToVec(config.startPosition as [number, number, number]),
    size: (config.size as number) || DEFAULT_SIZE,
    opacity: (config.opacity as number) || DEFAULT_OPACITY,
    duration: (config.duration as number) || DEFAULT_DURATION,
  };
};

export const Dust: React.FC<DustProps> = ({ config, onComplete }) => {
  const { startPosition, size, opacity, duration } = parseConfig(config);
  const [active, setActive] = useState(true);
  const meshRef = useRef<THREE.Mesh>(null!);
  const startTime = useRef(Date.now());
  const scaleRef = useRef(0);

  // Effect cleanup function
  const removeDust = useCallback(() => {
    if (active) {
      setActive(false);
      if (onComplete) onComplete();
    }
  }, [active, onComplete]);

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
  }, []);

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

  if (!startPosition || !size || !opacity || !duration) {
    console.error("[Dust] Missing required config properties");
    onComplete?.();
    return null;
  }

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
