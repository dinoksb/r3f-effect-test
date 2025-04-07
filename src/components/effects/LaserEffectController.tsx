import React, { useEffect, useState } from "react";
import { Laser } from "./Laser";
import { LaserProps } from "../../types/magic";

export const LaserEffectController: React.FC<LaserProps> = ({
  type,
  startPosition,
  direction,
  getLatestPosition,
  getLatestDirection,
  duration = 2000, // 레이저 지속 시간
  length = 15, // 레이저 빔 길이
  thickness = 0.3, // 레이저 빔 두께
  hitInterval = 500,
  onHit,
  onComplete,
}) => {
  const [spawned, setSpawned] = useState(false);

  // 현재 레이저 위치와 방향을 추적하는 state 추가
  const [currentPosition, setCurrentPosition] = useState(startPosition.clone());
  const [currentDirection, setCurrentDirection] = useState(
    direction.clone().normalize()
  );

  // useFrame 대신 사용할 애니메이션 루프 업데이트
  useEffect(() => {
    let frameId: number;
    const startTime = Date.now();
    let isActive = true;

    const updateLoop = () => {
      if (!isActive) return;

      // 동적 업데이트: 외부에서 제공한 콜백을 통해 최신 위치와 방향 가져오기
      if (getLatestPosition) {
        const newPosition = getLatestPosition();
        setCurrentPosition(newPosition);
      }

      if (getLatestDirection) {
        const newDirection = getLatestDirection();
        setCurrentDirection(newDirection);
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

  useEffect(() => {
    setSpawned(true);
  }, []);

  if (!spawned) return null;

  return (
    <>
      <Laser
        type={type}
        startPosition={currentPosition}
        direction={currentDirection}
        duration={duration}
        length={length}
        thickness={thickness}
        hitInterval={hitInterval}
        onHit={onHit}
        onComplete={onComplete}
      />
    </>
  );
};
