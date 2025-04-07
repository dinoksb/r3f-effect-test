// Explosion.tsx
import * as THREE from "three";
import React, { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";

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

interface ExplosionProps {
  position: THREE.Vector3 | [number, number, number];
  scale?: number;
  onComplete?: () => void;
}

// 충돌 지점에서 나타나는 "폭발/연기" 이펙트
export const Explosion: React.FC<ExplosionProps> = ({
  position,
  scale = 1,
  onComplete,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  // 재사용할 dummy 객체
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // 폭발 파티클 배열 (색/속도만 다르게 2종류)
  const [particleGroups] = useState(() => [
    makeParticles("white", 0.1),
    makeParticles("grey", 0.1),
  ]);

  // 폭발/연기의 "전체 수명" (ms 단위)
  const totalDuration = 500;
  const startTime = useRef(performance.now());

  useFrame(() => {
    const elapsed = performance.now() - startTime.current;
    const fadeOut = elapsed / totalDuration; // 0 ~ 1

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
    if (elapsed > totalDuration) {
      onComplete?.();
    }
  });

  return (
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
  );
};
