import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Trail } from "@react-three/drei";
import {
  useRapier,
  BallCollider,
  RigidBody,
  RapierRigidBody,
} from "@react-three/rapier";
import { RigidBodyCollisionSystem } from "../../utils/rigidbodyCollisionSystem";
import { CollisionBitmask } from "../../constants/collisionGroups";
import { Collider } from "@dimforge/rapier3d-compat";

/**
 * Meteor effect props
 */
export interface MeteorProps {
  startPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  startDelay: number;
  radius: number;
  duration: number; // effect duration(ms)
  excludeCollisionGroup?: number[];
  onHit?: (
    position: THREE.Vector3,
    rigidBody?: RapierRigidBody,
    collider?: Collider
  ) => boolean;
  onComplete?: () => void;
  debug?: boolean;
}

/**
 * Custom hook to manage progress and activation based on duration and delay
 */
function useProgress(duration: number, startDelay = 0, onDone?: () => void) {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(startDelay === 0);
  const startRef = useRef<number>(Date.now() + startDelay);

  // Handle delayed activation
  useEffect(() => {
    if (startDelay > 0) {
      const timer = setTimeout(() => {
        setActive(true);
      }, startDelay);
      return () => clearTimeout(timer);
    }
  }, [startDelay]);

  // Update progress each frame
  useFrame(() => {
    if (!active) return;
    const elapsed = Date.now() - startRef.current;
    const p = Math.min(elapsed / duration, 1);
    setProgress(p);
    if (p === 1) {
      onDone?.();
    }
  });

  return { progress, active };
}

/**
 * Meteor effect component
 * Renders a meteor that travels from startPosition to targetPosition
 */
