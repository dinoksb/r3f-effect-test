import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, BallCollider } from '@react-three/rapier';

interface FireBallProps {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;  // 정규화된 방향 벡터
  speed: number;             // 1초당 이동 거리
  duration: number;          // 생존 시간 (밀리초)
  onHit?: (other?: unknown, pos?: THREE.Vector3) => void;  // 충돌 시 콜백
  onComplete?: () => void;
}

export const FireBall: React.FC<FireBallProps> = ({
  startPosition,
  direction,
  speed,
  duration,
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

  // 내부 Mesh & Light를 가리키는 ref
  const outerRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

    // 처음 몇 프레임 건너뛴 뒤 Trail을 보여주도록
  const frameCountRef = useRef(0);

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
    const currentPos = startPosition.clone().add(
      direction.clone().multiplyScalar(speed * seconds)
    );

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
        (5 + Math.sin(elapsed * 0.03) * 2 + Math.random()) * opacityFactor;
    }

    // 수명이 끝나면 소멸
    if (elapsed > duration) {
      setDestroyed(true);
      onComplete?.();
    }
  });

  // 소멸되면 렌더링 X
  if (destroyed) return null;

  return (
    <RigidBody
      ref={rigidRef}
      // Sensor 충돌 모드 설정
      type="kinematicPosition"
      colliders={false}   // 아래 BallCollider로 모양 지정
      sensor={true}       // 물리 반응 없이 충돌 이벤트만
      // 충돌(교차) 이벤트
      onIntersectionEnter={(other) => {
        // FireBall이 다른 RigidBody와 교차하면 호출
        const translation = rigidRef.current?.translation();
        const hitPosition = translation
        ? new THREE.Vector3(translation.x, translation.y, translation.z)
        : undefined;
        onHit?.(other, hitPosition);
        setDestroyed(true);
      }}
      // 초기 위치 설정
      position={[startPosition.x, startPosition.y, startPosition.z]}
      // 중력등 영향 안 받도록
      gravityScale={0}
    >
      {/* FireBall 충돌용 컬라이더 (반지름=0.4) */}
      <BallCollider args={[0.4]} />

      {/* 불꽃 외피 */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.4, 16, 16]} />
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

      {/* 포인트 라이트 */}
      <pointLight
        ref={lightRef}
        color="#ff6600"
        intensity={5}
        distance={8}
        decay={2}
      />

      {/* Trail 효과 (살짝 지연 후) */}
      {/* {trailReady && (
        <Trail
          target={coreRef}
          width={4}
          length={1}
          color={new THREE.Color('#ff6600')}
          attenuation={(w) => w}
        />
      )} */}
    </RigidBody>
  );
};
