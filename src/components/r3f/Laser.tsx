import React, { useRef, useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';

interface LaserProps {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;  // 정규화된 방향 벡터
  duration: number;          // 생존 시간 (밀리초)
  length?: number;           // 레이저 빔 길이
  thickness?: number;        // 레이저 빔 두께
  onHit?: (other?: unknown, pos?: THREE.Vector3) => void;  // 충돌 시 콜백
  onComplete?: () => void;
}

export const Laser: React.FC<LaserProps> = ({
  startPosition,
  direction,
  duration,
  length = 10,
  thickness = 0.3,
  onHit,
  onComplete,
}) => {
  const [destroyed, setDestroyed] = useState(false);
  
  // Laser의 "생성 시점"
  const startTime = useRef(Date.now());

  // RigidBody 참조 (Rapier 객체)
  const rigidRef = useRef(null);

  // 내부 Mesh를 가리키는 ref
  const beamRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // 현재 위치와 방향을 저장하는 ref (매 프레임 업데이트)
  const positionRef = useRef(startPosition.clone());
  const directionRef = useRef(direction.clone().normalize());
  const endPositionRef = useRef(new THREE.Vector3());

  // Geometry를 기본 예시용으로 생성 (캐싱)
  const beamGeometry = useMemo(() => {
    // Custom geometry with pivot at one end
    const geo = new THREE.CylinderGeometry(1, 1, 1, 8);
    // 실린더의 피벗을 한쪽 끝으로 이동 (Y축 방향으로 -0.5만큼)
    geo.translate(0, 0.5, 0);
    // Y축 중심의 실린더를 Z축 방향으로 회전
    geo.rotateX(Math.PI / 2);
    return geo;
  }, []);

  // props가 변경될 때마다 ref 업데이트
  useEffect(() => {
    positionRef.current.copy(startPosition);
    directionRef.current.copy(direction).normalize();
  }, [startPosition, direction]);

  // 매 프레임마다 이펙트를 업데이트
  useFrame(() => {
    if (destroyed) return;

    const elapsed = Date.now() - startTime.current;

    // 최신 위치와 방향 업데이트
    positionRef.current.copy(startPosition);
    directionRef.current.copy(direction).normalize();
    
    // 레이저 빔의 끝점 계산
    endPositionRef.current.copy(positionRef.current).add(
      directionRef.current.clone().multiplyScalar(length)
    );
    
    // Rigid Body 위치 업데이트
    if (rigidRef.current) {
      rigidRef.current.setTranslation(
        { 
          x: positionRef.current.x, 
          y: positionRef.current.y, 
          z: positionRef.current.z 
        },
        true // 강제 업데이트
      );

      // 방향도 업데이트
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1), // 기본 방향 (Z+)
        directionRef.current
      );
      
      rigidRef.current.setRotation(
        {
          x: quaternion.x,
          y: quaternion.y,
          z: quaternion.z,
          w: quaternion.w
        },
        true // 강제 업데이트
      );
    }

    // Fade in/out 계산
    const fadeInDuration = 200; // 페이드인 시간 (ms)
    const fadeOutStart = duration - 400; // 페이드아웃 시작 시간 (ms)
    
    const fadeInProgress = Math.min(elapsed / fadeInDuration, 1);
    const fadeOutElapsed = Math.max(elapsed - fadeOutStart, 0);
    const fadeOutProgress = Math.min(fadeOutElapsed / 400, 1);
    
    // 최종 불투명도 팩터
    const opacityFactor = fadeInProgress * (1 - fadeOutProgress);

    // 시간에 따른 펄스 및 깜빡임 효과
    const pulseEffect = (Math.sin(elapsed * 0.01) * 0.2 + 0.8);
    const flickerScale = 0.9 + Math.sin(elapsed * 0.02) * 0.1 + Math.random() * 0.05;
    
    // 빔 스케일 업데이트
    if (beamRef.current) {
      beamRef.current.scale.set(
        thickness * flickerScale, 
        thickness * flickerScale, 
        length
      );
    }
    
    if (coreRef.current) {
      const coreScale = 0.6 + Math.sin(elapsed * 0.04) * 0.1;
      coreRef.current.scale.set(
        thickness * 0.7 * coreScale, 
        thickness * 0.7 * coreScale, 
        length * 0.95
      );
    }

    if (glowRef.current) {
      const glowPulse = 1 + Math.sin(elapsed * 0.01) * 0.15;
      glowRef.current.scale.set(
        thickness * 1.5 * glowPulse, 
        thickness * 1.5 * glowPulse, 
        length * 1.05
      );
    }

    // Material opacity 조정
    const beamMat = beamRef.current?.material as THREE.MeshBasicMaterial;
    const coreMat = coreRef.current?.material as THREE.MeshBasicMaterial;
    const glowMat = glowRef.current?.material as THREE.MeshBasicMaterial;
    
    if (beamMat && coreMat && glowMat) {
      beamMat.opacity = 0.7 * opacityFactor;
      coreMat.opacity = 0.9 * opacityFactor;
      glowMat.opacity = 0.5 * opacityFactor * pulseEffect;
      
      beamMat.needsUpdate = true;
      coreMat.needsUpdate = true;
      glowMat.needsUpdate = true;
    }

    // Light intensity
    if (lightRef.current) {
      lightRef.current.intensity = 3 * opacityFactor * pulseEffect;
    }

    // 수명이 끝나면 소멸
    if (elapsed > duration) {
      setDestroyed(true);
      onComplete?.();
    }
  });

  // 소멸되면 렌더링 X
  if (destroyed) return null;

  // 초기 회전 계산
  const initialQuaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1), // 기본 방향 (Z+)
    direction.clone().normalize()
  );

  return (
    <RigidBody
      ref={rigidRef}
      type="kinematicPosition"
      colliders={false}
      sensor={true}
      onIntersectionEnter={(other) => {
        // 충돌 지점을 레이저 빔의 끝 부분으로 가정
        onHit?.(other, endPositionRef.current);
      }}
      position={[startPosition.x, startPosition.y, startPosition.z]}
      rotation={new THREE.Euler().setFromQuaternion(initialQuaternion)}
      gravityScale={0}
    >
      {/* 레이저 충돌용 캡슐 컬라이더 */}
      <CapsuleCollider args={[length / 2, thickness]} rotation={[0, 0, Math.PI / 2]} position={[0, 0, length / 2]} />

      {/* 레이저 빔 외부 */}
      <mesh ref={beamRef} scale={[thickness, thickness, length]}>
        <primitive object={beamGeometry} />
        <meshBasicMaterial
          color="#8a2be2" // 보라색 계열
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 레이저 빔 내부 코어 */}
      <mesh ref={coreRef} scale={[thickness * 0.7, thickness * 0.7, length * 0.95]}>
        <primitive object={beamGeometry} />
        <meshBasicMaterial
          color="#e0b0ff" // 밝은 보라색
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 레이저 빔 외부 발광 */}
      <mesh ref={glowRef} scale={[thickness * 1.5, thickness * 1.5, length * 1.05]}>
        <primitive object={beamGeometry} />
        <meshBasicMaterial
          color="#b060ff" // 중간 보라색
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 포인트 라이트 - 레이저 빔 끝부분에 위치 */}
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