export const Meteor: React.FC<MeteorProps> = ({
  startPosition,
  targetPosition,
  radius,
  duration,
  startDelay,
  excludeCollisionGroup,
  onHit,
  onComplete,
  debug = false,
}) => {
  // Component state
  const [active, setActive] = useState(true);
  const [showCollider, setShowCollider] = useState(false);

  // Visual element refs
  const meteorRef = useRef<THREE.Mesh>(null);
  const emberRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const colliderRef = useRef(null);

  // Store callbacks in refs to avoid closure issues
  const onCompleteRef = useRef(onComplete);

  // Access Rapier physics world
  const { rapier, world } = useRapier();

  // Update callback ref when prop changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Animation progress
  const { progress, active: activeProgress } = useProgress(
    duration,
    startDelay
  );

  // Visual appearance constants
  const meteorSize = radius * 0.9;
  const emberSize = meteorSize * 0.7;
  const trailWidth = radius * 2.0;
  const trailLength = radius * 0.6;

  // Calculate movement vectors
  const direction = useMemo(() => {
    return targetPosition.clone().sub(startPosition).normalize();
  }, [startPosition, targetPosition]);

  const totalDistance = useMemo(() => {
    return targetPosition.distanceTo(startPosition);
  }, [startPosition, targetPosition]);

  // Setup collision groups
  const collisionGroups = useMemo(() => {
    return RigidBodyCollisionSystem.setupRigidBodyCollisionGroups(
      CollisionBitmask.AOE,
      excludeCollisionGroup
    );
  }, [excludeCollisionGroup]);

  /**
   * Deactivate meteor visual effects
   */
  const removeMeteor = useCallback(() => {
    if (active) {
      setActive(false);
    }
  }, [active]);

  /**
   * Check if meteor has reached target position or hit something along the way
   */
  const checkReachedTargetPoint = useCallback(
    (currentPosition: THREE.Vector3, frameTravelDistance: number) => {
      // Create ray for collision detection
      const ray = new rapier.Ray(currentPosition, direction);

      // Cast ray to detect collisions
      const hit = world.castRay(
        ray,
        frameTravelDistance,
        true,
        undefined,
        collisionGroups
      );

      if (hit || currentPosition.distanceTo(targetPosition) < 0.3) {
        setShowCollider(true);
        removeMeteor();
      }
    },
    [direction, removeMeteor, targetPosition, collisionGroups, world, rapier]
  );

  /**
   * Handle collision when something enters the sphere collider area
   */
  const handleSphereCollision = useCallback(
    (other) => {
      if (!other || !other.colliderObject) return;

      // Use target position as approximation for collision point
      const collisionPosition = targetPosition.clone();

      // Trigger onHit callback with collision data
      if (onHit) {
        onHit(collisionPosition, other.rigidBodyObject, other.colliderObject);
      }
    },
    [onHit, targetPosition]
  );

  /**
   * Schedule cleanup for sphere collider and trigger onComplete
   */
  const cleanupCollider = useCallback(() => {
    setTimeout(() => {
      setShowCollider(false);
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }, 100); // Short delay to ensure collision is processed
  }, []);

  /**
   * Main update loop for meteor animation and collision detection
   */
  useFrame((_, delta) => {
    // Skip if not active
    if (!active) return;

    // Calculate distance to travel in this frame
    const frameTravelDistance = (totalDistance * delta) / (duration / 1000);

    // Update position based on progress
    const currentPosition = startPosition
      .clone()
      .add(direction.clone().multiplyScalar(totalDistance * progress));

    // Check if reached target point or collision occurred
    checkReachedTargetPoint(currentPosition, frameTravelDistance);

    // Update visual appearance
    if (meteorRef.current) {
      // Position
      meteorRef.current.position.copy(currentPosition);

      // Rotation
      meteorRef.current.rotation.x += 0.01;
      meteorRef.current.rotation.y += 0.02;
      meteorRef.current.rotation.z += 0.015;

      // Random scale for interesting effect
      const scale = THREE.MathUtils.randFloat(0.9, 1.1);
      meteorRef.current.scale.set(scale, scale, scale);
    }

    // Update ember (inner fireball)
    if (emberRef.current) {
      emberRef.current.position.copy(currentPosition);
      emberRef.current.rotation.y += 0.05;
      const emberScale = THREE.MathUtils.randFloat(0.6, 1.3);
      emberRef.current.scale.set(emberScale, emberScale, emberScale);
    }

    // Update light
    if (lightRef.current) {
      lightRef.current.position.copy(currentPosition);
      lightRef.current.intensity = THREE.MathUtils.randFloat(3, 5);
    }
  });

  // Cleanup when collider appears
  useEffect(() => {
    if (showCollider) {
      cleanupCollider();
    }
  }, [showCollider, cleanupCollider]);

  // Don't render anything before the delay period
  if (!activeProgress) return null;

  return (
    <>
      {/* Meteor visual elements - only show when active */}
      {active && (
        <>
          {/* Outer meteor body */}
          <mesh ref={meteorRef} position={startPosition.clone()}>
            <dodecahedronGeometry args={[meteorSize, 0]} />
            <meshBasicMaterial
              color="#ff4400"
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Inner ember core */}
          <mesh ref={emberRef} position={startPosition.clone()}>
            <dodecahedronGeometry args={[emberSize, 0]} />
            <meshBasicMaterial
              color="#ffff00"
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Light source */}
          <pointLight
            ref={lightRef}
            position={startPosition.clone()}
            color="#ff6600"
            intensity={5}
            distance={10}
            decay={2}
          />

          {/* Trail effect */}
          <Trail
            width={trailWidth}
            length={trailLength}
            color={new THREE.Color("#ff6600")}
            attenuation={(w) => w}
            target={emberRef}
          />
        </>
      )}

      {/* Sphere collider for area collision detection */}
      {showCollider && (
        <RigidBody
          ref={colliderRef}
          type="fixed"
          colliders={false}
          position={[targetPosition.x, targetPosition.y, targetPosition.z]}
          sensor
          onIntersectionEnter={handleSphereCollision}
          collisionGroups={collisionGroups}
        >
          <BallCollider args={[radius]} />
          {debug && (
            <mesh>
              <sphereGeometry args={[radius, 16, 16]} />
              <meshBasicMaterial
                color="#ff8800"
                transparent
                opacity={0.3}
                wireframe={true}
              />
            </mesh>
          )}
        </RigidBody>
      )}
    </>
  );
};
