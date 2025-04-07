import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { useRapier } from "@react-three/rapier";
import { Ray } from "@dimforge/rapier3d-compat";
import { LightningStrike } from "./LightningStrike";
import { LightningProps } from "../../types/magic";

export const LightningEffectController: React.FC<LightningProps> = ({
  targetPosition,
  duration,
  strikeCount,
  spread,
  rayOriginYOffset,
  onHit,
  onComplete,
  debug = false,
}) => {
  const [actualTargets, setActualTargets] = useState<THREE.Vector3[]>([]);
  const [startPosition, setStartPosition] = useState<THREE.Vector3 | null>(
    null
  );
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
      // Calculate slightly randomized target points *around* the initial targetPosition
      const randomAngle = Math.random() * Math.PI * 2;
      const randomRadius = Math.random() * spread;
      const proposedTargetPos = new THREE.Vector3(
        targetPosition.x + Math.cos(randomAngle) * randomRadius,
        targetPosition.y, // Keep the target Y, raycasting will find the actual ground
        targetPosition.z + Math.sin(randomAngle) * randomRadius
      );

      // Cast ray down towards the proposed target
      const rayDirectionVec = new THREE.Vector3(0, -1, 0); // Straight down
      // Adjust ray origin to be directly above the proposed target
      const individualRayOrigin = proposedTargetPos
        .clone()
        .setY(proposedTargetPos.y + rayOriginYOffset);

      const ray = new Ray(individualRayOrigin, rayDirectionVec);
      const maxDistance = rayOriginYOffset + 5; // Ray distance
      const hit = world.castRay(
        ray,
        maxDistance,
        true,
        undefined,
        undefined,
        undefined,
        undefined // No need to exclude player collider anymore
      );

      if (hit) {
        const rapierHitPoint = ray.pointAt(hit.timeOfImpact);
        const threeHitPoint = new THREE.Vector3(
          rapierHitPoint.x,
          rapierHitPoint.y,
          rapierHitPoint.z
        );
        threeHitPoint.y += 0.01; // Elevate slightly
        targets.push(threeHitPoint);
      } else {
        // If raycast fails, use the initially provided target position slightly elevated
        console.log("Controller ray missed, using initial target.");
        const fallbackTarget = targetPosition.clone();
        fallbackTarget.y += 0.01;
        targets.push(fallbackTarget);
      }
    }

    if (targets.length > 0) {
      console.log(
        `Controller found ${targets.length} actual targets near`,
        targetPosition
      );
      setActualTargets(targets);

      // Calculate start position based on the average of *actual* hit targets
      const averageTarget = targets
        .reduce((acc, pos) => acc.clone().add(pos), new THREE.Vector3(0, 0, 0))
        .divideScalar(targets.length);
      const commonStart = averageTarget
        .clone()
        .add(new THREE.Vector3(0, rayOriginYOffset, 0)); // Start above average hit point
      setStartPosition(commonStart);
      setIsCalculating(false);

      timerRef.current = setTimeout(() => {
        onComplete();
      }, duration);
    } else {
      // This case should be less likely now with the fallback
      console.log("Controller found no targets and no fallback.");
      onComplete();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    targetPosition,
    world,
    onComplete,
    duration,
    strikeCount,
    spread,
    rayOriginYOffset,
  ]);

  if (isCalculating || actualTargets.length === 0 || !startPosition) {
    return null;
  }

  return (
    <LightningStrike
      commonStartPosition={startPosition}
      targetPositions={actualTargets}
      onHit={onHit}
      debug={debug}
    />
  );
};
