import React, {
  useRef,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Tube, Ring } from "@react-three/drei";
import { RigidBody, BallCollider, RapierRigidBody } from "@react-three/rapier";
import { Collider } from "@dimforge/rapier3d-compat";

/**
 * Creates jagged points for a lightning path between two points
 */
const createLightningPath = (
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments = 12,
  jitter = 1.0
): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  const direction = end.clone().sub(start);
  const length = direction.length();
  direction.normalize();

  points.push(start.clone());

  for (let i = 1; i < segments; i++) {
    const segmentProgress = i / segments;
    const currentPos = start
      .clone()
      .add(direction.clone().multiplyScalar(length * segmentProgress));
    const randomJitterScale = jitter * (0.5 + Math.random() * 0.8);
    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * randomJitterScale,
      (Math.random() - 0.5) * randomJitterScale,
      (Math.random() - 0.5) * randomJitterScale
    );
    const perpendicularOffset = new THREE.Vector3()
      .crossVectors(direction, randomOffset)
      .normalize()
      .multiplyScalar(randomJitterScale * Math.random());
    currentPos.add(perpendicularOffset);
    points.push(currentPos);
  }

  points.push(end.clone());
  return points;
};

/**
 * Props for a single lightning bolt segment
 */
interface LightningSegmentProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  duration: number;
  startTime: number;
}

/**
 * Renders a single lightning bolt segment with branches
 */
const LightningSegment: React.FC<LightningSegmentProps> = ({
  start,
  end,
  duration,
  startTime,
}) => {
  const tubeRef = useRef<THREE.Mesh>();
  const lightRef = useRef<THREE.PointLight>();
  const branchesRef = useRef<THREE.Mesh[]>([]);

  // Create main path curve
  const pathCurve = useMemo(() => {
    const points = createLightningPath(start, end);
    return new THREE.CatmullRomCurve3(points);
  }, [start, end]);

  // Generate branching paths
  const branchCurves = useMemo(() => {
    const numBranches = Math.floor(Math.random() * 3) + 1;
    const curves: THREE.CatmullRomCurve3[] = [];
    const mainPoints = pathCurve.getPoints(20);

    for (let i = 0; i < numBranches; i++) {
      // Pick a random point along the main path (20-80% along)
      const branchStartIndex =
        Math.floor(Math.random() * (mainPoints.length * 0.6)) +
        Math.floor(mainPoints.length * 0.2);
      const branchStartPoint = mainPoints[branchStartIndex];

      // Create a random direction outward
      const branchDirection = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      const branchLength = 1 + Math.random() * 2;
      const branchEndPoint = branchStartPoint
        .clone()
        .add(branchDirection.multiplyScalar(branchLength));

      // Create a short branch path with less jitter
      const branchPoints = createLightningPath(
        branchStartPoint,
        branchEndPoint,
        5,
        0.5
      );
      curves.push(new THREE.CatmullRomCurve3(branchPoints));
    }
    return curves;
  }, [pathCurve]);

  // Update lightning visuals each frame
  useFrame(() => {
    const elapsedTime = Date.now() - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    const mainTube = tubeRef.current;
    const pointLight = lightRef.current;

    if (!mainTube || !pointLight) return;

    // Create flicker effect (occasionally near-zero for sharp flicker)
    const flicker = Math.random() > 0.3 ? Math.random() * 0.5 + 0.8 : 0.0;
    const opacity = Math.pow(1 - progress, 1.5) * flicker;

    // Update main tube
    const mainMaterial = mainTube.material as THREE.MeshBasicMaterial;
    mainMaterial.opacity = opacity;
    mainMaterial.needsUpdate = true;

    // Sync light with flicker
    pointLight.intensity = opacity * 30;

    // Update all branch tubes
    branchesRef.current.forEach((branch) => {
      if (branch) {
        const branchMaterial = branch.material as THREE.MeshBasicMaterial;
        branchMaterial.opacity = opacity * 0.6; // Branches slightly dimmer
        branchMaterial.needsUpdate = true;
      }
    });
  });

  return (
    <>
      {/* Main lightning bolt */}
      <Tube ref={tubeRef} args={[pathCurve, 20, 0.02, 3, false]}>
        <meshBasicMaterial
          color="#e0faff"
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Tube>

      {/* Lightning branches */}
      {branchCurves.map((curve, index) => (
        <Tube
          key={index}
          ref={(el) => {
            if (el) branchesRef.current[index] = el;
          }}
          args={[curve, 10, 0.01, 2, false]}
        >
          <meshBasicMaterial
            color="#e0faff"
            transparent
            opacity={1}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </Tube>
      ))}

      {/* Light at the end of the bolt */}
      <pointLight
        ref={lightRef}
        position={end}
        color="#ffffff"
        intensity={30}
        distance={12}
        decay={2.5}
      />
    </>
  );
};

