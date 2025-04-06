import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Laser } from './Laser';
import { Explosion } from './Explosion';

interface LaserEffectControllerProps {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;      // 외부에서 직접 넘기는 방향 (normalized)
  duration?: number;             // lifespan in milliseconds
  length?: number;               // 레이저 빔 길이
  thickness?: number;            // 레이저 빔 두께
  onComplete: () => void;
  // 동적 위치와 방향을 가져오는 콜백 함수들
  getLatestPosition?: () => THREE.Vector3;
  getLatestDirection?: () => THREE.Vector3;
}

export const LaserEffectController: React.FC<LaserEffectControllerProps> = ({
  startPosition,
  direction,
  duration = 1500,               // 레이저 지속 시간
  length = 15,                   // 레이저 빔 길이
  thickness = 0.3,               // 레이저 빔 두께
  onComplete,
  getLatestPosition,
  getLatestDirection,
}) => {
  const [spawned, setSpawned] = useState(false);
  const [explosions, setExplosions] = useState<
    { key: number; pos: [number, number, number] }[]
  >([]);
  
  // 현재 레이저 위치와 방향을 저장하는 ref (매 프레임 업데이트)
  const currentPositionRef = useRef(startPosition.clone());
  const currentDirectionRef = useRef(direction.clone().normalize());
  
  const explosionKeyCounter = useRef(0);

  // useFrame 대신 사용할 애니메이션 루프 업데이트
  useEffect(() => {
    let frameId: number;
    const startTime = Date.now();
    let isActive = true;

    const updateLoop = () => {
      if (!isActive) return;

      // 동적 업데이트: 외부에서 제공한 콜백을 통해 최신 위치와 방향 가져오기
      if (getLatestPosition) {
        currentPositionRef.current.copy(getLatestPosition());
      }
      
      if (getLatestDirection) {
        currentDirectionRef.current.copy(getLatestDirection()).normalize();
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
  }, [duration, getLatestPosition, getLatestDirection, onComplete]);

  const handleExplosionFinish = useCallback((key: number) => {
    setExplosions((prev) => prev.filter((ex) => ex.key !== key));
    // 폭발 효과가 끝나도 레이저 자체 수명은 duration에 따름
  }, []);

  const handleLaserHit = (other: unknown, pos: THREE.Vector3) => {
    explosionKeyCounter.current++;
    setExplosions((prev) => [
      ...prev,
      {
        key: explosionKeyCounter.current,
        pos: [pos.x, pos.y, pos.z],
      },
    ]);
  };

  useEffect(() => {
    setSpawned(true);
  }, []);

  if (!spawned) return null;

  return (
    <>
      <Laser
        startPosition={currentPositionRef.current}
        direction={currentDirectionRef.current}
        duration={duration}
        length={length}
        thickness={thickness}
        onHit={handleLaserHit}
        onComplete={onComplete}
      />
  
      {explosions.map((ex) => (
        <Explosion
          key={ex.key}
          position={ex.pos}
          scale={0.4}                 // 레이저 폭발은 약간 작게
          onFinish={() => handleExplosionFinish(ex.key)}
        />
      ))}
    </>
  );
}; 