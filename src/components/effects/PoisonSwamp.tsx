import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Cylinder, Circle } from "@react-three/drei";
import {
  RigidBody,
  CylinderCollider,
  RapierRigidBody,
  IntersectionEnterHandler,
  IntersectionExitHandler,
} from "@react-three/rapier";
import { PoisonSwampEffectProps } from "./PoisonSwampEffectController";
import { RigidBodyCollisionSystem } from "../../utils/rigidbodyCollisionSystem";
import { CollisionGroup } from "../../constants/collisionGroups";

interface BubbleParticle {
  position: THREE.Vector3;
  size: number;
  delay: number;
  velocity: THREE.Vector3;
  lifespan: number;
  burstTime: number;
  burstScale: number;
  active: boolean;
}

function createBubbleParticles(
  count: number,
  radius: number,
  height: number,
  duration: number
) {
  const particles: BubbleParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius * 0.9;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = Math.random() * (height * 0.45) + 0.05;
    const position = new THREE.Vector3(x, y, z);
    const size = 0.05 + Math.random() * 0.1;
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.004,
      0.003 + Math.random() * 0.005,
      (Math.random() - 0.5) * 0.004
    );
    const delay = Math.random() * duration * 0.7;
    const lifespan = 300 + Math.random() * 500;
    const burstTimeRatio = 0.7 + Math.random() * 0.2;
    const burstTime = lifespan * burstTimeRatio;
    const burstScale = 1.5 + Math.random();

    particles.push({
      position,
      size,
      delay,
      velocity,
      lifespan,
      burstTime,
      burstScale,
      active: false,
    });
  }
  return particles;
}

