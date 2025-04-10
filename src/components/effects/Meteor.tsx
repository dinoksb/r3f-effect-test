import React, { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sphere, Trail } from "@react-three/drei";
import { Explosion } from "./Explosion";
import { RigidBody, BallCollider } from "@react-three/rapier";
import { MeteorEffectProps } from "./MeteorEffectController";
import { CollisionSystem } from "../../utils/collisionSystem";
import { CollisionGroup } from "../../constants/collisionGroups";

/** ----------------------------
 *  1) 공통 시간 진행도 훅
 * ---------------------------- */
function useProgress(duration: number, startDelay = 0, onDone?: () => void) {
  const [progress, setProgress] = useState(0);
  // startDelay > 0이면, 해당 시간이 지난 후에 활성화
  const [active, setActive] = useState(startDelay === 0);

  // 실제 시작 시간을 delay만큼 늦춰서 세팅
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

/** ----------------------------
 *  2) ImpactEffect
 * ---------------------------- */
interface ImpactEffectProps {
  position: THREE.Vector3;
  radius?: number;
}
const ImpactEffect: React.FC<ImpactEffectProps> = ({
  position,
  radius = 1,
}) => {
  const sphereRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // 기존 600ms 지속 (0~1)
  const { progress } = useProgress(600);

  useFrame(() => {
    if (sphereRef.current) {
      // 충돌 구체 크기 (progress = 0~1)
      const scale = progress * radius;
      sphereRef.current.scale.set(scale, scale, scale);

      // opacity는 (1 - progress)^2로 점차 감소
      const opacity = Math.pow(1 - progress, 2);
      const mat = sphereRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
      mat.needsUpdate = true;
    }

    if (lightRef.current) {
      // 광원의 밝기 점차 감소
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

/** ----------------------------
 *  3) Hitbox
 * ---------------------------- */
interface HitboxProps {
  position: THREE.Vector3;
  duration: number;
  radius: number;
  excludeCollisionGroup?: number[];
  onHit?: (other?: unknown, pos?: THREE.Vector3) => void;
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
  useProgress(duration, 0, () => setDestroyed(true));

  if (destroyed) return null;

  const collisionGroups = CollisionSystem.createRigidBodyCollisionGroups(
    CollisionGroup.Projectile,
    excludeCollisionGroup
  );

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
      collisionGroups={collisionGroups}
    >
      <BallCollider args={[radius]} />
      {/* Debug 시각화 */}
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

/** ----------------------------
 *  4) SingleMeteor
 * ---------------------------- */
type SingleMeteorProps = Omit<MeteorProps, "targetPositions"> & {
  targetPosition: THREE.Vector3;
  startDelay: number;
};

const SingleMeteor: React.FC<SingleMeteorProps> = ({
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
  const [impactDone, setImpactDone] = useState(false);

  // duration 동안 0~1 로 증가하는 progress / 활성화 여부 active
  const { progress, active } = useProgress(duration, startDelay);

  // 충돌 이펙트에 쓰이는 공통 반경/지속
  const impactRadius = radius;
  const impactDuration = 600;

  // 시각 요소 크기
  const meteorSize = impactRadius * 0.9;
  const emberSize = meteorSize * 0.7;
  const trailWidth = radius * 2.0;
  const trailLength = radius * 0.6;

  const direction = useMemo(() => {
    return targetPosition.clone().sub(startPosition);
  }, [startPosition, targetPosition]);

  useFrame(() => {
    // 아직 시작 전이거나, 이미 임팩트 끝나면 무시
    if (!active || impactDone) return;

    // 0~1 사이의 progress만큼 위치 보간
    const currentPosition = startPosition
      .clone()
      .add(direction.clone().multiplyScalar(progress));

    // Meteor 본체 회전/랜덤 스케일
    if (meteorRef.current) {
      meteorRef.current.position.copy(currentPosition);
      meteorRef.current.rotation.x += 0.01;
      meteorRef.current.rotation.y += 0.02;
      meteorRef.current.rotation.z += 0.015;
      const scale = THREE.MathUtils.randFloat(0.9, 1.1);
      meteorRef.current.scale.set(scale, scale, scale);
    }

    // Ember(내부 불덩이) 회전/랜덤 스케일
    if (emberRef.current) {
      emberRef.current.position.copy(currentPosition);
      emberRef.current.rotation.y += 0.05;
      const emberScale = THREE.MathUtils.randFloat(0.6, 1.3);
      emberRef.current.scale.set(emberScale, emberScale, emberScale);
    }

    // 광원 위치/밝기
    if (lightRef.current) {
      lightRef.current.position.copy(currentPosition);
      lightRef.current.intensity = THREE.MathUtils.randFloat(3, 5);
    }

    // 타겟 근처 도달 시 임팩트 이펙트 시작
    if (!showImpact && currentPosition.distanceTo(targetPosition) < 0.3) {
      setShowImpact(true);
    }
  });

  // 임팩트 이펙트가 시작되면, impactDuration후에 Meteor/이펙트 종료
  useEffect(() => {
    if (showImpact && !impactDone) {
      const timer = setTimeout(() => {
        setImpactDone(true);
        onComplete?.();
      }, impactDuration);
      return () => clearTimeout(timer);
    }
  }, [showImpact, impactDone, onComplete, impactDuration]);

  // 아직 활성화 전이면 렌더 X
  if (!active) return null;

  return (
    <>
      {/* Meteor 본체 & Ember & Trail (임팩트 전까지) */}
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

      {/* 임팩트 발생 시 (시각 이펙트 + 폭발 + Hitbox) */}
      {showImpact && !impactDone && (
        <>
          <ImpactEffect position={targetPosition} radius={impactRadius} />
          <Explosion position={targetPosition} />
          <Hitbox
            position={targetPosition}
            duration={impactDuration}
            radius={impactRadius}
            excludeCollisionGroup={excludeCollisionGroup}
            onHit={onHit}
            debug={debug}
          />
        </>
      )}
    </>
  );
};

/** ----------------------------
 *  5) Meteor
 * ---------------------------- */
type MeteorProps = Omit<
  MeteorEffectProps,
  "type" | "targetPosition" | "count" | "spread" | "rayOriginYOffset"
> & {
  startPosition: THREE.Vector3;
  targetPositions: THREE.Vector3[];
};
export const Meteor: React.FC<MeteorProps> = ({
  startPosition,
  targetPositions,
  duration,
  radius,
  excludeCollisionGroup,
  onHit,
  onComplete,
  debug = false,
}) => {
  const [impactCount, setImpactCount] = useState(0);

  // 모든 meteor가 임팩트를 마치면 onComplete
  useEffect(() => {
    if (impactCount === targetPositions.length) {
      onComplete?.();
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
          radius={radius}
          startDelay={100 * index + Math.random() * 100}
          excludeCollisionGroup={excludeCollisionGroup}
          onHit={onHit}
          onComplete={() => setImpactCount((prev) => prev + 1)}
          debug={debug}
        />
      ))}
    </>
  );
};
