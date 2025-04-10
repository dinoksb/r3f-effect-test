import * as THREE from "three";
import { EffectType } from "../../types/effect";
import { Dust } from "./Dust";

export interface DustEffectProps {
  type: EffectType.Dust;
  startPosition: THREE.Vector3;
  size?: number;
  opacity?: number;
  duration: number; // effect duration(ms)
  onComplete?: () => void;
}

export const DustEffectController: React.FC<DustEffectProps> = ({
  type,
  startPosition,
  size = 1,
  opacity = 0.1,
  duration,
  onComplete,
}) => {
  return (
    <Dust
      type={type}
      startPosition={startPosition}
      size={size}
      opacity={opacity}
      duration={duration}
      onComplete={onComplete}
    />
  );
};
