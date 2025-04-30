import React, { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import {
  Collider,
  InteractionGroups,
  RigidBody,
} from "@dimforge/rapier3d-compat";

interface FireBallProps {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3; // Normalized direction vector
  speed: number; // Distance traveled per second
  duration: number; // Lifespan (milliseconds)
  color?: THREE.ColorRepresentation;
  scale?: number;
  collisionGroups?: InteractionGroups;
  owner?: unknown; // Use a more type-safe unknown instead of any
  onHit?: (
    pos?: THREE.Vector3,
    rigidBody?: RigidBody,
    collider?: Collider
  ) => void; // Callback on collision
  onComplete?: () => void;
}

export const FireBall: React.FC<FireBallProps> = ({
  startPosition,
  direction,
  speed,
  duration,
  color = "#ff3300",
  scale = 1,
  collisionGroups,
  owner,
  onHit,
  onComplete,
}) => {
  const [active, setActive] = useState(true);

  // FireBall's "creation time"
  const startTime = useRef(Date.now());
  const onCompleteRef = useRef(onComplete);

  // Group reference for positioning
  const groupRef = useRef<THREE.Group>(null);

  // Refs pointing to the inner Mesh & Light
  const outerRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Access Rapier physics world
  const { rapier, world } = useRapier();

  // Normalize direction vector
  const normalizedDirection = direction.clone().normalize();

  // FireBall removal function
  const removeBall = useCallback(() => {
    if (active) {
      setActive(false);
      if (onCompleteRef.current) onCompleteRef.current();
    }
  }, [active]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Reset the timer when the component mounts
    startTime.current = Date.now();
    setActive(true);
  }, []);

  // Update position and effects every frame
  useFrame((_, delta) => {
    if (!active) return;

    const elapsed = Date.now() - startTime.current;
    // Destroy when lifetime ends
    if (elapsed > duration) {
      removeBall();
      return;
    }

    const group = groupRef.current;
    if (!group) return;

    // Calculate distance to travel in this frame
    const frameTravelDistance = speed * delta;
    // Use current position as the origin for the ray
    const origin = group.position;

    console.log("owner: ", owner);

    // Use Rapier's ray casting for collision detection
    const ray = new rapier.Ray(origin, normalizedDirection);

    const hit = (world as any).castRay(
      ray,
      frameTravelDistance,
      true,
      undefined,
      collisionGroups,
      undefined,
      owner
    );

    if (hit) {
      // Calculate hit point
      const hitPoint = ray.pointAt(hit.timeOfImpact);
      const hitPointVec3 = new THREE.Vector3(
        hitPoint.x,
        hitPoint.y,
        hitPoint.z
      );
      const hitCollider = hit.collider;
      const hitRigidBody = hitCollider.parent();

      // Move group to exact hit point
      group.position.copy(hitPointVec3);

      // Call onHit callback with collision data
      onHit?.(hitPointVec3, hitRigidBody, hitCollider);
      removeBall();
      return;
    } else {
      // No hit, advance the fireball's position
      const nextPosition = origin
        .clone()
        .addScaledVector(normalizedDirection, frameTravelDistance);
      group.position.copy(nextPosition);
    }

    // Calculate fade out
    const fadeStart = duration - 400;
    const fadeElapsed = Math.max(elapsed - fadeStart, 0);
    const fadeProgress = THREE.MathUtils.clamp(fadeElapsed / 400, 0, 1);
    const opacityFactor = 1 - fadeProgress;

    // Flicker + Scale
    const flickerScale =
      0.9 + Math.sin(elapsed * 0.02) * 0.1 + Math.random() * 0.05;
    if (outerRef.current) {
      outerRef.current.scale.setScalar(flickerScale);
    }
    if (coreRef.current) {
      coreRef.current.scale.setScalar(0.6 + Math.sin(elapsed * 0.04) * 0.1);
    }

    // Adjust Material opacity
    const outerMat = outerRef.current?.material as THREE.MeshBasicMaterial;
    const coreMat = coreRef.current?.material as THREE.MeshBasicMaterial;
    if (outerMat && coreMat) {
      outerMat.opacity = 0.8 * opacityFactor;
      coreMat.opacity = 1.0 * opacityFactor;
      outerMat.needsUpdate = true;
      coreMat.needsUpdate = true;
    }

    // Light intensity
    if (lightRef.current) {
      lightRef.current.intensity =
        (5 + Math.sin(elapsed * 0.03) * 2 + Math.random()) * opacityFactor;
    }
  });

  // Don't render if destroyed
  if (!active) return null;

  return (
    <group
      ref={groupRef}
      scale={scale}
      position={[startPosition.x, startPosition.y, startPosition.z]}
    >
      {/* Flame outer shell */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Center core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial
          color="#ffffcc"
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Point light */}
      <pointLight
        ref={lightRef}
        color="#ff6600"
        intensity={5}
        distance={8}
        decay={2}
      />
    </group>
  );
};
