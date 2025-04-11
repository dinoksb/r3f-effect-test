import * as THREE from "three";
import { PoisonSwamp } from "./PoisonSwamp";
import { EffectType } from "../../types/effect";

// PoisonSwamp 마법 Props
export interface PoisonSwampEffectProps {
  type: EffectType.PoisonSwamp;
  targetPosition: THREE.Vector3;
  duration: number; // effect duration(ms)
  hitInterval: number;
  radius: number;
  height: number;
  opacity: number;
  excludeCollisionGroup?: number[];
  onHit?: (other?: unknown, type?: EffectType, pos?: THREE.Vector3) => void;
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
  excludeCollisionGroup,
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
      excludeCollisionGroup={excludeCollisionGroup}
      onHit={onHit}
      onComplete={onComplete}
      debug={debug}
    />
  );
};
