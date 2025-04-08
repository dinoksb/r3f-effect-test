import React, { useMemo } from "react";
import * as THREE from "three";
import { useRapier } from "@react-three/rapier";
import { Ray } from "@dimforge/rapier3d-compat";
import { Meteor } from "./Meteor";
import { MeteorProps } from "../../types/magic";

export const MeteorEffectController: React.FC<MeteorProps> = ({
  startPosition,
  targetPosition,
  count,
  radius,
  duration,
  spread,
  rayOriginYOffset,
  onHit,
  onComplete,
  debug = false,
}) => {
  const { world } = useRapier();

  // Use useMemo instead of useState + useEffect for synchronous calculation
  const targetPositions = useMemo(() => {
    const generated: THREE.Vector3[] = [];

    if (count === 1) {
      generated.push(targetPosition);
    } else {
      generated.push(targetPosition);
      for (let i = 1; i < count; i++) {
        const randomAngle = Math.random() * Math.PI * 2;
        const randomRadius = Math.random() * spread;
        const proposedTarget = new THREE.Vector3(
          targetPosition.x + Math.cos(randomAngle) * randomRadius,
          targetPosition.y,
          targetPosition.z + Math.sin(randomAngle) * randomRadius
        );

        const rayOrigin = proposedTarget
          .clone()
          .setY(proposedTarget.y + rayOriginYOffset);
        const ray = new Ray(rayOrigin, new THREE.Vector3(0, -1, 0));
        const maxDistance = rayOriginYOffset + 5;
        const hit = world.castRay(ray, maxDistance, true);

        if (hit) {
          const rapierHit = ray.pointAt(hit.timeOfImpact);
          const groundPoint = new THREE.Vector3(
            rapierHit.x,
            rapierHit.y + 0.1,
            rapierHit.z
          );
          generated.push(groundPoint);
        } else {
          const fallback = proposedTarget.clone();
          fallback.y += 0.1;
          generated.push(fallback);
        }
      }
    }

    return generated;
  }, [count, spread, rayOriginYOffset, targetPosition, world]);

  return (
    <Meteor
      startPosition={startPosition}
      targetPositions={targetPositions}
      radius={radius}
      duration={duration}
      onHit={onHit}
      onComplete={onComplete}
      debug={debug}
    />
  );
};
