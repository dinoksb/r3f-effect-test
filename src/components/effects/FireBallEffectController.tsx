import * as THREE from "three";
import { FireBall } from "./FireBall";
import { EffectType } from "../../types/effect";

export interface FireBallEffectProps {
  type: EffectType.FireBall;
  speed: number;
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;
  duration: number; // effect duration(ms)
  radius?: number;
  excludeCollisionGroup?: number | number[];
  onHit?: (other?: unknown, type?: EffectType, pos?: THREE.Vector3) => void;
  onImpact?: (type: EffectType, pos: THREE.Vector3) => void;
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
  return (
    <>
      <FireBall
        type={type}
        startPosition={startPosition}
        direction={direction}
        speed={speed}
        duration={duration}
        radius={radius}
        excludeCollisionGroup={excludeCollisionGroup}
        onHit={onHit}
        onComplete={onComplete}
        debug={debug}
      />
    </>
  );
};
