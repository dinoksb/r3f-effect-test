import React, { useEffect } from "react";
import * as THREE from "three";
import { AreaIndicator } from "./AreaIndicator";

interface AreaIndicatorEffectProps {
  targetPosition: THREE.Vector3;
  radius?: number;
  duration?: number;
  onComplete?: () => void;
}

/**
 * 영역 인디케이터를 사용하는 예제 컴포넌트
 * 1. 지정된 위치에 영역 인디케이터를 표시
 * 2. 지정된 지연 시간 후에 효과 발생 (이 예제에서는 간단히 콜백만 호출)
 */
export const AreaIndicatorEffectController: React.FC<
  AreaIndicatorEffectProps
> = ({ targetPosition, duration = 3000, onComplete, radius = 5 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, onComplete]);

  return (
    <>
      {
        <AreaIndicator
          position={targetPosition}
          radius={radius}
          color="#ff2200"
          duration={duration}
          pulseSpeed={1.5}
        />
      }
    </>
  );
};
