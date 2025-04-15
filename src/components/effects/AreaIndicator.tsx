import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Ring } from "@react-three/drei";

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

const DEFAULT_COLOR = "#ff3300";
const DEFAULT_RADIUS = 2;
const DEFAULT_DURATION = 1500;
const DEFAULT_PULSE_SPEED = 2;

interface AreaIndicatorProps {
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

export const createAreaIndicatorConfig = (
  position: THREE.Vector3,
  radius?: number,
  color?: string,
  duration?: number,
  pulseSpeed?: number
): { [key: string]: PrimitiveOrArray } => {
  return {
    position: vecToArray(position),
    radius: radius || DEFAULT_RADIUS,
    color: color || DEFAULT_COLOR,
    duration: duration || DEFAULT_DURATION,
    pulseSpeed: pulseSpeed || DEFAULT_PULSE_SPEED,
  };
};

const parseConfig = (config: { [key: string]: any }) => {
  return {
    position: arrayToVec(config.position as [number, number, number]),
    radius: (config.radius as number) || DEFAULT_RADIUS,
    color: (config.color as string) || DEFAULT_COLOR,
    duration: (config.duration as number) || DEFAULT_DURATION,
    pulseSpeed: (config.pulseSpeed as number) || DEFAULT_PULSE_SPEED,
  };
};

/**
 * Effect component that shows where meteors will land on the ground
 */
export const AreaIndicator: React.FC<AreaIndicatorProps> = ({
  config,
  onComplete,
}) => {
  const { position, radius, color, duration, pulseSpeed } = parseConfig(config);
  const startTime = useRef(Date.now());
  const [destroyed, setDestroyed] = useState(false);

  const outerRingRef = useRef<THREE.Mesh>();
  const innerRingRef = useRef<THREE.Mesh>();
  const rowLineRef = useRef<THREE.Mesh>();
  const colLineRef = useRef<THREE.Mesh>();
  const innerRingScale = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDestroyed(true);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  useFrame(() => {
    if (destroyed) return;

    const elapsedMs = Date.now() - startTime.current;
    const progress = Math.min(elapsedMs / duration, 1);

    // Fade out based on overall progress (fade out in the last 20%)
    const opacity =
      progress > 0.8
        ? (1 - progress) * 5 // Quick fade out in the last 20%
        : 1;

    // Pulse animation that accelerates with progress
    const pulseSpeedFactor = 1 + progress * 0.3;
    const pulseValue =
      Math.sin(elapsedMs * 0.01 * pulseSpeed * pulseSpeedFactor) * 0.5 + 0.5;

    if (outerRingRef.current) {
      // Outer ring expands slightly as animation progresses
      const material = outerRingRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = opacity;
      material.needsUpdate = true;

      const scaleFactor = progress <= 0.5 ? 0.7 + progress * 2 * 0.3 : 1.0;
      outerRingRef.current.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }

    if (innerRingRef.current) {
      // Inner ring has pulse effect
      const material = innerRingRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = opacity * 0.7 * (1 - pulseValue * 0.5);
      material.color.setStyle(color);
      material.needsUpdate = true;

      // Inner ring pulses based on outer ring size
      const outerScale = progress <= 0.5 ? 0.7 + progress * 2 * 0.3 : 1.0;
      innerRingScale.current = outerScale * (0.5 + pulseValue * 0.65);
      innerRingRef.current.scale.set(
        innerRingScale.current,
        innerRingScale.current,
        innerRingScale.current
      );
    }

    if (rowLineRef.current) {
      const material = rowLineRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = opacity;
      material.needsUpdate = true;
    }

    if (colLineRef.current) {
      const material = colLineRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = opacity;
      material.needsUpdate = true;
    }
  });

  if (!position || !radius || !color || !duration || !pulseSpeed) {
    console.error("[AreaIndicator] Missing required config properties");
    onComplete?.();
    return null;
  }
  if (destroyed) return null;

  // Y coordinate is slightly raised to stick to the floor (prevents z-fighting)
  const adjustedPosition = new THREE.Vector3(
    position.x,
    position.y + 0.01,
    position.z
  );

  return (
    <group position={adjustedPosition} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Outer ring - main indicator */}
      <Ring
        ref={outerRingRef}
        args={[radius * 0.95, radius, 64, 1, 0, Math.PI * 2]}
      >
        <meshBasicMaterial
          color={color}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Ring>

      {/* Inner ring - secondary indicator */}
      <Ring ref={innerRingRef} args={[0, radius * 0.85, 32, 1, 0, Math.PI * 2]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Ring>

      <Ring args={[0, radius * 0.1, 32, 1, 0, Math.PI * 2]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Ring>
    </group>
  );
};
