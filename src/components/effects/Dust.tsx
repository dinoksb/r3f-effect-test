import * as THREE from "three";
import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useFrame } from "@react-three/fiber";

// --- 기존 유틸리티 및 타입 정의 (변경 없음) ---
type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

const DEFAULT_OPACITY = 0.4; // 약간 더 불투명하게 조정 가능
const DEFAULT_SIZE = 0.5; // 전체 효과의 최대 크기/퍼짐 정도
const DEFAULT_DURATION = 500; // 지속 시간 조정 가능
const PARTICLE_COUNT = 8;
const SPREAD_RADIUS = 0.5;
const PARTICLE_BASE_SIZE = 0.3;

const vecToArray = (vec: THREE.Vector3): [number, number, number] => {
  return [vec.x, vec.y, vec.z];
};

const arrayToVec = (arr?: [number, number, number]): THREE.Vector3 => {
  if (!arr) {
    console.error("Missing required config properties");
    return new THREE.Vector3();
  }
  return new THREE.Vector3(arr[0], arr[1], arr[2]);
};

export const createDustConfig = (
  startPosition: THREE.Vector3,
  size?: number,
  opacity?: number,
  duration?: number
): { [key: string]: PrimitiveOrArray } => {
  return {
    startPosition: vecToArray(startPosition),
    size: size || DEFAULT_SIZE,
    opacity: opacity || DEFAULT_OPACITY,
    duration: duration || DEFAULT_DURATION,
  };
};

const parseConfig = (config: { [key: string]: any }) => {
  return {
    startPosition: arrayToVec(config.startPosition as [number, number, number]),
    size: (config.size as number) || DEFAULT_SIZE,
    opacity: (config.opacity as number) || DEFAULT_OPACITY,
    duration: (config.duration as number) || DEFAULT_DURATION,
  };
};
// --- 기존 유틸리티 및 타입 정의 끝 ---

export interface DustProps {
  config: { [key: string]: PrimitiveOrArray };
  onComplete: () => void;
}

