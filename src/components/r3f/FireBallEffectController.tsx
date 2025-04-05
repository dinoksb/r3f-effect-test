import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { FireBall } from './FireBall';

interface FireBallEffectControllerProps {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;      // 외부에서 직접 넘기는 방향 (normalized)
  speed?: number;                 // 단위: units per second
  duration?: number;              // lifespan in milliseconds
  onComplete: () => void;
}

export const FireBallEffectController: React.FC<FireBallEffectControllerProps> = ({
  startPosition,
  direction,
  speed = 10,
  duration = 1000,
  onComplete,
}) => {
  const [spawned, setSpawned] = useState(false);

  useEffect(() => {
    setSpawned(true);
  }, []);

  if (!spawned) return null;

  return (
    <FireBall
      startPosition={startPosition}
      direction={direction}
      speed={speed}
      duration={duration}
      onComplete={onComplete}
    />
  );
};
