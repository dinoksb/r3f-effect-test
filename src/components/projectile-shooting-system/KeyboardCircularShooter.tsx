import { useRef, useState, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { Mesh, Vector3 } from "three";
import { useProjectileKeyboardInput } from "./projectileKeyboardInput";
import { ControllerHandle } from "vibe-starter-3d";

type ProjectileProps = {
  position: [number, number, number];
  direction: Vector3;
  speed: number;
  size: number;
  color: string;
  lifetime: number;
  onExpire: () => void;
};

function Projectile({
  position,
  direction,
  speed,
  size,
  color,
  lifetime,
  onExpire,
}: ProjectileProps) {
  const rigidBodyRef = useRef<React.ComponentRef<typeof RigidBody>>(null);
  const meshRef = useRef<Mesh>(null);
  const startTime = useRef(Date.now());

  useFrame(() => {
    // Check if lifetime exceeded
    if (Date.now() - startTime.current > lifetime * 1000) {
      onExpire();
      return;
    }

    // Apply continuous impulse if needed
    if (rigidBodyRef.current) {
      const impulse = direction.clone().multiplyScalar(speed * 0.01);
      rigidBodyRef.current.applyImpulse(
        { x: impulse.x, y: impulse.y, z: impulse.z },
        true
      );
    }
  });

  useEffect(() => {
    // Apply initial impulse
    if (rigidBodyRef.current) {
      const impulse = direction.clone().multiplyScalar(speed);
      rigidBodyRef.current.applyImpulse(
        { x: impulse.x, y: impulse.y, z: impulse.z },
        true
      );
    }
  }, []);

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      colliders="ball"
      restitution={0.7}
      friction={0.5}
      userData={{ type: "projectile", speed, direction }}
    >
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  );
}

type KeyboardCircularShooterProps = {
  /** Controller reference for getting camera direction */
  controllerRef?: React.RefObject<ControllerHandle>;
  /** Keyboard action name for firing */
  fireAction?: string;
  /** Time in ms between shots */
  cooldown?: number;
  /** Projectile color */
  projectileColor?: string;
  /** Projectile size (radius) */
  projectileSize?: number;
  /** Projectile speed */
  projectileSpeed?: number;
  /** Projectile lifetime in seconds */
  projectileLifetime?: number;
  /** Maximum number of projectiles */
  maxProjectiles?: number;
};

export function KeyboardCircularShooter({
  controllerRef,
  fireAction = "action1",
  cooldown = 200,
  projectileColor = "#FF4400",
  projectileSize = 0.5,
  projectileSpeed = 20,
  projectileLifetime = 3,
  maxProjectiles = 30,
}: KeyboardCircularShooterProps) {
  const [projectiles, setProjectiles] = useState<
    Array<{
      id: number;
      position: [number, number, number];
      direction: Vector3;
    }>
  >([]);
  const lastFireTime = useRef(0);
  const projectileIdCounter = useRef(0);

  // Setup keyboard trigger
  const { subscribeTrigger, getFireDirection } = useProjectileKeyboardInput({
    fireAction,
    // @ts-expect-error - CustomEcctrlRigidBody와 RigidBody 간의 타입 호환성 문제
    playerRigidBodyRef: controllerRef?.current?.rigidBodyRef,
  });

  // Fire projectile handler
  const fireProjectile = useCallback(() => {
    const now = Date.now();
    if (now - lastFireTime.current < cooldown) return;
    lastFireTime.current = now;

    // Enforce projectile limit
    if (projectiles.length >= maxProjectiles) return;

    // Get player position for starting point
    const playerPosition =
      controllerRef?.current?.rigidBodyRef?.current?.translation() || {
        x: 0,
        y: 1,
        z: 0,
      };

    // Explicitly get current direction using getFireDirection
    const direction = getFireDirection();

    // Create start position for projectile
    const startPosition: [number, number, number] = [
      playerPosition.x,
      playerPosition.y + 1, // Shoot from slightly above player
      playerPosition.z,
    ];

    // Offset position in direction of firing
    const spawnOffset = direction.clone().multiplyScalar(1.5);
    startPosition[0] += spawnOffset.x;
    startPosition[1] += spawnOffset.y;
    startPosition[2] += spawnOffset.z;

    // Add new projectile
    const newProjectile = {
      id: projectileIdCounter.current++,
      position: startPosition,
      direction: direction.clone(),
    };

    setProjectiles((prev) => [...prev, newProjectile]);
  }, [
    cooldown,
    maxProjectiles,
    projectiles.length,
    controllerRef,
    getFireDirection,
  ]);

  // Subscribe to keyboard fire trigger - now we just need the trigger event, not the direction
  useEffect(() => {
    const unsubscribe = subscribeTrigger(() => fireProjectile());
    return () => unsubscribe();
  }, [subscribeTrigger, fireProjectile]);

  // Projectile cleanup handler
  const handleProjectileExpire = useCallback((id: number) => {
    setProjectiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <>
      {projectiles.map((projectile) => (
        <Projectile
          key={projectile.id}
          position={projectile.position}
          direction={projectile.direction}
          speed={projectileSpeed}
          size={projectileSize}
          color={projectileColor}
          lifetime={projectileLifetime}
          onExpire={() => handleProjectileExpire(projectile.id)}
        />
      ))}
    </>
  );
}