export const Dust: React.FC<DustProps> = ({ config, onComplete }) => {
  const { startPosition, size, opacity, duration } = parseConfig(config);
  const [active, setActive] = useState(true);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null!);
  const dummyRef = useRef(new THREE.Object3D()); // 각 인스턴스의 Matrix 업데이트용 더미 객체
  const startTime = useRef(Date.now());
  const effectScaleRef = useRef(0); // 전체 효과의 스케일 (퍼짐 정도) 제어

  // Effect cleanup function (변경 없음)
  const removeDust = useCallback(() => {
    if (active) {
      setActive(false);
      if (onComplete) onComplete();
    }
  }, [active]);

  // 각 인스턴스의 초기 상대 위치와 기본 스케일을 미리 계산 (useMemo로 한 번만 실행)
  const instanceData = useMemo(() => {
    const data = [];
    const basePosition = new THREE.Vector3(); // 임시 벡터 재사용

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // 구 형태의 랜덤 오프셋 생성 (바닥에 좀 더 깔리도록 y는 약간만)
      basePosition
        .set(
          (Math.random() - 0.5) * 2,
          Math.random() * 0.3, // Y 방향으로는 덜 퍼지게
          (Math.random() - 0.5) * 2
        )
        .normalize()
        .multiplyScalar(Math.random() * SPREAD_RADIUS);

      // 각 입자 크기에도 약간의 랜덤성 부여
      const scale = PARTICLE_BASE_SIZE * (0.6 + Math.random() * 0.8); // 60% ~ 140% 크기 변화

      data.push({
        positionOffset: basePosition.clone(), // 복제해서 저장
        baseScale: scale,
      });
    }
    return data;
  }, []); // 의존성 배열이 비어있으므로 컴포넌트 마운트 시 한 번만 실행

  // Effect 설정 및 제거 타이머 (useEffect)
  useEffect(() => {
    // 컴포넌트 마운트 또는 주요 config 변경 시 상태 초기화
    startTime.current = Date.now();
    effectScaleRef.current = 0;
    setActive(true);

    // InstancedMesh 초기화 (모든 인스턴스를 스케일 0으로 시작)
    if (instancedMeshRef.current) {
      instanceData.forEach((data, i) => {
        dummyRef.current.position.copy(data.positionOffset); // 초기 오프셋 적용
        dummyRef.current.scale.setScalar(0); // 스케일 0에서 시작
        dummyRef.current.updateMatrix();
        instancedMeshRef.current.setMatrixAt(i, dummyRef.current.matrix);
      });
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 제거 타이머 설정
    const timer = setTimeout(() => {
      removeDust();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
    // config 객체 전체를 의존성으로 넣으면 리렌더링 시마다 재실행될 수 있으므로 주의
    // 필요하다면 startPosition, duration 등 주요 값만 넣기
  }, [config, duration, removeDust, instanceData]);

  // 애니메이션 루프 (useFrame)
  useFrame(() => {
    if (!active || !instancedMeshRef.current) return;

    const elapsed = Date.now() - startTime.current;
    let currentEffectScale = 0;

    // 전체 효과의 크기/퍼짐 정도를 시간에 따라 계산 (기존 로직 활용)
    const growDuration = duration * 0.2;
    const shrinkDuration = duration * 0.8;

    if (elapsed < growDuration) {
      // Grow phase
      const growProgress = elapsed / growDuration;
      currentEffectScale = THREE.MathUtils.lerp(0, size, growProgress); // config의 size가 최대 크기/퍼짐 정도
    } else if (elapsed < duration) {
      // Shrink phase
      const shrinkProgress = (elapsed - growDuration) / shrinkDuration;
      currentEffectScale = THREE.MathUtils.lerp(size, 0, shrinkProgress);
    } else {
      currentEffectScale = 0; // 확실하게 0으로
    }
    effectScaleRef.current = currentEffectScale;

    // 각 인스턴스의 위치와 스케일 업데이트
    instanceData.forEach((data, i) => {
      // 1. 위치: 초기 오프셋에 현재 effectScale을 곱하여 퍼지거나 모이도록 함
      dummyRef.current.position
        .copy(data.positionOffset)
        .multiplyScalar(effectScaleRef.current);

      // 2. 스케일: 기본 스케일에 현재 effectScale을 곱함 (전체적으로 커졌다 작아지도록)
      dummyRef.current.scale.setScalar(data.baseScale * effectScaleRef.current);

      // (선택적) 약간의 추가 움직임: 위로 살짝 뜨거나 바깥으로 퍼지는 등
      // dummyRef.current.position.y += 0.001 * effectScaleRef.current;

      dummyRef.current.updateMatrix(); // 더미 객체의 매트릭스 업데이트
      instancedMeshRef.current.setMatrixAt(i, dummyRef.current.matrix); // 인스턴스 매트릭스 설정
    });

    // 매트릭스 업데이트 플래그 설정
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;

    // (선택적) 투명도 조절: 사라질 때 더 빠르게 투명해지도록
    const material = instancedMeshRef.current
      .material as THREE.MeshBasicMaterial;
    if (elapsed < growDuration) {
      material.opacity = THREE.MathUtils.lerp(
        0,
        opacity,
        elapsed / growDuration
      ); // 나타날 때 투명도 조절
    } else if (elapsed < duration) {
      const shrinkProgress = (elapsed - growDuration) / shrinkDuration;
      material.opacity = THREE.MathUtils.lerp(opacity, 0, shrinkProgress); // 사라질 때 투명도 조절
    } else {
      material.opacity = 0;
    }

    // 효과 종료 시간 체크
    if (elapsed >= duration && active) {
      // 종료 직전에 확실히 안 보이게 처리하고 제거
      if (instancedMeshRef.current) {
        instanceData.forEach((_, i) => {
          dummyRef.current.scale.setScalar(0);
          dummyRef.current.updateMatrix();
          instancedMeshRef.current.setMatrixAt(i, dummyRef.current.matrix);
        });
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
        (
          instancedMeshRef.current.material as THREE.MeshBasicMaterial
        ).opacity = 0;
      }
      removeDust();
    }
  });

  // active가 false면 렌더링 안 함
  if (!active) return null;

  // 필수 설정값 확인
  if (!startPosition || !size || !opacity || !duration) {
    console.error("[Dust] Missing required config properties");
    onComplete?.();
    return null;
  }

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[undefined, undefined, PARTICLE_COUNT]} // Geometry, Material은 자식으로 정의, Count 전달
      position={startPosition} // 전체 그룹의 위치 설정
    >
      {/* 작은 구체 지오메트리 사용 (폴리곤 수 줄임) */}
      <sphereGeometry args={[1, 6, 6]} />
      {/* 기존 머티리얼 설정 유지 (AdditiveBlending으로 밝은 효과) */}
      <meshBasicMaterial
        color="white"
        transparent={true} // transparent는 boolean 값으로 설정
        opacity={opacity} // 초기 투명도 (useFrame에서 동적으로 변경됨)
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
};
