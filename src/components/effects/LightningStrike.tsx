import React, { useRef, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Tube, Ring } from "@react-three/drei";
import { RigidBody, BallCollider } from "@react-three/rapier";
import { HitCallback } from "../../types/magic";

interface LightningStrikeProps {
  commonStartPosition: THREE.Vector3; // Receive the fixed start position
  targetPositions: THREE.Vector3[];
  onHit: HitCallback;
  debug: boolean;
}

// Function to generate jagged points for the lightning bolt
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

// Component for a single lightning bolt segment
interface LightningSegmentProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  duration: number;
  startTime: number;
}

const LightningSegment: React.FC<LightningSegmentProps> = ({
  start,
  end,
  duration,
  startTime,
}) => {
  const tubeRef = useRef<THREE.Mesh>();
  const lightRef = useRef<THREE.PointLight>();
  const branchesRef = useRef<THREE.Mesh[]>([]); // Ref array for branches

  const pathCurve = useMemo(() => {
    const points = createLightningPath(start, end);
    return new THREE.CatmullRomCurve3(points);
  }, [start, end]);

  // Generate branch paths (memoized)
  const branchCurves = useMemo(() => {
    const numBranches = Math.floor(Math.random() * 3) + 1; // 1 to 3 branches
    const curves: THREE.CatmullRomCurve3[] = [];
    const mainPoints = pathCurve.getPoints(20); // Get points along the main curve

    for (let i = 0; i < numBranches; i++) {
      // Pick a random start point along the main path (not too close to start/end)
      const branchStartIndex =
        Math.floor(Math.random() * (mainPoints.length * 0.6)) +
        Math.floor(mainPoints.length * 0.2);
      const branchStartPoint = mainPoints[branchStartIndex];

      // Create a random end point near the start point, generally moving outwards
      const branchDirection = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      const branchLength = 1 + Math.random() * 2; // Shorter length for branches
      const branchEndPoint = branchStartPoint
        .clone()
        .add(branchDirection.multiplyScalar(branchLength));

      // Create a short path for the branch
      const branchPoints = createLightningPath(
        branchStartPoint,
        branchEndPoint,
        5,
        0.5
      ); // Fewer segments, less jitter
      curves.push(new THREE.CatmullRomCurve3(branchPoints));
    }
    return curves;
  }, [pathCurve]);

  useFrame(() => {
    const elapsedTime = Date.now() - startTime;
    const progress = Math.min(elapsedTime / duration, 1);

    const mainTube = tubeRef.current;
    const pointLight = lightRef.current;

    if (mainTube && pointLight) {
      // More intense and faster flicker
      const flicker = Math.random() > 0.3 ? Math.random() * 0.5 + 0.8 : 0.0; // Flicker between bright and near-zero
      const opacity = Math.pow(1 - progress, 1.5) * flicker; // Slightly slower fade but sharper cutoff via flicker

      // Update main tube
      (mainTube.material as THREE.MeshBasicMaterial).opacity = opacity;
      (mainTube.material as THREE.MeshBasicMaterial).needsUpdate = true;

      // Sync light intensity with flicker and make it brighter
      pointLight.intensity = opacity * 30;

      // Update branches
      branchesRef.current.forEach((branchTube) => {
        if (branchTube) {
          (branchTube.material as THREE.MeshBasicMaterial).opacity =
            opacity * 0.6; // Branches slightly dimmer
          (branchTube.material as THREE.MeshBasicMaterial).needsUpdate = true;
        }
      });
    }
  });

  return (
    <>
      {/* Main lightning bolt */}
      <Tube ref={tubeRef} args={[pathCurve, 20, 0.02, 3, false]}>
        <meshBasicMaterial
          color="#e0faff" // Slightly blueish white
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Tube>
      {/* Branches */}
      {branchCurves.map((curve, index) => (
        <Tube
          key={index}
          ref={(el) => (branchesRef.current[index] = el!)} // Assign ref to array
          args={[curve, 10, 0.01, 2, false]} // Thinner tube, fewer segments for branches
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
      {/* Light at the end of the main bolt */}
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

// --- Impact Effect Logic Inlined ---
interface SingleImpactEffectProps {
  position: THREE.Vector3;
  radius?: number; // Make radius configurable
}

const SingleImpactEffect: React.FC<SingleImpactEffectProps> = ({
  position,
  radius = 3, // Default value
}) => {
  const ringRef = useRef<THREE.Mesh>();
  const startTime = useRef(Date.now());
  const duration = 400; // milliseconds
  const maxRadius = radius; // Use the passed radius instead of hardcoded value

  useFrame(() => {
    const elapsedTime = Date.now() - startTime.current;
    const progress = Math.min(elapsedTime / duration, 1);

    if (ringRef.current) {
      const currentRadius = progress * maxRadius;
      // Fade out
      const opacity = Math.pow(1 - progress, 2);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
      (ringRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;

      // Update geometry (less efficient but works for Ring)
      ringRef.current.geometry = new THREE.RingGeometry(
        currentRadius * 0.8,
        currentRadius,
        32
      );
    }

    if (progress >= 1) {
      // Effect simply fades out, no explicit cleanup needed here as parent controls mounting
    }
  });

  return (
    // Rotate the ring to lie flat on the ground (XZ plane) and use the received position directly
    <Ring
      ref={ringRef}
      args={[0, 0.1, 32]}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <meshBasicMaterial
        color="#ffffff"
        opacity={1}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false} // Keep depthWrite false to avoid Z-fighting issues
        blending={THREE.AdditiveBlending}
      />
    </Ring>
  );
};
// --- End of Inlined Impact Effect ---

// Hitbox component for collision detection
interface HitboxProps {
  position: THREE.Vector3;
  duration: number;
  onHit?: (other?: unknown, pos?: THREE.Vector3) => void;
  debug?: boolean;
  radius: number; // Required radius parameter
}

const Hitbox: React.FC<HitboxProps> = ({
  position,
  duration,
  onHit,
  debug = false,
  radius,
}) => {
  const startTime = useRef(Date.now());
  const [destroyed, setDestroyed] = useState(false);
  const rigidRef = useRef(null);

  useFrame(() => {
    if (destroyed) return;

    const elapsedTime = Date.now() - startTime.current;
    const progress = Math.min(elapsedTime / duration, 1);

    // Remove the hitbox when the duration is over
    if (progress >= 1) {
      setDestroyed(true);
    }
  });

  if (destroyed) return null;

  return (
    <RigidBody
      ref={rigidRef}
      type="fixed"
      colliders={false}
      sensor={true}
      position={[position.x, position.y, position.z]}
      onIntersectionEnter={(other) => {
        const hitPosition = new THREE.Vector3(
          position.x,
          position.y,
          position.z
        );
        onHit?.(other, hitPosition);
      }}
    >
      <BallCollider args={[radius]} />

      {/* Debug visualization - only visible when debug is true */}
      {debug && (
        <mesh>
          <sphereGeometry args={[radius, 16, 16]} />
          <meshBasicMaterial
            color="#ff00ff"
            transparent
            opacity={0.3}
            wireframe={true}
          />
        </mesh>
      )}
    </RigidBody>
  );
};

export const LightningStrike: React.FC<LightningStrikeProps> = ({
  commonStartPosition,
  targetPositions,
  onHit,
  debug = false,
}) => {
  const startTime = useRef(Date.now());
  const duration = 600; // Overall duration for the multi-strike effect
  const flashLightRef = useRef<THREE.SpotLight>(); // Keep flash light logic
  const flashDuration = 50;

  // Define the effect radius to be shared by both impact effect and hitbox
  const effectRadius = 3;

  // Calculate center position of all targets
  const centerPosition = useMemo(() => {
    if (targetPositions.length === 0) return new THREE.Vector3(0, 0, 0);
    return targetPositions
      .reduce((acc, pos) => acc.clone().add(pos), new THREE.Vector3(0, 0, 0))
      .divideScalar(targetPositions.length);
  }, [targetPositions]);

  useFrame(() => {
    const elapsedTime = Date.now() - startTime.current;
    // Handle initial flash
    if (flashLightRef.current) {
      if (elapsedTime < flashDuration) {
        const flashProgress = elapsedTime / flashDuration;
        flashLightRef.current.intensity = (1 - flashProgress) * 50; // Intense flash fading out quickly
        flashLightRef.current.angle = (Math.PI / 3) * (1 + flashProgress); // Widen angle slightly during flash
      } else {
        flashLightRef.current.intensity = 0; // Turn off flash
      }
    }
  });

  return (
    <>
      {/* Initial Strobe Flash Light */}
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

      {/* Hitbox at the center of all targets */}
      {targetPositions.length > 0 && (
        <Hitbox
          position={centerPosition}
          duration={duration}
          onHit={onHit}
          debug={debug}
          radius={effectRadius}
        />
      )}

      {targetPositions.map((targetPos, index) => (
        <React.Fragment key={index}>
          <LightningSegment
            start={commonStartPosition}
            end={targetPos}
            duration={duration * (0.5 + Math.random() * 0.5)} // Randomize duration slightly
            startTime={startTime.current + index * 50} // Stagger start times
          />
          {/* Render the inlined impact effect component with the same radius */}
          <SingleImpactEffect position={targetPos} radius={effectRadius} />
        </React.Fragment>
      ))}
    </>
  );
};
