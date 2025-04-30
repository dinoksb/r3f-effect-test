import * as THREE from "three";
import { FireBall } from "./FireBall";
import {
  Collider,
  InteractionGroups,
  RigidBody,
} from "@dimforge/rapier3d-compat";

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

const DEFAULT_SPEED = 20; // Slower than bullet for visual effect
const DEFAULT_DURATION = 2000;
const DEFAULT_SCALE = 1;

// Configuration accepted by the component
export interface FireBallEffectControllerProps {
  config: { [key: string]: PrimitiveOrArray };
  collisionGroups?: InteractionGroups;
  owner?: RigidBody;
  onHit?: (
    pos?: THREE.Vector3,
    rigidBody?: RigidBody,
    collider?: Collider
  ) => void;
  onComplete?: () => void;
}

// For creating configuration objects
export interface FireBallEffectConfig {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;
  speed?: number;
  duration?: number;
  scale?: number;
  color?: string;
}

export const createFireBallEffectConfig = (
  config: FireBallEffectConfig
): { [key: string]: PrimitiveOrArray } => {
  return {
    startPosition: config.startPosition.toArray(),
    direction: config.direction.toArray(),
    speed: config.speed || DEFAULT_SPEED,
    duration: config.duration || DEFAULT_DURATION,
    scale: config.scale || DEFAULT_SCALE,
    color: config.color,
  };
};

const parseConfig = (config: { [key: string]: any }) => {
  return {
    startPosition: new THREE.Vector3(...config.startPosition),
    direction: new THREE.Vector3(...config.direction),
    speed: config.speed || DEFAULT_SPEED,
    duration: config.duration || DEFAULT_DURATION,
    scale: config.scale || DEFAULT_SCALE,
    color: config.color,
  };
};

export const FireBallEffectController: React.FC<
  FireBallEffectControllerProps
> = ({ config, collisionGroups, owner, onHit, onComplete }) => {
  const { startPosition, direction, speed, duration, scale, color } =
    parseConfig(config);

  if (!startPosition || !direction || !speed || !duration) {
    console.error(
      "[FireBallEffectController] Missing required config properties"
    );
    onComplete?.();
    return null;
  }

  return (
    <FireBall
      startPosition={startPosition}
      direction={direction}
      color={color}
      scale={scale}
      speed={speed}
      duration={duration}
      collisionGroups={collisionGroups}
      owner={owner}
      onHit={onHit}
      onComplete={onComplete}
    />
  );
};
