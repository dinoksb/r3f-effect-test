// Explosion.tsx
import * as THREE from "three";
import React, { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

const DEFAULT_SCALE = 1;
const DEFAULT_DURATION = 500;
const DEFAULT_SPREAD_STRENGTH = 0.1;

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

export const createExplosionWithImpactConfig = (
  position: THREE.Vector3,
  duration?: number,
  scale?: number,
  spreadStrength?: number
): { [key: string]: PrimitiveOrArray } => {
  return {
    position: vecToArray(position),
    duration: duration || DEFAULT_DURATION,
    scale: scale || DEFAULT_SCALE,
    spreadStrength: spreadStrength || DEFAULT_SPREAD_STRENGTH,
  };
};

const parseConfig = (config: { [key: string]: PrimitiveOrArray }) => {
  return {
    position: arrayToVec(config.position as [number, number, number]),
    duration: (config.duration as number) || DEFAULT_DURATION,
    scale: (config.scale as number) || DEFAULT_SCALE,
    spreadStrength:
      (config.spreadStrength as number) || DEFAULT_SPREAD_STRENGTH,
  };
};

interface ShockwaveExplosionProps {
  config: { [key: string]: PrimitiveOrArray };
  onComplete?: () => void;
}

function makeParticles(color: string, speed: number) {
  // data: [위치 Vector3, 이동 방향 Vector3]
  const data = new Array(20).fill(null).map(() => {
    const position = new THREE.Vector3();
    const direction = new THREE.Vector3(
      -1 + Math.random() * 2,
      -1 + Math.random() * 2,
      -1 + Math.random() * 2
    )
      .normalize()
      .multiplyScalar(speed);
    return [position, direction] as [THREE.Vector3, THREE.Vector3];
  });

  return { color, data };
}

// 충돌 지점에서 나타나는 "폭발/연기" 이펙트
export const ShockwaveExplosion: React.FC<ShockwaveExplosionProps> = ({
  config,
  onComplete,
}) => {
  const { position, duration, scale, spreadStrength } = parseConfig(config);

  const groupRef = useRef<THREE.Group>(null);
  // 재사용할 dummy 객체
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // 폭발 파티클 배열 (색/속도만 다르게 2종류)
  const [particleGroups] = useState(() => [
    makeParticles("white", spreadStrength),
    makeParticles("grey", spreadStrength * 0.8), // 회색 파티클은 약간 느리게
  ]);

  // 폭발/연기의 "전체 수명" (ms 단위)
  const startTime = useRef(performance.now());

  useFrame(() => {
    const elapsed = performance.now() - startTime.current;
    const fadeOut = elapsed / duration; // 0 ~ 1

    // 파티클 그룹 반복
    particleGroups.forEach((pg, groupIndex) => {
      // instancedMesh 참조
      const mesh = groupRef.current?.children[
        groupIndex
      ] as THREE.InstancedMesh;
      if (!mesh) return;

      // 파티클 개별 이동
      pg.data.forEach(([pos, dir], i) => {
        // dir을 계속 더하면 퍼져나가는 형태
        pos.add(dir);
        dummy.position.copy(pos);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });

      // material 투명도 감소
      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.opacity = Math.max(1 - fadeOut, 0);
      }

      mesh.instanceMatrix.needsUpdate = true;
    });

    // 수명이 다하면 상위에서 제거되도록
    if (elapsed > duration) {
      onComplete?.();
    }
  });

  return (
    <>
      <ImpactEffect
        position={position}
        radius={scale * 2}
        duration={duration}
      />
      <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
        {particleGroups.map((pg, index) => (
          <instancedMesh
            key={index}
            args={[undefined, undefined, pg.data.length]}
            frustumCulled={false} // 카메라 절두체 밖이어도 표시
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshBasicMaterial
              color={pg.color}
              transparent
              opacity={1}
              depthWrite={false} // 연기처럼 보이게
            />
          </instancedMesh>
        ))}
      </group>
    </>
  );
};

interface ImpactEffectProps {
  position: THREE.Vector3;
  radius?: number;
  duration?: number;
}

const ImpactEffect: React.FC<ImpactEffectProps> = ({
  position,
  radius,
  duration,
}) => {
  const sphereRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const startTimeRef = useRef(performance.now());

  useFrame(() => {
    const elapsed = performance.now() - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);

    if (sphereRef.current) {
      const scale = progress * radius;
      sphereRef.current.scale.set(scale, scale, scale);

      const opacity = Math.pow(1 - progress, 2);
      const mat = sphereRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
      mat.needsUpdate = true;
    }

    if (lightRef.current) {
      lightRef.current.intensity = 10 * (1 - progress);
    }
  });

  return (
    <>
      <Sphere ref={sphereRef} args={[radius, 16, 16]} position={position}>
        <meshBasicMaterial
          color="#ff4400"
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
    </>
  );
};