/**
 * Props for the impact effect
 */
interface ImpactEffectProps {
  position: THREE.Vector3;
  radius?: number;
}

/**
 * Creates a ring effect at the impact point
 */
const ImpactEffect: React.FC<ImpactEffectProps> = ({
  position,
  radius = 3,
}) => {
  const ringRef = useRef<THREE.Mesh>();
  const startTime = useRef(Date.now());
  const duration = 400; // milliseconds

  useFrame(() => {
    if (!ringRef.current) return;

    const elapsedTime = Date.now() - startTime.current;
    const progress = Math.min(elapsedTime / duration, 1);

    // Calculate current ring size
    const currentRadius = progress * radius;

    // Fade out as it expands
    const opacity = Math.pow(1 - progress, 2);

    // Update material
    const material = ringRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = opacity;
    material.needsUpdate = true;

    // Update geometry (expand the ring)
    ringRef.current.geometry = new THREE.RingGeometry(
      currentRadius * 0.8,
      currentRadius,
      32
    );
  });

  return (
    <Ring
      ref={ringRef}
      args={[0, 0.1, 32]}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]} // Lie flat on XZ plane
    >
      <meshBasicMaterial
        color="#ffffff"
        opacity={1}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Ring>
  );
};

/**
 * Props for the collision sphere
 */
interface CollisionSphereProps {
  position: THREE.Vector3;
  radius: number;
  duration: number;
  onHit?: (
    position: THREE.Vector3,
    rigidBody?: RapierRigidBody,
    collider?: Collider
  ) => void;
  onComplete?: () => void;
  debug?: boolean;
}

/**
 * A sphere collider that detects collisions and triggers callbacks
 */
const CollisionSphere: React.FC<CollisionSphereProps> = ({
  position,
  radius,
  duration,
  onHit,
  onComplete,
  debug = false,
}) => {
  // Refs & state
  const startTime = useRef(Date.now());
  const [active, setActive] = useState(true);
  const [hasCollided, setHasCollided] = useState(false);
  const debugMeshRef = useRef<THREE.Mesh>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Handle collision detection
  const handleCollision = useCallback(
    (other) => {
      // Skip if invalid or already collided
      if (!other?.colliderObject || hasCollided) return;

      // Mark as collided but stay active
      setHasCollided(true);

      // Call hit callback with collision info
      if (onHit) {
        onHit(position.clone(), other.rigidBodyObject, other.colliderObject);
      }
    },
    [onHit, position, hasCollided]
  );

  // Cleanup function
  const cleanup = useCallback(() => {
    setActive(false);

    // Trigger completion callback after a short delay
    setTimeout(() => {
      onCompleteRef.current?.();
    }, 100);
  }, []);

  // Animation and lifetime management
  useFrame(() => {
    if (!active) return;

    const elapsed = Date.now() - startTime.current;
    const progress = Math.min(elapsed / duration, 1);

    // Animate debug visual if enabled
    if (debug && debugMeshRef.current) {
      const pulseScale = 0.8 + 0.2 * Math.sin(Date.now() * 0.01);
      debugMeshRef.current.scale.setScalar(pulseScale);
    }

    // End effect when duration is complete
    if (progress >= 1) {
      cleanup();
    }
  });

  // Don't render if not active
  if (!active) return null;

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={[position.x, position.y, position.z]}
      sensor
      onIntersectionEnter={handleCollision}
    >
      <BallCollider args={[radius]} />

      {/* Debug visualization */}
      {debug && (
        <mesh ref={debugMeshRef}>
          <sphereGeometry args={[radius, 16, 16]} />
          <meshBasicMaterial
            color={hasCollided ? "#ff0000" : "#ff00ff"}
            transparent
            opacity={0.3}
            wireframe={true}
          />
        </mesh>
      )}
    </RigidBody>
  );
};

