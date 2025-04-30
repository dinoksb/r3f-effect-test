import React, { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import { useRapier } from "@react-three/rapier";
import { Collider, Ray, RigidBody } from "@dimforge/rapier3d-compat";
import { Meteor } from "./Meteor";
import { AreaIndicator } from "./AreaIndicator";

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

const DEFAULT_COUNT = 1;
const DEFAULT_RADIUS = 3;
const DEFAULT_DURATION = 2000;
const DEFAULT_SPREAD = 10;
const DEFAULT_RAY_ORIGIN_Y_OFFSET = 15;

// Meteor Magic Props
export interface MeteorEffectControllerProps {
  config: { [key: string]: PrimitiveOrArray };
  onHit?: (
    position: THREE.Vector3,
    rigidBody?: RigidBody,
    collider?: Collider
  ) => boolean;
  onImpact?: (pos: THREE.Vector3) => void;
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

export const createMeteorEffectConfig = (
  targetPosition: THREE.Vector3,
  count?: number,
  radius?: number
): { [key: string]: PrimitiveOrArray } => {
  return {
    targetPosition: vecToArray(targetPosition),
    count,
    radius,
  };
};

const parseConfig = (config: { [key: string]: PrimitiveOrArray }) => {
  return {
    targetPosition: arrayToVec(
      config.targetPosition as [number, number, number]
    ),
    count: (config.count as number) || DEFAULT_COUNT,
    radius: (config.radius as number) || DEFAULT_RADIUS,
  };
};

export const MeteorEffectController: React.FC<MeteorEffectControllerProps> = ({
  config,
  onHit,
  onImpact,
  onComplete,
}) => {
  const { targetPosition, count, radius } = parseConfig(config);

  const { world } = useRapier();
  const [meteorCompleteCount, setMeteorCompleteCount] = useState(0);
  const [targetPositions, setTargetPositions] = useState<THREE.Vector3[]>([]);
  const [calculatedStartPosition, setCalculatedStartPosition] =
    useState<THREE.Vector3>();

  // Random elements ref - values are maintained throughout component lifecycle
  const initializedRef = useRef(false);
  const randomOffsetXRef = useRef(Math.random() * 2 - 1);
  const randomOffsetZRef = useRef(Math.random() * 2 - 1);

  // Generate all meteor target positions at once based on the provided target position
  useEffect(() => {
    if (initializedRef.current) return; // Don't run again if already initialized

    // Use random values from ref - maintains the same values even after re-rendering
    const randomOffsetRange = 20; // Random range for start position
    const baseStart = new THREE.Vector3(
      targetPosition.x + randomOffsetXRef.current * randomOffsetRange,
      targetPosition.y + DEFAULT_RAY_ORIGIN_Y_OFFSET,
      targetPosition.z - 15 + randomOffsetZRef.current * randomOffsetRange
    );
    setCalculatedStartPosition(baseStart);

    const generated: THREE.Vector3[] = [];

    // When there's only one meteor, use targetPosition as is
    if (count === 1) {
      generated.push(targetPosition.clone());
    } else {
      // First meteor always uses the exact targetPosition
      generated.push(targetPosition.clone());

      // Pre-generate and fix random values for each meteor position
      const randomAngles: number[] = [];
      const randomRadii: number[] = [];

      for (let i = 1; i < count; i++) {
        randomAngles[i] = Math.random() * Math.PI * 2;
        randomRadii[i] = Math.random() * DEFAULT_SPREAD;
      }

      // Remaining meteors are generated at random positions (using pre-calculated random values)
      for (let i = 1; i < count; i++) {
        const randomAngle = randomAngles[i];
        const randomRadius = randomRadii[i];
        const proposedTarget = new THREE.Vector3(
          targetPosition.x + Math.cos(randomAngle) * randomRadius,
          targetPosition.y,
          targetPosition.z + Math.sin(randomAngle) * randomRadius
        );

        const rayOrigin = proposedTarget
          .clone()
          .setY(proposedTarget.y + DEFAULT_RAY_ORIGIN_Y_OFFSET);
        const ray = new Ray(rayOrigin, new THREE.Vector3(0, -1, 0));
        const maxDistance = DEFAULT_RAY_ORIGIN_Y_OFFSET + 5;
        const hit = world.castRay(ray, maxDistance, true);

        if (hit) {
          const rapierHit = ray.pointAt(hit.timeOfImpact);
          const groundPoint = new THREE.Vector3(
            rapierHit.x,
            rapierHit.y + 0.01,
            rapierHit.z
          );
          generated.push(groundPoint);
        } else {
          const fallback = proposedTarget.clone();
          fallback.y = 0.01;
          generated.push(fallback);
        }
      }
    }

    // Set all target positions at once and mark as initialized
    setTargetPositions(generated);
    initializedRef.current = true;
  }, [count, targetPosition, world]);

  // Handle meteor hit event wrapper
  const handleHit = (
    position: THREE.Vector3,
    rigidBody?: RigidBody,
    collider?: Collider
  ) => {
    if (onHit) {
      return onHit(position, rigidBody, collider);
    }
    return true;
  };

  const onHandleMeteorsComplete = () => {
    const currentIndex = meteorCompleteCount;
    setMeteorCompleteCount((prev) => prev + 1);

    if (targetPositions[currentIndex]) {
      onImpact?.(targetPositions[currentIndex]);
    }

    if (currentIndex === targetPositions.length - 1) {
      onComplete?.();
    }
  };

  if (!calculatedStartPosition || targetPositions.length === 0) return null;

  return (
    <>
      {targetPositions.map((targetPos, index) => (
        <React.Fragment key={`meteor-${index}`}>
          <Meteor
            startPosition={calculatedStartPosition}
            targetPosition={targetPos}
            radius={radius}
            duration={DEFAULT_DURATION}
            onHit={handleHit}
            onComplete={onHandleMeteorsComplete}
            startDelay={100 * index + Math.random() * 100}
          />

          <AreaIndicator
            config={{
              position: vecToArray(targetPos),
              radius: radius,
              duration: DEFAULT_DURATION,
            }}
            onComplete={() => {}}
          />
        </React.Fragment>
      ))}
    </>
  );
};
