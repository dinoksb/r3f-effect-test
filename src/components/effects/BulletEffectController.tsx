import * as THREE from "three";
import { Bullet } from "./Bullet";
import { MuzzleFlash } from "./MuzzleFlash";

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

const DEFAULT_SPEED = 100;
const DEFAULT_DURATION = 2000;
const DEFAULT_MUZZLE_FLASH_DURATION = 100;

export interface BulletEffectControllerProps {
  config: { [key: string]: PrimitiveOrArray };
  onHit?: (other?: unknown, pos?: THREE.Vector3) => void;
  onComplete?: () => void;
}

// Utility to convert THREE.Vector3 to array (needed for store/server)
const vecToArray = (vec: THREE.Vector3): [number, number, number] => {
  return [vec.x, vec.y, vec.z];
};

// Utility to convert Vector3 array to THREE.Vector3 (needed for rendering)
const arrayToVec = (arr?: [number, number, number]): THREE.Vector3 => {
  if (!arr) {
    console.error("Missing required config properties");
    return new THREE.Vector3();
  }
  return new THREE.Vector3(arr[0], arr[1], arr[2]);
};

export const createBulletEffectConfig = (
  startPosition: THREE.Vector3,
  direction: THREE.Vector3,
  speed?: number,
  duration?: number
): { [key: string]: PrimitiveOrArray } => {
  return {
    startPosition: vecToArray(startPosition),
    direction: vecToArray(direction),
    speed: speed || DEFAULT_SPEED,
    duration: duration || DEFAULT_DURATION,
  };
};

const parseConfig = (config: { [key: string]: any }) => {
  return {
    startPosition: arrayToVec(config.startPosition as [number, number, number]),
    direction: arrayToVec(config.direction as [number, number, number]),
    speed: (config.speed as number) || DEFAULT_SPEED,
    duration: (config.duration as number) || DEFAULT_DURATION,
  };
};

export const BulletEffectController: React.FC<BulletEffectControllerProps> = ({
  config,
  onHit,
  onComplete,
}) => {
  const { startPosition, direction, speed, duration } = parseConfig(config);
  if (!startPosition || !direction || !speed || !duration) {
    console.error(
      "[BulletEffectController] Missing required config properties"
    );
    onComplete?.();
    return null;
  }

  const calcStartPosition = startPosition
    .clone()
    .add(direction.clone().multiplyScalar(1));

  return (
    <>
      <Bullet
        startPosition={calcStartPosition}
        direction={direction}
        speed={speed}
        duration={duration}
        onHit={onHit}
        onComplete={onComplete}
      />
      {
        <MuzzleFlash
          config={{
            position: vecToArray(calcStartPosition),
            direction: vecToArray(direction),
            duration: DEFAULT_MUZZLE_FLASH_DURATION,
          }}
        />
      }
    </>
  );
};
