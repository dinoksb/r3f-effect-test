import React, { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import {
  Collider,
  InteractionGroups,
  RigidBody,
} from "@dimforge/rapier3d-compat";

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

const DEFAULT_SPEED = 20;

// FireBall component props
export interface FireBallProps {
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  speed: number; // Distance traveled per second
  color?: THREE.ColorRepresentation;
  scale?: number;
  collisionGroups?: InteractionGroups;
  owner?: RigidBody;
  onHit?: (
    pos?: THREE.Vector3,
    rigidBody?: RigidBody,
    collider?: Collider
  ) => void;
  onComplete?: () => void;
}

// Props for FireBall that accepts raw config object
export interface FireBallWithRawConfigProps {
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

/**
 * Helper function for creating fireball config objects
 * Creates a serializable config object from Vector3 objects
 */
export const createFireBallEffectConfig = (config: {
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  speed?: number;
  color?: string;
  scale?: number;
}): { [key: string]: PrimitiveOrArray } => {
  return {
    startPosition: config.startPosition.toArray(),
    endPosition: config.endPosition.toArray(),
    speed: config.speed || DEFAULT_SPEED,
    color: config.color,
    scale: config.scale || 1,
  };
};

/**
 * Function to parse the raw config into usable values
 * Converts serialized arrays back to Vector3 objects
 */
export const parseConfig = (config: {
  [key: string]: PrimitiveOrArray;
}): FireBallProps => {
  return {
    startPosition: new THREE.Vector3(...(config.startPosition as number[])),
    endPosition: new THREE.Vector3(...(config.endPosition as number[])),
    speed: (config.speed as number) || DEFAULT_SPEED,
    color: config.color as string | undefined,
    scale: (config.scale as number) || 1,
  };
};

// FireBall component that accepts either parsed props or a raw config object
export const FireBall: React.FC<FireBallProps | FireBallWithRawConfigProps> = (
  props
) => {
  // Check if we're receiving a raw config or parsed props
  const hasRawConfig = "config" in props;

  // Parse props accordingly
  const {
    startPosition,
    endPosition,
    speed,
    color = "#ff3300",
    scale = 1,
    collisionGroups,
    owner,
    onHit,
    onComplete,
  } = hasRawConfig
    ? {
        ...parseConfig((props as FireBallWithRawConfigProps).config),
        collisionGroups: (props as FireBallWithRawConfigProps).collisionGroups,
        owner: (props as FireBallWithRawConfigProps).owner,
        onHit: (props as FireBallWithRawConfigProps).onHit,
        onComplete: (props as FireBallWithRawConfigProps).onComplete,
      }
    : (props as FireBallProps);

  const [active, setActive] = useState(true);

  // FireBall's "creation time"
  const startTime = useRef(Date.now());
  const onCompleteRef = useRef(onComplete);
  const traveledDistance = useRef(0);

  // Calculate the total distance and direction vector once
  const totalDistance = useRef(startPosition.distanceTo(endPosition));
  const directionVector = useRef(
    endPosition.clone().sub(startPosition).normalize()
  );

  // Group reference for positioning
  const groupRef = useRef<THREE.Group>(null);

  // Refs pointing to the inner Mesh & Light
  const outerRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Access Rapier physics world
  const { rapier, world } = useRapier();

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
    // Reset the timer and traveled distance when the component mounts
    startTime.current = Date.now();
    traveledDistance.current = 0;
    setActive(true);
  }, []);

  // Update position and effects every frame
  useFrame((_, delta) => {
    if (!active) return;

    const group = groupRef.current;
    if (!group) return;

    // Calculate distance to travel in this frame
    const frameTravelDistance = speed * delta;

    // Add to total traveled distance
    traveledDistance.current += frameTravelDistance;

    // Check if we've reached the destination
    if (traveledDistance.current >= totalDistance.current) {
      group.position.copy(endPosition);
      removeBall();
      return;
    }

    // Use current position as the origin for the ray
    const origin = group.position;
    const normalizedDirection = directionVector.current;

    // Use Rapier's ray casting for collision detection
    const ray = new rapier.Ray(origin, normalizedDirection);

    // Cast ray to detect collisions
    const hit = world.castRay(
      ray,
      frameTravelDistance,
      true,
      undefined,
      collisionGroups,
      undefined,
      owner
    );

    if (hit) {
      // Calculate hit point (timeOfImpact is the property name in the current version)
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
      if (onHit) {
        // Use type assertion to handle potential type mismatches
        onHit(
          hitPointVec3,
          hitRigidBody as unknown as RigidBody,
          hitCollider as unknown as Collider
        );
      }
      removeBall();
      return;
    } else {
      // No hit, advance the fireball's position
      const nextPosition = origin
        .clone()
        .addScaledVector(normalizedDirection, frameTravelDistance);
      group.position.copy(nextPosition);
    }

    // Calculate fade out based on distance traveled
    const progressRatio = traveledDistance.current / totalDistance.current;
    const fadeStart = 0.7; // Start fading at 70% of the journey
    const fadeProgress = Math.max(
      0,
      (progressRatio - fadeStart) / (1 - fadeStart)
    );
    const opacityFactor = 1 - fadeProgress;

    // Flicker + Scale effects
    const elapsed = Date.now() - startTime.current;
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
