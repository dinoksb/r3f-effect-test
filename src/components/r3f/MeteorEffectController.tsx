import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useRapier } from '@react-three/rapier';
import { Ray } from '@dimforge/rapier3d-compat';
import { Meteor } from './Meteor';

interface MeteorEffectControllerProps {
  targetPosition: THREE.Vector3;
  count?: number;
  startPosition?: THREE.Vector3;
  onComplete: () => void;
}

interface FireBallInfo {
  id: number;
  target: THREE.Vector3;
}

export const MeteorEffectController: React.FC<MeteorEffectControllerProps> = ({
  targetPosition,
  count = 5,
  startPosition: initialStartPosition,
  onComplete,
}) => {
  const { world } = useRapier();
  const [spawnedFireballs, setSpawnedFireballs] = useState<FireBallInfo[]>([]);
  const [startPosition, setStartPosition] = useState<THREE.Vector3>();
  const [impactCount, setImpactCount] = useState(0);

  const effectDuration = 1500;
  const spread = 10;
  const rayOriginYOffset = 20;

  useEffect(() => {
    if (impactCount >= count) {
      onComplete();
    }
  }, [impactCount, count, onComplete]);

  useEffect(() => {
    const baseStart = initialStartPosition || new THREE.Vector3(
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

      const rayOrigin = proposedTarget.clone().setY(proposedTarget.y + rayOriginYOffset);
      const ray = new Ray(rayOrigin, new THREE.Vector3(0, -1, 0));
      const maxDistance = rayOriginYOffset + 5;
      const hit = world.castRay(ray, maxDistance, true);

      if (hit) {
        const rapierHit = ray.pointAt(hit.timeOfImpact);
        const groundPoint = new THREE.Vector3(rapierHit.x, rapierHit.y + 0.1, rapierHit.z);
        generated.push(groundPoint);
      } else {
        const fallback = proposedTarget.clone();
        fallback.y += 0.1;
        generated.push(fallback);
      }
    }

    generated.forEach((target, index) => {
      const delay = 100 * index + Math.random() * 100;

      setTimeout(() => {
        setSpawnedFireballs((prev) => [...prev, { id: index, target }]);
      }, delay);
    });
  }, [count, targetPosition, initialStartPosition, world]);

  if (!startPosition) return null;

  return (
    <>
      {spawnedFireballs.map((fireball) => (
        <Meteor
          key={fireball.id}
          startPosition={startPosition}
          targetPosition={fireball.target}
          duration={effectDuration}
          onComplete={() => setImpactCount((prev) => prev + 1)}
        />
      ))}
    </>
  );
};
