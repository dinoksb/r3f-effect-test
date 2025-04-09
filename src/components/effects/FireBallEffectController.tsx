import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { FireBall } from "./FireBall";
import { Explosion } from "./Explosion";
import { MagicType } from "../../types/magic";

export interface FireBallEffectProps {
  type: MagicType.FireBall;
  speed: number;
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;
  duration: number;
  radius?: number;
  excludeCollisionGroup?: number[];
  onHit?: (other?: unknown, pos?: THREE.Vector3) => void;
  onComplete?: () => void;
  debug?: boolean;
}

export const FireBallEffectController: React.FC<FireBallEffectProps> = ({
  type,
  startPosition,
  speed,
  duration,
  direction,
  radius,
  excludeCollisionGroup,
  onHit,
  onComplete,
  debug = false,
}) => {
  const [spawned, setSpawned] = useState(false);
  const [explosions, setExplosions] = useState<
    { key: number; pos: [number, number, number] }[]
  >([]);
  const explosionKeyCounter = useRef(0);
  // TODO: 추후 삭제 예정
  const caclcStartPosition = startPosition
    .clone()
    .add(direction.clone().multiplyScalar(1 + radius));

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
        type={type}
        startPosition={caclcStartPosition}
        direction={direction}
        speed={speed}
        duration={duration}
        radius={radius}
        excludeCollisionGroup={excludeCollisionGroup}
        onHit={handleFireBallHit}
        onComplete={onComplete}
        debug={debug}
      />

      {explosions.map((ex) => (
        <Explosion
          key={ex.key}
          position={ex.pos}
          scale={radius * 0.6}
          onComplete={() => handleExplosionFinish(ex.key)}
        />
      ))}
    </>
  );
};
