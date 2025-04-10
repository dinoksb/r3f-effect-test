import React, { useEffect } from "react";
import * as THREE from "three";
import { AreaIndicator } from "./AreaIndicator";
import { EffectType } from "../../types/magic";
export interface AreaIndicatorEffectProps {
  type: EffectType.AreaIndicator;
  targetPosition: THREE.Vector3;
  radius: number;
  duration?: number;
  onComplete?: () => void;
}

export const AreaIndicatorEffectController: React.FC<
  AreaIndicatorEffectProps
> = ({ targetPosition, duration = 2000, onComplete, radius = 5 }) => {
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
