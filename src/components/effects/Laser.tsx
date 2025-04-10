import React, { useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  RigidBody,
  CuboidCollider,
  IntersectionExitHandler,
  IntersectionEnterHandler,
} from "@react-three/rapier";
import { LaserEffectProps } from "./LaserEffectController";
import { CollisionSystem } from "../../utils/collisionSystem";
import { CollisionGroup } from "../../constants/collisionGroups";

type LaserEffect = Omit<LaserEffectProps, "playerTransformRef"> & {
  position: THREE.Vector3;
  direction: THREE.Vector3;
};

export const Laser: React.FC<LaserEffect> = ({
  position,
  direction,
  duration,
  length = 13,
  thickness = 1,
  hitInterval = 500,
  excludeCollisionGroup,
  onHit,
  onComplete,
  debug = false,
}) => {
  const [destroyed, setDestroyed] = useState(false);
  const startTime = useRef(Date.now());
  const { clock } = useThree();

  const rigidRef = useRef(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const debugBoxRef = useRef<THREE.Mesh>(null);
  const startOrbRef = useRef<THREE.Mesh>(null);

  const endPosition = useMemo(() => new THREE.Vector3(), []);

  const collisionState = useRef({
    lastHitTime: 0,
    collidingObjects: new Map<number, unknown>(),
  });

  const beamGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 8);
    geo.translate(0, 0.5, 0);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, []);

  const handleCollisionEnter: IntersectionEnterHandler = ({ other }) => {
    if (!other) return;
    const { handle } = other.collider ?? {};
    if (handle === undefined) return;

    const now = Date.now();
    const state = collisionState.current;

    state.collidingObjects.set(handle, other);

    const canHit = now - state.lastHitTime >= hitInterval;
    if (canHit && onHit) {
      state.lastHitTime = now;
      const hitPosition = calculateHitPosition();
      onHit(other, hitPosition);
    }
  };

  const handleCollisionExit: IntersectionExitHandler = ({ other }) => {
    if (!other) return;
    const { handle } = other.collider ?? {};
    if (handle === undefined) return;

    const state = collisionState.current;
    state.collidingObjects.delete(handle);
  };

  const calculateHitPosition = () => {
    return position.clone().add(
      direction
        .clone()
        .normalize()
        .multiplyScalar(length / 2)
    );
  };

  const updatePhysicsBody = (normalizedDir: THREE.Vector3) => {
    if (!rigidRef.current) return;

    rigidRef.current.setTranslation(
      { x: position.x, y: position.y, z: position.z },
      true
    );

    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normalizedDir
    );

    rigidRef.current.setRotation(
      { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
      true
    );
  };

  const calculateVisualParams = (elapsed: number, fastPulse: number) => {
    const fadeInDuration = 200;
    const fadeOutStart = duration - 400;
    const fadeInProgress = Math.min(elapsed / fadeInDuration, 1);
    const fadeOutElapsed = Math.max(elapsed - fadeOutStart, 0);
    const fadeOutProgress = Math.min(fadeOutElapsed / 400, 1);

    const opacityFactor = fadeInProgress * (1 - fadeOutProgress);
    const pulseEffect = Math.sin(elapsed * 0.01) * 0.2 + 0.8;
    const flickerScale = 1 + Math.sin(fastPulse) * 0.15;

    return { opacityFactor, pulseEffect, flickerScale };
  };

  const processCollisions = () => {
    const state = collisionState.current;
    const now = Date.now();

    if (
      state.collidingObjects.size > 0 &&
      now - state.lastHitTime >= hitInterval
    ) {
      state.lastHitTime = now;
      const hitPosition = calculateHitPosition();

      state.collidingObjects.forEach((obj) => {
        onHit?.(obj, hitPosition);
      });
    }
  };

  const updateBeamVisuals = (flickerScale: number) => {
    if (beamRef.current) {
      beamRef.current.scale.set(
        thickness * flickerScale,
        thickness * flickerScale,
        length
      );
    }
    if (coreRef.current) {
      const elapsed = Date.now() - startTime.current;
      const coreScale = (0.6 + Math.sin(elapsed * 0.04) * 0.1) * flickerScale;
      coreRef.current.scale.set(
        thickness * 0.7 * coreScale,
        thickness * 0.7 * coreScale,
        length * 0.95
      );
    }
    if (glowRef.current) {
      const fastPulse = clock.getElapsedTime() * 100;
      const glowPulse = 1 + Math.sin(fastPulse * 0.5) * 0.25;
      glowRef.current.scale.set(
        thickness * 1.5 * glowPulse,
        thickness * 1.5 * glowPulse,
        length * 1.05
      );
    }
  };

  const updateDecorations = (
    elapsed: number,
    fastPulse: number,
    flickerScale: number,
    opacityFactor: number
  ) => {
    if (startOrbRef.current) {
      const orbScale =
        thickness * 1.2 * (1 + Math.sin(elapsed * 0.01) * 0.3) * flickerScale;
      startOrbRef.current.scale.set(orbScale, orbScale, orbScale);
      startOrbRef.current.rotation.x = elapsed * 0.002;
      startOrbRef.current.rotation.y = elapsed * 0.0025;
      startOrbRef.current.rotation.z = elapsed * 0.0015;
      updateMaterialOpacity(
        startOrbRef.current.material as THREE.MeshBasicMaterial,
        opacityFactor * (0.7 + Math.sin(fastPulse * 0.5) * 0.3)
      );
    }
  };

  const updateDebugBox = (elapsed: number) => {
    if (!debug || !debugBoxRef.current) return;
    debugBoxRef.current.scale.set(thickness * 2, thickness * 2, length);
    updateMaterialOpacity(
      debugBoxRef.current.material as THREE.MeshBasicMaterial,
      0.3 + Math.sin(elapsed * 0.005) * 0.1
    );
  };

  const updateMaterialOpacity = (
    material: THREE.MeshBasicMaterial,
    opacity: number
  ) => {
    if (!material) return;
    material.opacity = opacity;
    material.needsUpdate = true;
  };

  const updateMaterials = (
    opacityFactor: number,
    pulseEffect: number,
    fastPulse: number
  ) => {
    const beamMat = beamRef.current?.material as THREE.MeshBasicMaterial;
    const coreMat = coreRef.current?.material as THREE.MeshBasicMaterial;
    const glowMat = glowRef.current?.material as THREE.MeshBasicMaterial;

    if (beamMat) {
      beamMat.opacity =
        0.7 * opacityFactor * (1 + Math.sin(fastPulse * 0.3) * 0.1);
      beamMat.needsUpdate = true;
    }
    if (coreMat) {
      coreMat.opacity =
        0.9 * opacityFactor * (1 + Math.sin(fastPulse * 0.4) * 0.1);
      coreMat.needsUpdate = true;
    }
    if (glowMat) {
      glowMat.opacity =
        0.5 * opacityFactor * (pulseEffect + Math.sin(fastPulse * 0.2) * 0.2);
      glowMat.needsUpdate = true;
    }
  };

  const updateLight = (
    opacityFactor: number,
    pulseEffect: number,
    fastPulse: number
  ) => {
    if (!lightRef.current) return;
    lightRef.current.intensity =
      3 * opacityFactor * (pulseEffect + Math.sin(fastPulse * 0.5) * 0.2);
  };

  useFrame(() => {
    if (destroyed) return;

    const elapsed = Date.now() - startTime.current;
    const fastPulse = clock.getElapsedTime() * 100;
    const normalizedDir = direction.clone().normalize();

    endPosition
      .copy(position)
      .add(normalizedDir.clone().multiplyScalar(length));

    processCollisions();
    updatePhysicsBody(normalizedDir);

    const { opacityFactor, pulseEffect, flickerScale } = calculateVisualParams(
      elapsed,
      fastPulse
    );

    updateBeamVisuals(flickerScale);
    updateDecorations(elapsed, fastPulse, flickerScale, opacityFactor);
    updateDebugBox(elapsed);
    updateMaterials(opacityFactor, pulseEffect, fastPulse);
    updateLight(opacityFactor, pulseEffect, fastPulse);

    if (elapsed > duration) {
      setDestroyed(true);
      onComplete?.();
    }
  });

  if (destroyed) return null;

  const initialRotation = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      direction.clone().normalize()
    )
  );

  const collisionGroups = CollisionSystem.createRigidBodyCollisionGroups(
    CollisionGroup.Projectile,
    excludeCollisionGroup
  );

  return (
    <RigidBody
      ref={rigidRef}
      type="kinematicPosition"
      position={position}
      rotation={initialRotation}
      sensor={true}
      colliders={false}
      onIntersectionEnter={handleCollisionEnter}
      onIntersectionExit={handleCollisionExit}
      gravityScale={0}
      collisionGroups={collisionGroups}
    >
      <CuboidCollider
        args={[thickness, thickness, length / 2]}
        position={[0, 0, length / 2]}
      />

      {debug && (
        <mesh ref={debugBoxRef} position={[0, 0, length / 2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#ff00ff"
            transparent
            opacity={0.3}
            wireframe
          />
        </mesh>
      )}

      <mesh ref={startOrbRef} position={[0, 0, 0]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          color="#d580ff"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={beamRef} scale={[thickness, thickness, length]}>
        <primitive object={beamGeometry} />
        <meshBasicMaterial
          color="#8a2be2"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh
        ref={coreRef}
        scale={[thickness * 0.7, thickness * 0.7, length * 0.95]}
      >
        <primitive object={beamGeometry} />
        <meshBasicMaterial
          color="#e0b0ff"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh
        ref={glowRef}
        scale={[thickness * 1.5, thickness * 1.5, length * 1.05]}
      >
        <primitive object={beamGeometry} />
        <meshBasicMaterial
          color="#b060ff"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <pointLight
        ref={lightRef}
        position={[0, 0, length]}
        color="#b060ff"
        intensity={3}
        distance={8}
        decay={2}
      />
    </RigidBody>
  );
};
