import * as THREE from "three";
import { PoisonSwamp } from "./PoisonSwamp";
import { EffectType } from "../../types/magic";

// PoisonSwamp 마법 Props
export interface PoisonSwampEffectProps {
  type: EffectType.PoisonSwamp;
  targetPosition: THREE.Vector3;
  duration: number; // effect duration(ms)
  hitInterval: number;
  radius: number;
  height: number;
  opacity: number;
  onHit?: (other?: unknown, pos?: THREE.Vector3) => void;
  onComplete?: () => void;
  debug?: boolean;
}

export const PoisonSwampEffectController: React.FC<PoisonSwampEffectProps> = ({
  type,
  targetPosition,
  duration,
  hitInterval,
  radius,
  height,
  opacity,
  onHit,
  onComplete,
  debug = false,
}) => {
  return (
    <PoisonSwamp
      type={type}
      targetPosition={targetPosition}
      duration={duration}
      hitInterval={hitInterval}
      radius={radius}
      height={height}
      opacity={opacity}
      onHit={onHit}
      onComplete={onComplete}
      debug={debug}
    />
  );
};
