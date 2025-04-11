import * as THREE from "three";
import { EffectType } from "../../types/effect";
import { Bullet } from "./Bullet";
import { MuzzleFlash } from "./MuzzleFlash";

export interface BulletEffectProps {
  type: EffectType.Bullet;
  speed: number;
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;
  size: THREE.Vector3;
  duration: number; // effect duration(ms)
  excludeCollisionGroup?: number[];
  onHit?: (other?: unknown, type?: EffectType, pos?: THREE.Vector3) => void;
  onComplete?: () => void;
  debug?: boolean;
}

export const BulletEffectController: React.FC<BulletEffectProps> = ({
  type,
  speed,
  startPosition,
  direction,
  size,
  duration,
  excludeCollisionGroup,
  onHit,
  onComplete,
  debug,
}) => {
  return (
    <>
      <Bullet
        type={type}
        speed={speed}
        startPosition={startPosition}
        direction={direction}
        size={size}
        duration={duration}
        excludeCollisionGroup={excludeCollisionGroup}
        onHit={onHit}
        onComplete={onComplete}
        debug={debug}
      />
      {
        <MuzzleFlash
          position={startPosition}
          direction={direction}
          duration={100}
        />
      }
    </>
  );
};
