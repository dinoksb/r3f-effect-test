import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { FireBall } from "./FireBall";
import { Explosion } from "./Explosion";

interface FireBallEffectControllerProps {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3; // 외부에서 직접 넘기는 방향 (normalized)
  speed?: number; // 단위: units per second
  duration?: number; // lifespan in milliseconds
  onHit: (other: unknown, pos: THREE.Vector3) => void;
  onComplete: () => void;
}

export const FireBallEffectController: React.FC<
  FireBallEffectControllerProps
> = ({
  startPosition,
  direction,
  speed = 10,
  duration = 2000,
  onHit,
  onComplete,
}) => {
  const [spawned, setSpawned] = useState(false);
  const [explosions, setExplosions] = useState<
    { key: number; pos: [number, number, number] }[]
  >([]);
  const explosionKeyCounter = useRef(0);

  // only for debug
  const caclcStartPosition = startPosition
    .clone()
    .add(direction.clone().multiplyScalar(1));

  const handleExplosionFinish = useCallback(
    (key: number) => {
      setExplosions((prev) => prev.filter((ex) => ex.key !== key));
      onComplete?.();
    },
    [onComplete]
  );

  const handleFireBallHit = (other: unknown, pos: THREE.Vector3) => {
    explosionKeyCounter.current++;
    setExplosions((prev) => [
      ...prev,
      {
        key: explosionKeyCounter.current,
        pos: [pos.x, pos.y, pos.z],
      },
    ]);
    onHit?.(other, pos);
  };

  useEffect(() => {
    setSpawned(true);
  }, []);

  if (!spawned) return null;

  return (
    <>
      <FireBall
        startPosition={caclcStartPosition}
        direction={direction}
        speed={speed}
        duration={duration}
        onHit={handleFireBallHit}
        onComplete={onComplete}
      />

      {explosions.map((ex) => (
        <Explosion
          key={ex.key}
          position={ex.pos}
          scale={0.5}
          onFinish={() => handleExplosionFinish(ex.key)}
        />
      ))}
    </>
  );
};
