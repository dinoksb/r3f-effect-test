import * as THREE from "three";
import { PoisonSwamp } from "./PoisonSwamp";

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

const DEFAULT_DURATION = 2000;
const DEFAULT_HIT_INTERVAL = 500;
const DEFAULT_RADIUS = 3;
const DEFAULT_HEIGHT = 0;
const DEFAULT_OPACITY = 0.8;

// PoisonSwamp Magic Props
export interface PoisonSwampEffectProps {
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

export const createPoisonSwampEffectConfig = (
  targetPosition: THREE.Vector3,
  duration?: number,
  hitInterval?: number,
  radius?: number,
  height?: number,
  opacity?: number
): { [key: string]: PrimitiveOrArray } => {
  return {
    targetPosition: vecToArray(targetPosition),
    duration,
    hitInterval,
    radius,
    height,
    opacity,
  };
};

const parseConfig = (config: { [key: string]: any }) => {
  return {
    targetPosition: arrayToVec(
      config.targetPosition as [number, number, number]
    ),
    duration: (config.duration as number) || DEFAULT_DURATION,
    hitInterval: (config.hitInterval as number) || DEFAULT_HIT_INTERVAL,
    radius: (config.radius as number) || DEFAULT_RADIUS,
    height: (config.height as number) || DEFAULT_HEIGHT,
    opacity: (config.opacity as number) || DEFAULT_OPACITY,
  };
};

export const PoisonSwampEffectController: React.FC<PoisonSwampEffectProps> = ({
  config,
  onHit,
  onComplete,
}) => {
  const { targetPosition, duration, hitInterval, radius, height, opacity } =
    parseConfig(config);
  return (
    <PoisonSwamp
      targetPosition={targetPosition}
      duration={duration}
      hitInterval={hitInterval}
      radius={radius}
      height={height}
      opacity={opacity}
      onHit={onHit}
      onComplete={onComplete}
    />
  );
};
