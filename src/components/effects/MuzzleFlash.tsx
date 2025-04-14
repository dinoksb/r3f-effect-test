// MuzzleFlash.tsx (새 파일)
import React, { useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

// --- Muzzle Flash 설정 ---
const FLASH_PETAL_COUNT = 5; // 화염 갈래 수
const FLASH_PETAL_LENGTH = 0.4; // 각 갈래 길이
const FLASH_PETAL_BASE_RADIUS = 0.03; // 각 갈래 밑면 반지름
const FLASH_RADIAL_SEGMENTS = 4; // 각 갈래 원뿔 분할 수
const FLASH_TILT_ANGLE = Math.PI / 4; // 화염 갈래 기울기 (45도)
const FLASH_INNER_GLOW_SIZE = 0.08; // 중앙 빛 크기
const FLASH_COLOR = "#FFA500"; // 주황색 계열
const FLASH_INNER_COLOR = "#FFFF55"; // 더 밝은 노란색 중심
const DEFAULT_DURATION = 100; // 기본 지속 시간
// ------------------------

interface MuzzleFlashProps {
  config: { [key: string]: PrimitiveOrArray };
  onComplete?: () => void;
}

// Utility to convert THREE.Vector3 to array (needed for store/server)
const vecToArray = (vec: THREE.Vector3): [number, number, number] => {
  return [vec.x, vec.y, vec.z];
};

// Utility to convert Vector3 array to THREE.Vector3 (needed for rendering)
const arrayToVec = (arr?: [number, number, number]): THREE.Vector3 => {
  if (!arr) {
    console.error("Missing required config properties");
    return new THREE.Vector3();
  }
  return new THREE.Vector3(arr[0], arr[1], arr[2]);
};

export const createMuzzleFlashConfig = (
  position: THREE.Vector3,
  direction: THREE.Vector3,
  duration: number
): { [key: string]: PrimitiveOrArray } => {
  return {
    position: vecToArray(position),
    direction: vecToArray(direction),
    duration,
  };
};

const parseConfig = (config: { [key: string]: any }) => {
  return {
    position: arrayToVec(config.position as [number, number, number]),
    direction: arrayToVec(config.direction as [number, number, number]),
    duration: (config.duration as number) || DEFAULT_DURATION,
  };
};

export const MuzzleFlash: React.FC<MuzzleFlashProps> = ({
  config,
  onComplete,
}) => {
  const { position, direction, duration } = parseConfig(config);

  const [visible, setVisible] = useState(true);
  const startTime = useMemo(() => Date.now(), []); // 생성 시간 기록 (애니메이션용)

  // 방향에 따른 회전 계산
  const flashQuaternion = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    const normalizedDirection = direction.clone().normalize();
    // Z축(0,0,1)이 기본 방향인 그룹을 발사 방향으로 회전
    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normalizedDirection
    );
    return quaternion;
  }, [direction]);

  // --- Muzzle Flash 관련 Memos ---
  const petalGeometry = useMemo(
    () =>
      new THREE.ConeGeometry(
        FLASH_PETAL_BASE_RADIUS,
        FLASH_PETAL_LENGTH,
        FLASH_RADIAL_SEGMENTS
      ),
    []
  );
  const petalMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: FLASH_COLOR,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    []
  );
  const innerGlowGeometry = useMemo(
    () => new THREE.SphereGeometry(FLASH_INNER_GLOW_SIZE, 16, 8),
    []
  );
  const innerGlowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: FLASH_INNER_COLOR,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
      }),
    []
  );
  // --- Muzzle Flash 관련 Memos 끝 ---

  // 자동 소멸 타이머
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]); // id나 onComplete 함수가 변경되면 타이머 재설정

  // Opacity 애니메이션
  useFrame(() => {
    if (!visible) return;
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const opacity = 1.0 - progress; // 시간에 따라 투명도 감소

    petalMaterial.opacity = opacity * 0.8;
    innerGlowMaterial.opacity = opacity;
  });

  if (!position || !direction || !duration) {
    console.error("[MuzzleFlash] Missing required config properties");
    return null;
  }

  if (!visible) return null; // 보이지 않으면 렌더링 안 함

  return (
    <group position={position} quaternion={flashQuaternion}>
      {/* 중앙 빛 */}
      <mesh geometry={innerGlowGeometry} material={innerGlowMaterial} />

      {/* 화염 갈래들 (ConeGeometry 사용 및 기울기 적용) */}
      {Array.from({ length: FLASH_PETAL_COUNT }).map((_, i) => {
        const radialAngle = (i / FLASH_PETAL_COUNT) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, 0, radialAngle]}>
            <group rotation={[FLASH_TILT_ANGLE, 0, 0]}>
              <mesh
                geometry={petalGeometry}
                material={petalMaterial}
                position={[0, FLASH_PETAL_LENGTH / 2, 0]}
              />
            </group>
          </group>
        );
      })}
    </group>
  );
};
