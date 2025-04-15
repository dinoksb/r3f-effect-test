import * as THREE from "three";
import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useFrame } from "@react-three/fiber";

// --- Existing utility and type definitions (no changes) ---
type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

const DEFAULT_OPACITY = 1;
const DEFAULT_SIZE = 0.5;
const DEFAULT_DURATION = 500;
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

export interface DustProps {
  config: { [key: string]: PrimitiveOrArray };
  onComplete: () => void;
}

export const Dust: React.FC<DustProps> = ({ config, onComplete }) => {
  const { startPosition, size, opacity, duration } = parseConfig(config);
  const [active, setActive] = useState(true);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null!);
  const dummyRef = useRef(new THREE.Object3D());
  const startTime = useRef(Date.now());
  const effectScaleRef = useRef(0);
  const onCompleteRef = useRef(onComplete);

  const removeDust = useCallback(() => {
    if (active) {
      setActive(false);
      if (onCompleteRef.current) onCompleteRef.current();
    }
  }, [active]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const instanceData = useMemo(() => {
    const data = [];
    const basePosition = new THREE.Vector3(); // Temporary vector for reuse

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Creating random offset in sphere shape (with less spread in Y direction to keep particles closer to ground)
      basePosition
        .set(
          (Math.random() - 0.5) * 2,
          Math.random() * 0.3, // Less spread in Y direction
          (Math.random() - 0.5) * 2
        )
        .normalize()
        .multiplyScalar(Math.random() * SPREAD_RADIUS);

      // Add some randomness to each particle size
      const scale = PARTICLE_BASE_SIZE * (0.6 + Math.random() * 0.8); // 60% ~ 140% size variation

      data.push({
        positionOffset: basePosition.clone(), // Store a clone
        baseScale: scale,
      });
    }
    return data;
  }, []); // Empty dependency array ensures this runs only once when component mounts

  // Setup effect and removal timer (useEffect)
  useEffect(() => {
    // Initialize state when component mounts or when main config changes
    startTime.current = Date.now();
    effectScaleRef.current = 0;
    setActive(true);

    // Initialize InstancedMesh (start all instances with scale 0)
    if (instancedMeshRef.current) {
      instanceData.forEach((data, i) => {
        dummyRef.current.position.copy(data.positionOffset);
        dummyRef.current.scale.setScalar(0);
        dummyRef.current.updateMatrix();
        instancedMeshRef.current.setMatrixAt(i, dummyRef.current.matrix);
      });
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Set removal timer
    const timer = setTimeout(() => {
      removeDust();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
    // Be careful adding the entire config object as a dependency as it may cause re-execution on every render
    // If needed, only add key values like startPosition, duration, etc.
  }, [config, duration, removeDust, instanceData]);

  // Animation loop (useFrame)
  useFrame(() => {
    if (!active || !instancedMeshRef.current) return;

    const elapsed = Date.now() - startTime.current;
    let currentEffectScale = 0;

    // Calculate the size/spread of the entire effect based on time (using existing logic)
    const growDuration = duration * 0.2;
    const shrinkDuration = duration * 0.8;

    if (elapsed < growDuration) {
      // Grow phase
      const growProgress = elapsed / growDuration;
      currentEffectScale = THREE.MathUtils.lerp(0, size, growProgress); // config's size is the maximum size/spread
    } else if (elapsed < duration) {
      // Shrink phase
      const shrinkProgress = (elapsed - growDuration) / shrinkDuration;
      currentEffectScale = THREE.MathUtils.lerp(size, 0, shrinkProgress);
    } else {
      currentEffectScale = 0; // Definitely set to 0
    }
    effectScaleRef.current = currentEffectScale;

    // Update the position and scale of each instance
    instanceData.forEach((data, i) => {
      // 1. Position: Multiply initial offset by current effectScale to spread or gather
      dummyRef.current.position
        .copy(data.positionOffset)
        .multiplyScalar(effectScaleRef.current);

      // 2. Scale: Multiply base scale by current effectScale (to grow and shrink overall)
      dummyRef.current.scale.setScalar(data.baseScale * effectScaleRef.current);

      // (Optional) Add slight additional movement: float up or spread outward
      // dummyRef.current.position.y += 0.001 * effectScaleRef.current;

      dummyRef.current.updateMatrix(); // Update dummy object's matrix
      instancedMeshRef.current.setMatrixAt(i, dummyRef.current.matrix); // Set instance matrix
    });

    // Set matrix update flag
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;

    // (Optional) Adjust opacity: fade out faster when disappearing
    const material = instancedMeshRef.current
      .material as THREE.MeshBasicMaterial;
    if (elapsed < growDuration) {
      material.opacity = THREE.MathUtils.lerp(
        0,
        opacity,
        elapsed / growDuration
      ); // Adjust opacity when appearing
    } else if (elapsed < duration) {
      const shrinkProgress = (elapsed - growDuration) / shrinkDuration;
      material.opacity = THREE.MathUtils.lerp(opacity, 0, shrinkProgress); // Adjust opacity when disappearing
    } else {
      material.opacity = 0;
    }

    // Check effect end time
    if (elapsed >= duration && active) {
      // Make sure it's invisible before removal
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

  // Don't render if active is false
  if (!active) return null;

  // Check required configuration values
  if (!startPosition || !size || !opacity || !duration) {
    console.error("[Dust] Missing required config properties");
    onComplete?.();
    return null;
  }

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[undefined, undefined, PARTICLE_COUNT]}
      position={startPosition}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color="white"
        transparent={true}
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
};