export const PoisonSwamp: React.FC<PoisonSwampEffectProps> = ({
  targetPosition,
  duration = 2000,
  radius = 5,
  height = -0.5,
  opacity = 0.5,
  hitInterval = 500,
  excludeCollisionGroup,
  onHit,
  onComplete,
  debug = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(performance.now());
  const finishCalled = useRef(false);
  const particleCount = useMemo(() => radius * 100, [radius]);
  const calcHeight = useMemo(
    () => targetPosition.y + height,
    [targetPosition, height]
  );
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const cylinderRef = useRef<THREE.Mesh>(null);
  const fadeOutDuration = useMemo(() => duration * 0.5, [duration]);

  const collisionState = useRef({
    lastHitTime: 0,
    collidingObjects: new Map<number, unknown>(),
  });

  useEffect(() => {
    return () => {
      collisionState.current = {
        lastHitTime: 0,
        collidingObjects: new Map<number, unknown>(),
      };
    };
  }, []);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const swampFloorRef = useRef<THREE.Mesh>(null);
  const swampFloorMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  const handleCollisionEnter: IntersectionEnterHandler = ({ other }) => {
    if (!other) return;
    const { handle } = other.collider ?? {};
    if (handle === undefined) return;
    if (debug) console.log("충돌 감지:", other);

    const now = performance.now();
    const state = collisionState.current;
    state.collidingObjects.set(handle, other);

    if (now - state.lastHitTime >= hitInterval && onHit) {
      state.lastHitTime = now;
      onHit(other, targetPosition);
    }
  };

  const handleCollisionExit: IntersectionExitHandler = ({ other }) => {
    if (!other) return;
    const { handle } = other.collider ?? {};
    if (handle === undefined) return;

    const state = collisionState.current;
    if (debug) {
      console.log("충돌 종료:", handle, other);
      console.log("제거 전 충돌 객체 수:", state.collidingObjects.size);
    }
    state.collidingObjects.delete(handle);
    if (debug) {
      console.log("제거 후 충돌 객체 수:", state.collidingObjects.size);
    }
  };

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const bubbles = useMemo(
    () => createBubbleParticles(particleCount, radius, calcHeight, duration),
    [radius, calcHeight, particleCount, duration]
  );

  const startColor = useMemo(() => new THREE.Color("#66ff66"), []);
  const midColor = useMemo(() => new THREE.Color("#44aa44"), []);
  const swampBaseColor = useMemo(() => new THREE.Color("#336633"), []);

  useFrame(() => {
    const now = performance.now();
    const elapsed = now - startTime.current;
    const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
    const fadeOutProgress =
      elapsed > duration
        ? THREE.MathUtils.clamp((elapsed - duration) / fadeOutDuration, 0, 1)
        : 0;
    const currentColor = startColor.clone().lerp(midColor, progress);
    const fadeIn = progress < 0.4 ? progress / 0.4 : 1;
    const finalOpacity = fadeIn * (1 - fadeOutProgress) * opacity;

    if (materialRef.current) {
      materialRef.current.color.copy(currentColor);
      materialRef.current.opacity = finalOpacity;
      materialRef.current.emissive.copy(currentColor);
    }

    if (swampFloorMaterialRef.current) {
      swampFloorMaterialRef.current.opacity = finalOpacity * 0.7;
      const pulse = Math.sin(elapsed * 0.003) * 0.1 + 0.9;
      swampFloorMaterialRef.current.color
        .copy(swampBaseColor)
        .multiplyScalar(pulse);

      if (swampFloorMaterialRef.current.map) {
        swampFloorMaterialRef.current.map.offset.x = elapsed * 0.0001;
        swampFloorMaterialRef.current.map.offset.y = elapsed * 0.00015;
      }
    }

    const state = collisionState.current;
    const canHit =
      state.collidingObjects.size > 0 && now - state.lastHitTime >= hitInterval;
    if (canHit && onHit) {
      state.lastHitTime = now;
      state.collidingObjects.forEach((obj) => onHit(obj, targetPosition));
    }
    if (fadeOutProgress > 0.5) state.collidingObjects.clear();

    if (meshRef.current) {
      bubbles.forEach((bubble, i) => {
        if (elapsed < bubble.delay) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);
          return;
        }

        const bubbleElapsed = elapsed - bubble.delay;
        if (bubbleElapsed > bubble.lifespan || fadeOutProgress >= 1) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);

          if (bubble.active && fadeOutProgress < 0.8) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius * 0.9;
            bubble.position.set(
              Math.cos(angle) * distance,
              Math.random() * (calcHeight * 0.45) + 0.05,
              Math.sin(angle) * distance
            );
            bubble.delay = elapsed + Math.random() * 500;
            bubble.active = false;
          }
          return;
        }

        bubble.active = true;
        bubble.position.add(bubble.velocity);

        let scale = bubble.size;
        if (bubbleElapsed >= bubble.burstTime) {
          const burstElapsed = bubbleElapsed - bubble.burstTime;
          const burstDuration = bubble.lifespan - bubble.burstTime;
          const burstProgress = burstElapsed / burstDuration;
          scale = bubble.size * bubble.burstScale * (1 - burstProgress * 0.8);
          bubble.velocity.y += 0.0001;
        } else {
          const grow = bubbleElapsed / bubble.burstTime;
          scale = bubble.size * (1 + grow * 0.3);
        }

        dummy.position.copy(bubble.position);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (fadeOutProgress >= 1 && !finishCalled.current) {
      finishCalled.current = true;
      state.collidingObjects.clear();
      onComplete?.();
    }
  });

  const safeHeight = Math.max(Math.abs(calcHeight), calcHeight * 1.2);

  // add collision groups
  const collisionGroups =
    RigidBodyCollisionSystem.setupRigidBodyCollisionGroups(
      CollisionGroup.AOE,
      excludeCollisionGroup
    );

  return (
    <group name="poison-swamp" ref={groupRef} position={targetPosition}>
      <Circle
        ref={swampFloorRef}
        args={[radius, 32]}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, (targetPosition.y += 0.001), 0]}
      >
        <meshBasicMaterial
          ref={swampFloorMaterialRef}
          color={swampBaseColor}
          transparent={true}
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Circle>

      <RigidBody
        ref={rigidBodyRef}
        type="fixed"
        colliders={false}
        sensor
        onIntersectionEnter={handleCollisionEnter}
        onIntersectionExit={handleCollisionExit}
        collisionGroups={collisionGroups}
      >
        <CylinderCollider
          args={[safeHeight, radius * 0.95]}
          position={[0, calcHeight / 2, 0]}
        />
        {debug && (
          <Cylinder
            ref={cylinderRef}
            args={[radius * 0.95, radius * 0.95, safeHeight, 32]}
            position={[0, calcHeight / 2, 0]}
          >
            <meshBasicMaterial
              color="green"
              wireframe
              transparent
              opacity={0.5}
            />
          </Cylinder>
        )}
      </RigidBody>

      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, particleCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial
          ref={materialRef}
          color={startColor}
          transparent={true}
          opacity={0}
          depthWrite={false}
          emissive={startColor}
          emissiveIntensity={0.1}
          fog={true}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
    </group>
  );
};
