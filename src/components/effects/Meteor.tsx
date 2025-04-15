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
import { RigidBody, BallCollider } from "@react-three/rapier";
import { RigidBodyCollisionSystem } from "../../utils/rigidbodyCollisionSystem";
import { CollisionBitmask } from "../../constants/collisionGroups";

export interface MeteorProps {
  startPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  startDelay: number;
  radius: number;
  duration: number; // effect duration(ms)
  excludeCollisionGroup?: number[];
  onHit?: (other: unknown, pos: THREE.Vector3) => void;
  onImpact?: (pos: THREE.Vector3) => void;
  onComplete?: () => void;
  debug?: boolean;
}

function useProgress(duration: number, startDelay = 0, onDone?: () => void) {
  const [progress, setProgress] = useState(0);
  // If startDelay > 0, activate after that time has passed
  const [active, setActive] = useState(startDelay === 0);

  // Set the actual start time delayed by the startDelay
  const startRef = useRef<number>(Date.now() + startDelay);

  useEffect(() => {
    if (startDelay > 0) {
      const timer = setTimeout(() => {
        setActive(true);
      }, startDelay);
      return () => clearTimeout(timer);
    }
  }, [startDelay]);

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
  const meteorRef = useRef<THREE.Mesh>(null);
  const emberRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const [showImpact, setShowImpact] = useState(false);

  // Progress increases from 0 to 1 during duration / active status
  const { progress, active } = useProgress(duration, startDelay);

  // Common radius/duration used for collision effects
  const impactRadius = radius;
  const impactDuration = 600;

  // Visual element sizes
  const meteorSize = impactRadius * 0.9;
  const emberSize = meteorSize * 0.7;
  const trailWidth = radius * 2.0;
  const trailLength = radius * 0.6;

  const direction = useMemo(() => {
    return targetPosition.clone().sub(startPosition);
  }, [startPosition, targetPosition]);

  // Handle collision events
  const handleOnHit = useCallback(
    (other: unknown) => {
      console.log("Meteor onHit", other, targetPosition);
      onHit?.(other, targetPosition);
    },
    [onHit, targetPosition]
  );

  useFrame(() => {
    // Ignore if not started yet or impact already finished
    if (!active) return;

    // Interpolate position based on progress between 0 and 1
    const currentPosition = startPosition
      .clone()
      .add(direction.clone().multiplyScalar(progress));

    // Meteor body rotation/random scale
    if (meteorRef.current) {
      meteorRef.current.position.copy(currentPosition);
      meteorRef.current.rotation.x += 0.01;
      meteorRef.current.rotation.y += 0.02;
      meteorRef.current.rotation.z += 0.015;
      const scale = THREE.MathUtils.randFloat(0.9, 1.1);
      meteorRef.current.scale.set(scale, scale, scale);
    }

    // Ember (inner fireball) rotation/random scale
    if (emberRef.current) {
      emberRef.current.position.copy(currentPosition);
      emberRef.current.rotation.y += 0.05;
      const emberScale = THREE.MathUtils.randFloat(0.6, 1.3);
      emberRef.current.scale.set(emberScale, emberScale, emberScale);
    }

    // Light position/brightness
    if (lightRef.current) {
      lightRef.current.position.copy(currentPosition);
      lightRef.current.intensity = THREE.MathUtils.randFloat(3, 5);
    }

    // Start impact effect when reaching near target
    if (!showImpact && currentPosition.distanceTo(targetPosition) < 0.3) {
      setShowImpact(true);
      onComplete?.();
    }
  });

  if (!active) return null;

  return (
    <>
      {/* Meteor body & Ember & Trail (until impact) */}
      {!showImpact && (
        <>
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

          <pointLight
            ref={lightRef}
            position={startPosition.clone()}
            color="#ff6600"
            intensity={5}
            distance={10}
            decay={2}
          />

          <Trail
            width={trailWidth}
            length={trailLength}
            color={new THREE.Color("#ff6600")}
            attenuation={(w) => w}
            target={emberRef}
          />
        </>
      )}

      {/* When impact occurs (visual effects + explosion + Hitbox) */}
      {showImpact && (
        <Hitbox
          position={targetPosition}
          duration={impactDuration}
          radius={impactRadius}
          excludeCollisionGroup={excludeCollisionGroup}
          onHit={handleOnHit}
          debug={debug}
        />
      )}
    </>
  );
};

interface HitboxProps {
  position: THREE.Vector3;
  duration: number;
  radius: number;
  excludeCollisionGroup?: number[];
  onHit?: (other?: unknown) => void;
  debug?: boolean;
}
const Hitbox: React.FC<HitboxProps> = ({
  position,
  duration,
  excludeCollisionGroup,
  onHit,
  debug = false,
  radius,
}) => {
  const rigidRef = useRef(null);
  const [destroyed, setDestroyed] = useState(false);

  // duration이 끝나면 onDone -> setDestroyed(true)
  // When duration ends, onDone -> setDestroyed(true)
  useProgress(duration, 0, () => setDestroyed(true));

  if (destroyed) return null;

  return (
    <RigidBody
      ref={rigidRef}
      type="fixed"
      colliders={false}
      sensor={true}
      position={[position.x, position.y, position.z]}
      onIntersectionEnter={(other) => {
        onHit?.(other);
      }}
      collisionGroups={RigidBodyCollisionSystem.setupRigidBodyCollisionGroups(
        CollisionBitmask.AOE,
        excludeCollisionGroup
      )}
    >
      <BallCollider args={[radius]} />
      {/* Debug 시각화 */}
      {/* Debug visualization */}
      {debug && (
        <mesh>
          <sphereGeometry args={[radius, 16, 16]} />
          <meshBasicMaterial
            color="#ff00ff"
            transparent
            opacity={0.3}
            wireframe={true}
          />
        </mesh>
      )}
    </RigidBody>
  );
};
