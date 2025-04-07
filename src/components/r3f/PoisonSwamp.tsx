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

interface PoisonCloudProps {
  center: THREE.Vector3;
  duration?: number;
  fadeOutDuration?: number;
  radius?: number; // 원형 범위의 반지름
  height?: number; // 원형 범위의 높이
  opacity?: number;
  particleCount?: number;
  hitInterval?: number; // onHit 호출 간격 (밀리초)
  onHit?: (other?: unknown, pos?: THREE.Vector3) => void; // 충돌 시 콜백
  onComplete?: () => void;
  debug?: boolean;
}

interface BubbleParticle {
  position: THREE.Vector3;
  size: number;
  delay: number;
  velocity: THREE.Vector3;
  lifespan: number; // 각 방울의 생존 시간 (ms)
  burstTime: number; // 방울이 터지는 시간 (ms)
  burstScale: number; // 터질 때 크기 배율
  active: boolean; // 활성화 상태
}

// 원형 범위 내에서 뽀글뽀글 방울 파티클 생성 함수
function createBubbleParticles(
  count: number,
  radius: number,
  height: number,
  duration: number
) {
  const particles: BubbleParticle[] = [];

  for (let i = 0; i < count; i++) {
    // 원형 범위 내 랜덤 위치 생성 (극좌표 사용)
    const angle = Math.random() * Math.PI * 2; // 0-2π 랜덤 각도
    const distance = Math.random() * radius * 0.9; // 중심으로부터의 거리 (90%까지만 사용)

    // 극좌표 → 직교좌표 변환
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    // 수정: 바닥 위에서 시작하여 height 내에서 분포
    // 0.05 ~ 0.5 * height 범위 내에서 생성 (바닥 바로 위부터 height의 절반 높이까지)
    const y = Math.random() * (height * 0.45) + 0.05;

    const position = new THREE.Vector3(x, y, z);

    // 작은 크기의 방울
    const size = 0.05 + Math.random() * 0.1;

    // 매우 느리게 올라오는 속도
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.004, // 약간의 좌우 움직임
      0.003 + Math.random() * 0.005, // 매우 천천히 위로 올라감
      (Math.random() - 0.5) * 0.004 // 약간의 앞뒤 움직임
    );

    // 생성 시간 지연 (전체 시간에 걸쳐 지속적으로 방울 생성)
    const delay = Math.random() * duration * 0.7;

    // 방울 생명주기 (짧은 시간 동안만 존재)
    const lifespan = 300 + Math.random() * 500; // 300~800ms 생존

    // 방울이 터지는 시간 (생존 시간의 70~90% 지점)
    const burstTimeRatio = 0.7 + Math.random() * 0.2;
    const burstTime = lifespan * burstTimeRatio;

    // 터질 때 크기 배율 (1.5~2.5배 커짐)
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

// Rapier의 CollisionTarget에 handle 속성이 있지만 타입 정의가 불완전함
interface RapierCollisionTarget {
  handle: number;
  rigidBodyObject?: {
    name?: string;
    uuid?: string;
  };
}

export const PoisonSwamp: React.FC<PoisonCloudProps> = ({
  center,
  duration = 2000,
  fadeOutDuration = 1000,
  onComplete: onFinish,
  radius = 5,
  height = -0.5,
  opacity = 0.5,
  debug = true,
  onHit,
  hitInterval = 500,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(performance.now());
  const finishCalled = useRef(false);
  const particleCount = useMemo(() => radius * 100, [radius]);
  const calcHeight = useMemo(() => center.y + height, [center, height]);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const cylinderRef = useRef<THREE.Mesh>(null);

  // 충돌 상태 관리 - 단순화
  const collisionState = useRef({
    lastHitTime: 0,
    // handle -> 객체 매핑 (충돌 중인 객체 추적 및 onHit 호출용)
    collidingObjects: new Map<number, unknown>(),
  });

  // 컴포넌트 마운트/언마운트 시 정리
  useEffect(() => {
    return () => {
      // 정리 함수: 충돌 상태 초기화
      collisionState.current = {
        lastHitTime: 0,
        collidingObjects: new Map<number, unknown>(),
      };
    };
  }, []);

  // Material refs
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const swampFloorRef = useRef<THREE.Mesh>(null);
  const swampFloorMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  // 충돌 감지 발생 시 호출
  const handleCollisionEnter: IntersectionEnterHandler = (event) => {
    if (!event.other) return;

    const now = performance.now();
    // 타입 단언을 두 단계로 수행 (unknown으로 먼저 변환)
    const target = event.other as unknown as RapierCollisionTarget;
    const handle = target.handle;

    if (debug) {
      console.log("충돌 감지:", handle, event.other);
    }

    // 충돌 객체 추가
    collisionState.current.collidingObjects.set(handle, event.other);

    // hitInterval 시간이 지났거나 첫 충돌인 경우에만 onHit 호출
    if (now - collisionState.current.lastHitTime >= hitInterval) {
      collisionState.current.lastHitTime = now;

      if (onHit) {
        onHit(event.other, center);
      }
    }
  };

  // 충돌 종료 시 호출
  const handleCollisionExit: IntersectionExitHandler = (event) => {
    if (!event.other) return;

    // 타입 단언을 두 단계로 수행 (unknown으로 먼저 변환)
    const target = event.other as unknown as RapierCollisionTarget;
    const handle = target.handle;

    if (debug) {
      console.log("충돌 종료:", handle, event.other);
      console.log(
        "제거 전 충돌 객체 수:",
        collisionState.current.collidingObjects.size
      );
    }

    // 충돌 객체 제거
    collisionState.current.collidingObjects.delete(handle);

    if (debug) {
      console.log(
        "제거 후 충돌 객체 수:",
        collisionState.current.collidingObjects.size
      );
    }
  };

  // 재사용할 임시 Object3D
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // 방울 파티클 생성
  const bubbles = useMemo(
    () => createBubbleParticles(particleCount, radius, calcHeight, duration),
    [radius, calcHeight, particleCount, duration]
  );

  // 색상 정의
  const startColor = useMemo(() => new THREE.Color("#66ff66"), []);
  const midColor = useMemo(() => new THREE.Color("#44aa44"), []);
  const swampBaseColor = useMemo(() => new THREE.Color("#336633"), []);

  useFrame(() => {
    const now = performance.now();
    const elapsed = now - startTime.current;
    const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1);

    // 페이드아웃 계산
    const fadeOutProgress =
      elapsed > duration
        ? THREE.MathUtils.clamp((elapsed - duration) / fadeOutDuration, 0, 1)
        : 0;

    // 색상 및 불투명도 계산
    const currentColor = startColor.clone().lerp(midColor, progress);
    const fadeIn = progress < 0.4 ? progress / 0.4 : 1;
    const finalOpacity = fadeIn * (1 - fadeOutProgress) * opacity;

    // 메테리얼 업데이트
    if (materialRef.current) {
      materialRef.current.color.copy(currentColor);
      materialRef.current.opacity = finalOpacity;
      materialRef.current.emissive.copy(currentColor);
    }

    // 늪 바닥 업데이트
    if (swampFloorMaterialRef.current) {
      swampFloorMaterialRef.current.opacity = finalOpacity * 0.7;
      const pulseIntensity = Math.sin(elapsed * 0.003) * 0.1 + 0.9;
      swampFloorMaterialRef.current.color
        .copy(swampBaseColor)
        .multiplyScalar(pulseIntensity);

      if (swampFloorMaterialRef.current.map) {
        swampFloorMaterialRef.current.map.offset.x = elapsed * 0.0001;
        swampFloorMaterialRef.current.map.offset.y = elapsed * 0.00015;
      }
    }

    // 디버그 원통 업데이트
    if (cylinderRef.current && debug) {
      const cylinderMaterial = cylinderRef.current
        .material as THREE.MeshBasicMaterial;
      cylinderMaterial.opacity = 0.4 * fadeIn * (1 - fadeOutProgress);
      cylinderMaterial.needsUpdate = true;
    }

    // 주기적인 충돌 처리 - 모든 충돌 객체에 대해 처리
    const { collidingObjects } = collisionState.current;
    if (
      collidingObjects.size > 0 &&
      now - collisionState.current.lastHitTime >= hitInterval &&
      onHit
    ) {
      collisionState.current.lastHitTime = now;

      // 충돌 중인 모든 객체에 대해 onHit 호출
      collidingObjects.forEach((object) => {
        onHit(object, center);
      });
    }

    // 페이드아웃 시작 시 충돌 상태 정리
    if (fadeOutProgress > 0.5) {
      collisionState.current.collidingObjects.clear();
    }

    // 방울 파티클 업데이트
    if (meshRef.current) {
      bubbles.forEach((bubble, i) => {
        // 아직 생성 시간이 아니면 표시하지 않음
        if (elapsed < bubble.delay) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);
          return;
        }

        // 방울의 생존 시간 계산
        const bubbleElapsed = elapsed - bubble.delay;

        // 방울의 생존 시간이 끝났으면 비활성화
        if (bubbleElapsed > bubble.lifespan || fadeOutProgress >= 1) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);

          // 비활성 상태가 아니라면 재활용 (새 방울 생성)
          if (bubble.active && fadeOutProgress < 0.8) {
            // 초기 위치로 리셋 (원형 범위 내 랜덤 위치)
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius * 0.9;

            bubble.position.set(
              Math.cos(angle) * distance,
              Math.random() * (calcHeight * 0.45) + 0.05, // 바닥 위에서 height의 절반 높이 이내로 분포
              Math.sin(angle) * distance
            );

            // 재활성화를 위한 새 지연 시간
            bubble.delay = elapsed + Math.random() * 500;
            bubble.active = false;
          }
          return;
        }

        // 방울이 이제 활성화됨
        bubble.active = true;

        // 위치 업데이트
        bubble.position.add(bubble.velocity);

        // 방울 크기 계산 (터짐 효과)
        let scale = bubble.size;

        // 방울이 터지는 애니메이션
        if (bubbleElapsed >= bubble.burstTime) {
          // 방울이 터진 후 서서히 사라짐
          const burstElapsed = bubbleElapsed - bubble.burstTime;
          const burstDuration = bubble.lifespan - bubble.burstTime;
          const burstProgress = burstElapsed / burstDuration;

          // 터진 후 커졌다가 사라지는 효과
          scale = bubble.size * bubble.burstScale * (1 - burstProgress * 0.8);

          // 터질 때 약간 위로 가속
          bubble.velocity.y += 0.0001;
        } else {
          // 터지기 전까지는 점점 커짐
          const growProgress = bubbleElapsed / bubble.burstTime;
          scale = bubble.size * (1 + growProgress * 0.3);
        }

        // 인스턴스 행렬 업데이트
        dummy.position.copy(bubble.position);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      });

      // 행렬 업데이트 적용
      meshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 종료 처리
    if (fadeOutProgress >= 1 && !finishCalled.current) {
      finishCalled.current = true;
      // 완료 시 충돌 상태 초기화
      collisionState.current.collidingObjects.clear();
      onFinish?.();
    }
  });

  // 콜라이더 크기 계산 - 항상 양수값 보장
  const safeHeight = Math.max(Math.abs(calcHeight), 0.1);

  return (
    <group ref={groupRef} position={center}>
      {/* 늪 바닥 (원형 평면) */}
      <Circle
        ref={swampFloorRef}
        args={[radius, 32]}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, (center.y += 0.001), 0]}
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

      {/* 충돌 감지를 위한 RigidBody */}
      <RigidBody
        ref={rigidBodyRef}
        type="fixed"
        colliders={false}
        sensor
        onIntersectionEnter={handleCollisionEnter}
        onIntersectionExit={handleCollisionExit}
      >
        <CylinderCollider
          args={[safeHeight / 2, radius * 0.95]}
          position={[0, calcHeight / 2, 0]}
        />

        {/* 디버그용 원통 (hitbox 시각화) */}
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

      {/* 독구름 방울 시스템 */}
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