/**
 * Props for the lightning strike effect
 */
export interface LightningStrikeProps {
  commonStartPosition: THREE.Vector3;
  targetPositions: THREE.Vector3[];
  duration: number;
  onHit?: (
    position: THREE.Vector3,
    rigidBody?: RapierRigidBody,
    collider?: Collider
  ) => void;
  onComplete?: () => void;
  debug?: boolean;
}

/**
 * Creates a lightning strike effect with multiple bolts and collision detection
 */
export const LightningStrike: React.FC<LightningStrikeProps> = ({
  commonStartPosition,
  targetPositions,
  duration,
  onHit,
  onComplete,
  debug = false,
}) => {
  // Constants
  const FLASH_DURATION = 50;
  const EFFECT_RADIUS = 3;

  // Refs
  const startTime = useRef(Date.now());
  const flashLightRef = useRef<THREE.SpotLight>(null);

  // Calculate the center position of all target points
  const centerPosition = useMemo(() => {
    if (targetPositions.length === 0) {
      return new THREE.Vector3(0, 0, 0);
    }

    // Average all target positions
    return targetPositions
      .reduce((acc, pos) => acc.add(pos), new THREE.Vector3(0, 0, 0))
      .divideScalar(targetPositions.length);
  }, [targetPositions]);

  // Collision handler
  const handleHit = useCallback(
    (
      position: THREE.Vector3,
      rigidBody?: RapierRigidBody,
      collider?: Collider
    ) => {
      onHit?.(position, rigidBody, collider);
    },
    [onHit]
  );

  // Flash effect animation
  useFrame(() => {
    if (!flashLightRef.current) return;

    const elapsed = Date.now() - startTime.current;

    // Only animate during flash duration
    if (elapsed < FLASH_DURATION) {
      const progress = elapsed / FLASH_DURATION;
      flashLightRef.current.intensity = (1 - progress) * 50;
      flashLightRef.current.angle = (Math.PI / 3) * (1 + progress);
    } else if (flashLightRef.current.intensity > 0) {
      flashLightRef.current.intensity = 0;
    }
  });

  // Empty array check
  if (targetPositions.length === 0) return null;

  return (
    <>
      {/* Initial flash light effect */}
      <spotLight
        ref={flashLightRef}
        position={commonStartPosition}
        angle={Math.PI / 3}
        penumbra={0.5}
        intensity={0}
        distance={50}
        decay={2}
        color="#ffffff"
        target-position={centerPosition}
      />

      {/* Collision detection at center point */}
      <CollisionSphere
        position={centerPosition}
        radius={EFFECT_RADIUS}
        duration={duration}
        onHit={handleHit}
        onComplete={onComplete}
        debug={debug}
      />

      {/* Lightning bolts and impact effects */}
      {targetPositions.map((targetPos, index) => (
        <React.Fragment key={`lightning-${index}`}>
          {/* The lightning bolt itself */}
          <LightningSegment
            start={commonStartPosition}
            end={targetPos}
            duration={duration * (0.5 + Math.random() * 0.5)}
            startTime={startTime.current + index * 50}
          />

          {/* Impact effect at target point */}
          <ImpactEffect position={targetPos} radius={EFFECT_RADIUS} />
        </React.Fragment>
      ))}
    </>
  );
};
