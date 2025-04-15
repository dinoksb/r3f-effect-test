import React, { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { LightningStrike } from "./LightningStrike";
import { useRapier } from "@react-three/rapier";
import { Ray } from "@dimforge/rapier3d-compat";

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

const DEFAULT_STRIKE_COUNT = 5;
const DEFAULT_SPREAD = 1;
const DEFAULT_DURATION = 500;
const DEFAULT_RAY_ORIGIN_Y_OFFSET = 15;

export interface LightningEffectControllerProps {
  config: { [key: string]: PrimitiveOrArray };
  onHit?: (other?: unknown, pos?: THREE.Vector3) => void;
  onComplete?: () => void;
}

const vecToArray = (vec: THREE.Vector3): [number, number, number] => {
  return [vec.x, vec.y, vec.z];
};

const arrayToVec = (arr?: [number, number, number]): THREE.Vector3 => {
  if (!arr) {
    console.error("Missing required config properties");
    return new THREE.Vector3();
  }
  return new THREE.Vector3(arr[0], arr[1], arr[2]);
};

export const createLightningEffectConfig = (
  targetPosition: THREE.Vector3,
  duration?: number,
  strikeCount?: number,
  spread?: number,
  rayOriginYOffset?: number
): { [key: string]: PrimitiveOrArray } => {
  return {
    targetPosition: vecToArray(targetPosition),
    duration,
    strikeCount,
    spread,
    rayOriginYOffset,
  };
};

const parseConfig = (config: { [key: string]: any }) => ({
  targetPosition: arrayToVec(config.targetPosition as [number, number, number]),
  duration: (config.duration as number) || DEFAULT_DURATION,
  strikeCount: (config.strikeCount as number) || DEFAULT_STRIKE_COUNT,
  spread: (config.spread as number) || DEFAULT_SPREAD,
  rayOriginYOffset:
    (config.rayOriginYOffset as number) || DEFAULT_RAY_ORIGIN_Y_OFFSET,
});

export const LightningEffectController: React.FC<
  LightningEffectControllerProps
> = ({ config, onHit, onComplete }) => {
  const parsedConfig = useMemo(() => parseConfig(config), [config]);
  const { targetPosition, duration, strikeCount, spread, rayOriginYOffset } =
    parsedConfig;

  const [actualTargets, setActualTargets] = useState<THREE.Vector3[]>([]);
  const [commonStartPosition, setCommonStartPosition] =
    useState<THREE.Vector3 | null>(null);
  const [isCalculating, setIsCalculating] = useState(true);
  const { world } = useRapier();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    console.log(
      "LightningEffectController mounted, calculating targets for:",
      targetPosition
    );
    const targets: THREE.Vector3[] = [];

    for (let i = 0; i < strikeCount; i++) {
      const randomAngle = Math.random() * Math.PI * 2;
      const randomRadius = Math.random() * spread;
      const proposedTargetPos = new THREE.Vector3(
        targetPosition.x + Math.cos(randomAngle) * randomRadius,
        targetPosition.y,
        targetPosition.z + Math.sin(randomAngle) * randomRadius
      );

      const rayDirectionVec = new THREE.Vector3(0, -1, 0);
      const individualRayOrigin = proposedTargetPos
        .clone()
        .setY(proposedTargetPos.y + rayOriginYOffset);

      const ray = new Ray(individualRayOrigin, rayDirectionVec);
      const maxDistance = rayOriginYOffset + 5;
      const hit = world.castRay(ray, maxDistance, true);

      if (hit) {
        console.log("hit", hit);
        const rapierHitPoint = ray.pointAt(hit.timeOfImpact);
        const threeHitPoint = new THREE.Vector3(
          rapierHitPoint.x,
          rapierHitPoint.y,
          rapierHitPoint.z
        );
        threeHitPoint.y += 0.01;
        targets.push(threeHitPoint);
      } else {
        console.log(
          "no hit - max distance:",
          maxDistance,
          "ray origin Y:",
          individualRayOrigin.y
        );
        const fallbackTarget = targetPosition.clone();
        fallbackTarget.y = 0.01;
        targets.push(fallbackTarget);
      }
    }

    if (targets.length > 0) {
      const averageTarget = targets
        .reduce((acc, pos) => acc.add(pos), new THREE.Vector3())
        .divideScalar(targets.length);
      const commonStart = averageTarget
        .clone()
        .add(new THREE.Vector3(0, rayOriginYOffset, 0));
      setActualTargets(targets);
      setCommonStartPosition(commonStart);
      setIsCalculating(false);

      timerRef.current = setTimeout(() => {
        onComplete?.();
      }, duration);
    } else {
      console.log("Controller found no targets and no fallback.");
      onComplete?.();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [parsedConfig, onComplete]); // ✅ Safely managed

  const handleHit = (other: unknown, pos: THREE.Vector3) => {
    onHit?.(other, pos);
    onComplete?.();
  };

  if (isCalculating || actualTargets.length === 0 || !commonStartPosition) {
    return null;
  }

  return (
    <LightningStrike
      commonStartPosition={commonStartPosition}
      targetPositions={actualTargets}
      duration={duration}
      onHit={handleHit}
      onComplete={onComplete}
    />
  );
};
