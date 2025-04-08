import React, { useState, useEffect } from "react";
import * as THREE from "three";
import { TargetIndicator } from "./TargetIndicator";

interface TargetIndicatorEffectProps {
  targetPosition: THREE.Vector3;
  indicatorDuration?: number;
  impactDelay?: number;
  onImpact?: () => void;
}

/**
 * 타겟 인디케이터를 사용하는 예제 컴포넌트
 * 1. 지정된 위치에 타겟 인디케이터를 표시
 * 2. 지정된 지연 시간 후에 효과 발생 (이 예제에서는 간단히 콜백만 호출)
 */
export const TargetIndicatorEffectController: React.FC<
  TargetIndicatorEffectProps
> = ({
  targetPosition,
  indicatorDuration = 1500, // 기본 1.5초 동안 인디케이터 표시
  impactDelay = 2000, // 기본 2초 후에 임팩트
  onImpact,
}) => {
  const [showIndicator, setShowIndicator] = useState(true);

  // 인디케이터 표시 후 임팩트 효과 실행
  useEffect(() => {
    // 인디케이터 표시 종료
    const indicatorTimer = setTimeout(() => {
      setShowIndicator(false);
    }, indicatorDuration);

    // 임팩트 효과 실행
    const impactTimer = setTimeout(() => {
      onImpact?.();
    }, impactDelay);

    return () => {
      clearTimeout(indicatorTimer);
      clearTimeout(impactTimer);
    };
  }, [indicatorDuration, impactDelay, onImpact]);

  return (
    <>
      {showIndicator && (
        <TargetIndicator
          position={targetPosition}
          radius={2}
          color="#ff3300"
          duration={indicatorDuration}
          pulseSpeed={1}
        />
      )}
    </>
  );
};
