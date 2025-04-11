import { Sphere } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ExplosionDust } from "./ExplosionDust";
import { EffectType } from "../../types/effect";

export interface ExplosionEffectProps {
  type: EffectType.Explosion;
  position: THREE.Vector3;
  duration?: number;
  radius?: number;
  onComplete?: () => void;
}

export const Explosion: React.FC<ExplosionEffectProps> = ({
  position,
  duration = 600,
  radius = 1,
  onComplete,
}) => {
  const sphereRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const startTime = useRef(performance.now());
  const dustScale = useMemo(() => radius * 0.2, [radius]);
  const dustSpreadStrength = useMemo(() => 0.15, []);

  useFrame(() => {
    const elapsed = performance.now() - startTime.current;
    const progress = Math.min(elapsed / duration, 1); // 0 ~ 1

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

    // 수명이 다하면 상위에서 제거되도록
    if (elapsed > duration) {
      console.log("Explosion complete");
      onComplete?.();
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
      <ExplosionDust
        position={position}
        scale={dustScale}
        duration={duration}
        spreadStrength={dustSpreadStrength}
      />
    </>
  );
};
