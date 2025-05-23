import React, { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigidBody, BallCollider } from "@react-three/rapier";
import { CollisionBitmask } from "../../constants/collisionGroups";
import { FireBallEffectProps } from "./FireBallEffectController";
import { RigidBodyCollisionSystem } from "../../utils/rigidbodyCollisionSystem";
import { ActiveCollisionTypes } from "@dimforge/rapier3d-compat";

export const FireBall: React.FC<FireBallEffectProps> = ({
  type,
  startPosition,
  direction,
  speed,
  duration,
  radius, // 기본 크기 비율 추가 (기본값 1)
  excludeCollisionGroup, // 충돌 그룹
  onHit,
  onComplete,
}) => {
  const [destroyed, setDestroyed] = useState(false);
  const [trailReady, setTrailReady] = useState(false);

  const [trailKey, setTrailKey] = useState(0);
  // FireBall의 "생성 시점"
  const startTime = useRef(Date.now());

  // RigidBody 참조 (Rapier 객체)
  const rigidRef = useRef(null);
  const groupRef = useRef<THREE.Group>(null);

  // 내부 Mesh & Light를 가리키는 ref
  const outerRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // 처음 몇 프레임 건너뛴 뒤 Trail을 보여주도록
  const frameCountRef = useRef(0);

  // 크기 관련 상수 계산
  const outerRadius = radius;
  const coreRadius = 0.9 * radius;
  const colliderRadius = radius;
  const lightDistance = 8 * radius;
  const lightIntensityBase = 5 * radius;

  // 매 프레임마다 kinematic RigidBody의 위치와 이펙트를 업데이트
  useFrame(() => {
    if (destroyed) return;

    frameCountRef.current++;
    // 예: 2~3프레임(또는 n프레임) 지난 뒤 Trail 표시
    if (!trailReady && frameCountRef.current > 5) {
      setTrailReady(true);
      setTrailKey(trailKey + 1);
    }

    const elapsed = Date.now() - startTime.current;
    const seconds = elapsed / 1000;

    // // 새 위치 = 초기 위치 + 방향 * 속도 * 경과시간
    const currentPos = startPosition
      .clone()
      .add(direction.clone().multiplyScalar(speed * seconds));

    // // Rapier Kinematic Body 이동 업데이트
    // setNextKinematicTranslation( { x, y, z } ) 형태로 전달
    rigidRef.current?.setNextKinematicTranslation({
      x: currentPos.x,
      y: currentPos.y,
      z: currentPos.z,
    });

    // Fade out 계산
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

    // Material opacity 조정
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
        (lightIntensityBase +
          Math.sin(elapsed * 0.03) * 2 * radius +
          Math.random()) *
        opacityFactor;
    }

    // 수명이 끝나면 소멸
    if (elapsed > duration) {
      console.log("FireBall complete");
      setDestroyed(true);
      onComplete?.();
    }
  });

  // 소멸되면 렌더링 X
  if (destroyed) return null;

  // RigidBody를 위한 충돌 그룹 계산
  const collisionGroups =
    RigidBodyCollisionSystem.setupRigidBodyCollisionGroups(
      CollisionBitmask.Projectile,
      excludeCollisionGroup
    );

  return (
    <RigidBody
      ref={rigidRef}
      type="kinematicPosition"
      position={[startPosition.x, startPosition.y, startPosition.z]}
      colliders={false}
      sensor={true}
      activeCollisionTypes={ActiveCollisionTypes.ALL}
      onIntersectionEnter={(other) => {
        const translation = rigidRef.current?.translation();
        const hitPosition = translation
          ? new THREE.Vector3(translation.x, translation.y, translation.z)
          : undefined;
        onHit?.(other, type, hitPosition);
        onComplete?.();
        setDestroyed(true);
      }}
      gravityScale={0}
      collisionGroups={collisionGroups}
    >
      {/* FireBall 충돌용 컬라이더 (반지름=0.4) */}
      <BallCollider args={[colliderRadius]} />

      <group ref={groupRef}>
        {/* 불꽃 외피 */}
        <mesh ref={outerRef}>
          <sphereGeometry args={[outerRadius, 16, 16]} />
          <meshBasicMaterial
            color="#ff3300"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* 중심 코어 */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[coreRadius, 16, 16]} />
          <meshBasicMaterial
            color="#ffffcc"
            transparent
            opacity={1}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* 포인트 라이트 */}
        <pointLight
          ref={lightRef}
          color="#ff6600"
          intensity={lightIntensityBase}
          distance={lightDistance}
          decay={2}
        />
      </group>
    </RigidBody>
  );
};
