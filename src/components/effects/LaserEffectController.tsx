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
  excludeCollisionGroup?: number[];
  onHit?: (other?: unknown, pos?: THREE.Vector3) => void;
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

  // 현재 레이저 위치와 방향을 추적하는 state 추가
  const [currentPosition, setCurrentPosition] = useState(
    playerTransformRef?.current?.position.clone()
  );
  const [currentDirection, setCurrentDirection] = useState(
    playerTransformRef?.current?.direction.clone().normalize()
  );

  // useFrame 대신 사용할 애니메이션 루프 업데이트
  useEffect(() => {
    let frameId: number;
    const startTime = Date.now();
    let isActive = true;

    const updateLoop = () => {
      if (!isActive) return;

      // 동적 업데이트: 외부에서 제공한 콜백을 통해 최신 위치와 방향 가져오기
      if (playerTransformRef?.current?.position) {
        setCurrentPosition(playerTransformRef.current.position.clone());
      }

      if (playerTransformRef?.current?.direction) {
        setCurrentDirection(
          playerTransformRef.current.direction.clone().normalize()
        );
      }

      // 지속 시간이 지나면 종료
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
        excludeCollisionGroup={excludeCollisionGroup}
        onHit={onHit}
        onComplete={onComplete}
      />
    </>
  );
};
