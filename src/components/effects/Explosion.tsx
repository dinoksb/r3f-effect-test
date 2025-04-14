import * as THREE from "three";
import React, { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

const DEFAULT_SCALE = 1;

interface ExplosionProps {
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

export const createExplosionEffectConfig = (
  position: THREE.Vector3,
  scale?: number
): { [key: string]: PrimitiveOrArray } => {
  return {
    position: vecToArray(position),
    scale: scale || DEFAULT_SCALE,
  };
};

const parseConfig = (config: { [key: string]: any }) => {
  return {
    position: arrayToVec(config.position as [number, number, number]),
    scale: (config.scale as number) || DEFAULT_SCALE,
  };
};

function makeParticles(color: string, speed: number) {
  // data: [position Vector3, movement direction Vector3]
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

// "Explosion/smoke" effect appearing at the collision point
export const Explosion: React.FC<ExplosionProps> = ({ config, onComplete }) => {
  const groupRef = useRef<THREE.Group>(null);
  // Reusable dummy object
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Explosion particle array (2 types with different color/speed)
  const [particleGroups] = useState(() => [
    makeParticles("white", 0.1),
    makeParticles("grey", 0.1),
  ]);

  // "Total lifespan" of the explosion/smoke (in ms)
  const totalDuration = 500;
  const startTime = useRef(performance.now());
  const { position, scale } = parseConfig(config);

  useFrame(() => {
    const elapsed = performance.now() - startTime.current;
    const fadeOut = elapsed / totalDuration; // 0 ~ 1

    // Iterate particle groups
    particleGroups.forEach((pg, groupIndex) => {
      // instancedMesh reference
      const mesh = groupRef.current?.children[
        groupIndex
      ] as THREE.InstancedMesh;
      if (!mesh) return;

      // Move individual particles
      pg.data.forEach(([pos, dir], i) => {
        // Continuously adding dir results in spreading out
        pos.add(dir);
        dummy.position.copy(pos);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });

      // Reduce material opacity
      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.opacity = Math.max(1 - fadeOut, 0);
      }

      mesh.instanceMatrix.needsUpdate = true;
    });

    if (!position || !scale) {
      console.error("[Explosion] Missing required config properties");
      onComplete?.();
      return null;
    }

    // Trigger removal from parent when lifespan ends
    if (elapsed > totalDuration) {
      onComplete?.();
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {particleGroups.map((pg, index) => (
        <instancedMesh
          key={index}
          args={[undefined, undefined, pg.data.length]}
          frustumCulled={false} // Display even if outside camera frustum
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            color={pg.color}
            transparent
            opacity={1}
            depthWrite={false} // Make it look like smoke
          />
        </instancedMesh>
      ))}
    </group>
  );
};
