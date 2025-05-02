import { useCallback, useEffect, useRef } from "react";
import { Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useProjectileKeyboardInput } from "./projectileKeyboardInput";
import { ControllerHandle } from "vibe-starter-3d";

interface CircularProjectileShooterProps {
  /** Player RigidBody reference for direction calculation */
  controllerRef?: React.RefObject<ControllerHandle>;
  /** Fire key action name (default: "action1") */
  fireAction?: string;
  /** Projectile size (diameter) */
  projectileSize?: number;
  /** Projectile speed */
  projectileSpeed?: number;
  /** Projectile lifetime in seconds */
  projectileLifetime?: number;
  /** Projectile color */
  projectileColor?: string;
  /** Max number of projectiles allowed */
  maxProjectiles?: number;
}

interface Projectile {
  id: number;
  position: Vector3;
  direction: Vector3;
  createdAt: number;
}

export function CircularProjectileShooter({
  controllerRef,
  fireAction = "circleBullet",
  projectileSize = 5,
  projectileSpeed = 10,
  projectileLifetime = 3,
  projectileColor = "#ff3e00",
  maxProjectiles = 10,
}: CircularProjectileShooterProps) {
  // Keep track of active projectiles
  const projectilesRef = useRef<Projectile[]>([]);
  const nextProjectileIdRef = useRef(0);
  const lastFireTimeRef = useRef(0);
  const fireCooldown = 0.2; // seconds between shots

  // useKeyboardProjectileTrigger의 내부 구현을 확인해 MutableRefObject 예외 처리
  const { subscribeTrigger } = useProjectileKeyboardInput({
    fireAction,
    // @ts-expect-error - CustomEcctrlRigidBody와 RigidBody 간의 타입 호환성 문제
    playerRigidBodyRef: controllerRef?.current?.rigidBodyRef.current,
  });

  // Handle firing projectiles
  const fireProjectile = useCallback(
    (direction: Vector3) => {
      const now = performance.now() / 1000;

      // Check cooldown
      if (now - lastFireTimeRef.current < fireCooldown) {
        return;
      }

      lastFireTimeRef.current = now;

      // Apply a small offset so projectile doesn't collide with player
      const playerPosition = new Vector3();
      const playerRigidBodyRef = controllerRef?.current?.rigidBodyRef;
      const position = playerRigidBodyRef.current.translation();
      playerPosition.set(position.x, position.y, position.z);

      // Offset the spawn point in the direction of fire
      const spawnOffset = direction.clone().multiplyScalar(2.0);
      const spawnPosition = playerPosition.clone().add(spawnOffset);

      // Create new projectile
      const newProjectile: Projectile = {
        id: nextProjectileIdRef.current++,
        position: spawnPosition,
        direction: direction.clone().normalize(),
        createdAt: now,
      };

      // Limit max projectiles by removing oldest if needed
      if (projectilesRef.current.length >= maxProjectiles) {
        projectilesRef.current.shift(); // Remove the oldest projectile
      }

      // Add new projectile
      projectilesRef.current.push(newProjectile);
    },
    [controllerRef, maxProjectiles]
  );

  // Subscribe to fire trigger
  useEffect(() => {
    const unsubscribe = subscribeTrigger(fireProjectile);
    return () => unsubscribe();
  }, [subscribeTrigger, fireProjectile]);

  // Update and cleanup projectiles
  useFrame((_, delta) => {
    const now = performance.now() / 1000;

    // Update projectile positions
    projectilesRef.current.forEach((projectile) => {
      projectile.position.addScaledVector(
        projectile.direction,
        projectileSpeed * delta
      );
    });

    // Remove expired projectiles
    projectilesRef.current = projectilesRef.current.filter(
      (projectile) => now - projectile.createdAt < projectileLifetime
    );
  });

  return (
    <>
      {projectilesRef.current.map((projectile) => (
        <RigidBody
          key={projectile.id}
          position={[
            projectile.position.x,
            projectile.position.y,
            projectile.position.z,
          ]}
          type="dynamic"
          colliders={false}
          gravityScale={0}
        >
          <mesh>
            <sphereGeometry args={[projectileSize / 2, 16, 16]} />
            <meshStandardMaterial
              color={projectileColor}
              emissive={projectileColor}
              emissiveIntensity={0.5}
            />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}
