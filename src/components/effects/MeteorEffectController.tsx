import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useRapier } from "@react-three/rapier";
import { Ray } from "@dimforge/rapier3d-compat";
import { Meteor } from "./Meteor";
import { MeteorProps } from "../../types/magic";

const COUNT = 1;
const DURATION = 1500;
const SPREAD = 10;
const RAY_ORIGIN_Y_OFFSET = 20;

export const MeteorEffectController: React.FC<MeteorProps> = ({
  targetPosition,
  onHit,
  onComplete,
  debug = false,
}) => {
  const { world } = useRapier();
  const [targetPositions, setTargetPositions] = useState<THREE.Vector3[]>([]);
  const [startPosition, setStartPosition] = useState<THREE.Vector3>();

  const count = useMemo(() => COUNT, []);
  const effectDuration = useMemo(() => DURATION, []);
  const spread = useMemo(() => SPREAD, []);
  const rayOriginYOffset = useMemo(() => RAY_ORIGIN_Y_OFFSET, []);

  // Generate all meteor target positions at once based on the provided target position
  useEffect(() => {
    const baseStart = new THREE.Vector3(
      targetPosition.x,
      targetPosition.y + rayOriginYOffset,
      targetPosition.z - 15
    );
    setStartPosition(baseStart);

    const generated: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
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

    // Set all target positions at once
    setTargetPositions(generated);
  }, [count, spread, rayOriginYOffset, targetPosition, world]);

  if (!startPosition || targetPositions.length === 0) return null;

  return (
    <Meteor
      startPosition={startPosition}
      targetPositions={targetPositions}
      duration={effectDuration}
      onHit={onHit}
      onComplete={onComplete}
      debug={debug}
    />
  );
};
