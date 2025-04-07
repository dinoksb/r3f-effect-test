import React, { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sphere, Trail } from "@react-three/drei";
import { Explosion } from "./Explosion";
import { RigidBody, BallCollider } from "@react-three/rapier";

interface MeteorProps {
  startPosition: THREE.Vector3;
  targetPositions: THREE.Vector3[]; // Changed to an array
  duration: number;
  onHit?: (other?: unknown, targetPos?: THREE.Vector3) => void; // Added other parameter for collision object
  onComplete?: () => void; // Called when all meteors have completed
  debug?: boolean; // For debug visualization of collision areas
}

// Component for the impact effect when the fireball hits the target
interface ImpactEffectProps {
  position: THREE.Vector3;
  radius?: number; // Make radius configurable
}

const ImpactEffect: React.FC<ImpactEffectProps> = ({
  position,
  radius = 5, // Default value
}) => {
  const sphereRef = useRef<THREE.Mesh>();
  const lightRef = useRef<THREE.PointLight>();
  const startTime = useRef(Date.now());
  const duration = 600; // milliseconds
  const maxRadius = radius; // Use the passed radius value

  useFrame(() => {
    const elapsedTime = Date.now() - startTime.current;
    const progress = Math.min(elapsedTime / duration, 1);

    if (sphereRef.current) {
      // Expand and fade out
      const scale = progress * maxRadius;
      sphereRef.current.scale.set(scale, scale, scale);

      const opacity = Math.pow(1 - progress, 2);
      (sphereRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
      (sphereRef.current.material as THREE.MeshBasicMaterial).needsUpdate =
        true;
    }

    if (lightRef.current) {
      // Fade out light
      lightRef.current.intensity = 10 * (1 - progress);
    }
  });

  return (
    <>
      <Sphere ref={sphereRef} args={[1, 16, 16]} position={position}>
        <meshBasicMaterial
          color="#ff4400"
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
      <pointLight
        ref={lightRef}
        position={position}
        color="#ff4400"
        intensity={10}
        distance={15}
        decay={2}
      />
    </>
  );
};

// Hitbox component for collision detection - similar to LightningStrike's Hitbox
interface HitboxProps {
  position: THREE.Vector3;
  duration: number;
  onHit?: (other?: unknown, pos?: THREE.Vector3) => void;
  debug?: boolean;
  radius: number; // Required radius parameter
}

const Hitbox: React.FC<HitboxProps> = ({
  position,
  duration,
  onHit,
  debug = false,
  radius,
}) => {
  const startTime = useRef(Date.now());
  const [destroyed, setDestroyed] = useState(false);
  const rigidRef = useRef(null);

  useFrame(() => {
    if (destroyed) return;

    const elapsedTime = Date.now() - startTime.current;
    const progress = Math.min(elapsedTime / duration, 1);

    // Remove the hitbox when the duration is over
    if (progress >= 1) {
      setDestroyed(true);
    }
  });

  if (destroyed) return null;

  return (
    <RigidBody
      ref={rigidRef}
      type="fixed"
      colliders={false}
      sensor={true}
      position={[position.x, position.y, position.z]}
      onIntersectionEnter={(other) => {
        const hitPosition = new THREE.Vector3(
          position.x,
          position.y,
          position.z
        );
        onHit?.(other, hitPosition);
      }}
    >
      <BallCollider args={[radius]} />

      {/* Debug visualization - only visible when debug is true */}
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

// Single Meteor instance component
interface SingleMeteorProps {
  startPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  duration: number;
  startDelay: number;
  onHit?: (other?: unknown, targetPos?: THREE.Vector3) => void;
  onComplete?: () => void;
  debug?: boolean;
}

const SingleMeteor: React.FC<SingleMeteorProps> = ({
  startPosition,
  targetPosition,
  duration,
  startDelay,
  onHit,
  onComplete,
  debug = false,
}) => {
  const meteorRef = useRef<THREE.Mesh>(null);
  const emberRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const startTime = useRef(Date.now() + startDelay);

  const [showImpact, setShowImpact] = useState(false);
  const [impactDone, setImpactDone] = useState(false);
  const [meteorActive, setMeteorActive] = useState(startDelay === 0);

  // Define a shared impact radius for both visual effect and collision
  const impactRadius = 5;
  const impactDuration = 600; // milliseconds

  const direction = useMemo(() => {
    return targetPosition.clone().sub(startPosition);
  }, [startPosition, targetPosition]);

  // Handle delayed start
  useEffect(() => {
    if (startDelay > 0) {
      const timer = setTimeout(() => {
        setMeteorActive(true);
      }, startDelay);
      return () => clearTimeout(timer);
    }
  }, [startDelay]);

  useFrame(() => {
    if (!meteorActive || impactDone) return;

    const now = Date.now();
    const elapsed = now - startTime.current;
    const progress = Math.min(elapsed / duration, 1);
    const currentPosition = startPosition
      .clone()
      .add(direction.clone().multiplyScalar(progress));

    // 이동 및 이펙트 업데이트
    if (meteorRef.current) {
      meteorRef.current.position.copy(currentPosition);
      meteorRef.current.rotation.x += 0.01;
      meteorRef.current.rotation.y += 0.02;
      meteorRef.current.rotation.z += 0.015;
      const scale = THREE.MathUtils.randFloat(0.9, 1.1);
      meteorRef.current.scale.set(scale, scale, scale);
    }

    if (emberRef.current) {
      emberRef.current.position.copy(currentPosition);
      emberRef.current.rotation.y += 0.05;
      const emberScale = THREE.MathUtils.randFloat(0.6, 1.3);
      emberRef.current.scale.set(emberScale, emberScale, emberScale);
    }

    if (lightRef.current) {
      lightRef.current.position.copy(currentPosition);
      lightRef.current.intensity = THREE.MathUtils.randFloat(3, 5);
    }

    // 충돌 처리: 도착 시점에서 ImpactEffect 시작
    if (!showImpact && currentPosition.distanceTo(targetPosition) < 0.3) {
      setShowImpact(true);
    }
  });

  // ImpactEffect 끝났을 때 onComplete 호출
  useEffect(() => {
    if (showImpact && !impactDone) {
      const timer = setTimeout(() => {
        setImpactDone(true);
        onComplete?.(); // 외부에 완료 알림
      }, impactDuration);
      return () => clearTimeout(timer);
    }
  }, [showImpact, impactDone, onComplete, impactDuration]);

  if (!meteorActive) return null;

  return (
    <>
      {/* Main meteor using dodecahedron as requested */}
      {!showImpact && (
        <>
          <mesh ref={meteorRef} position={startPosition.clone()}>
            <dodecahedronGeometry args={[2, 0]} />
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
            <dodecahedronGeometry args={[1, 0]} />
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
            width={5}
            length={2}
            color={new THREE.Color("#ff6600")}
            attenuation={(w) => w}
            target={emberRef}
          />
        </>
      )}

      {/* Impact effect and explosion */}
      {showImpact && !impactDone && (
        <>
          <ImpactEffect position={targetPosition} radius={impactRadius} />
          <Explosion position={targetPosition} />
          {/* Add hitbox that follows the same lifecycle as the impact effect */}
          <Hitbox
            position={targetPosition}
            duration={impactDuration}
            onHit={onHit}
            debug={debug}
            radius={impactRadius}
          />
        </>
      )}
    </>
  );
};

export const Meteor: React.FC<MeteorProps> = ({
  startPosition,
  targetPositions,
  duration,
  onHit,
  onComplete,
  debug = false,
}) => {
  const [impactCount, setImpactCount] = useState(0);

  // Track when all meteors have completed
  useEffect(() => {
    if (impactCount === targetPositions.length && onComplete) {
      onComplete();
    }
  }, [impactCount, targetPositions.length, onComplete]);

  return (
    <>
      {targetPositions.map((targetPos, index) => (
        <SingleMeteor
          key={index}
          startPosition={startPosition}
          targetPosition={targetPos}
          duration={duration}
          startDelay={100 * index + Math.random() * 100} // Stagger the meteors
          onHit={onHit}
          onComplete={() => setImpactCount((prev) => prev + 1)}
          debug={debug}
        />
      ))}
    </>
  );
};
