import React, { useEffect, useState } from "react";
import { Laser } from "./Laser";
import { EffectType } from "../../types/effect";
import * as THREE from "three";

export interface LaserEffectProps {
  type: EffectType.Laser;
  playerTransformRef?: React.RefObject<{
    position: THREE.Vector3;
    direction: THREE.Vector3;
  }>;
  duration: number; // effect duration(ms)
  length: number;
  thickness: number;
  hitInterval: number;
  excludeCollisionGroup?: number | number[];
  onHit?: (other?: unknown, type?: EffectType, pos?: THREE.Vector3) => void;
  onComplete?: () => void;
  debug?: boolean;
}

export const LaserEffectController: React.FC<LaserEffectProps> = ({
  type,
  playerTransformRef,
  duration,
  length,
  thickness,
  hitInterval,
  excludeCollisionGroup,
  onHit,
  onComplete,
}) => {
  const [spawned, setSpawned] = useState(false);

  // Add state to track current laser position and direction
  const [currentPosition, setCurrentPosition] = useState(
    playerTransformRef?.current?.position.clone()
  );
  const [currentDirection, setCurrentDirection] = useState(
    playerTransformRef?.current?.direction.clone().normalize()
  );

  // Animation loop update to use instead of useFrame
  useEffect(() => {
    let frameId: number;
    const startTime = Date.now();
    let isActive = true;

    const updateLoop = () => {
      if (!isActive) return;

      // Dynamic update: Get the latest position and direction through the callback provided externally
      if (playerTransformRef?.current?.position) {
        setCurrentPosition(playerTransformRef.current.position.clone());
      }

      if (playerTransformRef?.current?.direction) {
        setCurrentDirection(
          playerTransformRef.current.direction.clone().normalize()
        );
      }

      // End when duration has passed
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        isActive = false;
        onComplete?.();
      }

      frameId = requestAnimationFrame(updateLoop);
    };

    frameId = requestAnimationFrame(updateLoop);

    return () => {
      isActive = false;
      cancelAnimationFrame(frameId);
    };
  }, [duration, playerTransformRef, onComplete]);

  useEffect(() => {
    setSpawned(true);
  }, []);

  if (!spawned) return null;

  return (
    <>
      <Laser
        type={type}
        position={currentPosition}
        direction={currentDirection}
        duration={duration}
        length={length}
        thickness={thickness}
        hitInterval={hitInterval}
        // excludeCollisionGroup={excludeCollisionGroup}
        onHit={onHit}
        onComplete={onComplete}
      />
    </>
  );
};
