import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Ring } from "@react-three/drei";

interface TargetIndicatorProps {
  position: THREE.Vector3;
  radius?: number;
  color?: string;
  duration?: number;
  pulseSpeed?: number;
}

/**
 * 메테오가 떨어질 위치를 바닥에 표시하는 이펙트 컴포넌트
 */
export const TargetIndicator: React.FC<TargetIndicatorProps> = ({
  position,
  radius = 2,
  color = "#ff3300",
  duration = 1500,
  pulseSpeed = 2,
}) => {
  const startTime = useRef(Date.now());
  const [destroyed, setDestroyed] = useState(false);

  // 두 개의 링을 사용해 더 다이나믹한 효과
  const outerRingRef = useRef<THREE.Mesh>();
  const innerRingRef = useRef<THREE.Mesh>();
  const innerRingScale = useRef(0);

  // 경고 완료 시 정리
  useEffect(() => {
    const timer = setTimeout(() => {
      setDestroyed(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  useFrame(() => {
    if (destroyed) return;

    const elapsedMs = Date.now() - startTime.current;
    const progress = Math.min(elapsedMs / duration, 1);

    // 전체 진행에 따른 페이드 아웃 (마지막 20%에서 페이드 아웃)
    const opacity =
      progress > 0.8
        ? (1 - progress) * 5 // 마지막 20%에서 빠르게 페이드 아웃
        : 1;

    // 펄스 애니메이션
    const pulseValue = Math.sin(elapsedMs * 0.01 * pulseSpeed) * 0.5 + 0.5;

    // 점점 빠르게 깜빡이는 효과
    const flickerValue =
      Math.random() > 0.7 - progress * 0.4 ? 1 : 0.2 + Math.random() * 0.3;

    if (outerRingRef.current) {
      // 외부 링은 크기가 고정되어 있고 깜빡임
      const material = outerRingRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = opacity * flickerValue;
      material.color.setStyle(color);
      material.needsUpdate = true;

      // 애니메이션 진행에 따라 외부 링이 약간 확장됨
      const scaleFactor = 1 + progress * 0.1;
      outerRingRef.current.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }

    if (innerRingRef.current) {
      // 내부 링은 펄스 효과
      const material = innerRingRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = opacity * 0.7 * (1 - pulseValue * 0.5);
      material.needsUpdate = true;

      // 내부 링 크기 변화 (펄싱 효과)
      innerRingScale.current = 0.5 + pulseValue * 0.65;
      innerRingRef.current.scale.set(
        innerRingScale.current,
        innerRingScale.current,
        innerRingScale.current
      );
    }
  });

  if (destroyed) return null;

  // Y 좌표는 바닥에 딱 붙게 약간 올려줌 (z-fighting 방지)
  const adjustedPosition = new THREE.Vector3(
    position.x,
    position.y + 0.01, // 바닥보다 살짝 위에 배치
    position.z
  );

  return (
    <group position={adjustedPosition} rotation={[-Math.PI / 2, 0, 0]}>
      {/* 외부 링 - 메인 표시기 */}
      <Ring
        ref={outerRingRef}
        args={[radius * 0.95, radius, 64, 1, 0, Math.PI * 2]}
      >
        <meshBasicMaterial
          color={color}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Ring>

      {/* 내부 링 - 보조 표시기 */}
      <Ring ref={innerRingRef} args={[0, radius * 0.85, 32, 1, 0, Math.PI * 2]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Ring>

      {/* 중앙 십자선 표시 */}
      <group>
        {/* 가로선 */}
        <mesh>
          <boxGeometry args={[radius * 0.5, radius * 0.05, 0.01]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* 세로선 */}
        <mesh>
          <boxGeometry args={[radius * 0.05, radius * 0.5, 0.01]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
};
