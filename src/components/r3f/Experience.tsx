import { useRef, useState, useEffect, useCallback } from "react";
import { Physics } from "@react-three/rapier";
import { Environment, Grid, KeyboardControls } from "@react-three/drei";
import { CharacterState } from "../../constants/character";
import { keyboardMap } from "../../constants/controls";
import { Player, PlayerRef } from "./Player";
import { Floor } from "./Floor";
import { RandomBoxes } from "./RandomBoxes";
import * as THREE from "three";
import { ControllerHandle, FreeViewController } from "vibe-starter-3d";
import { EffectFactory, EffectProps } from "../../factories/EffectFactory";
import { EffectType } from "../../types/effect";
import React from "react";
import { CollisionGroup } from "../../constants/collisionGroups";
import { useFrame } from "@react-three/fiber";

// Circular moving sphere component
const CircularSphere = ({
  position,
  radius = 5,
  speed = 0.5,
  dustInterval = 200,
  verticalMotion = false,
  verticalAmplitude = 1,
  verticalFrequency = 1,
  onCreateDust,
}: {
  position: THREE.Vector3;
  radius?: number;
  speed?: number;
  dustInterval?: number;
  verticalMotion?: boolean;
  verticalAmplitude?: number;
  verticalFrequency?: number;
  onCreateDust: (position: THREE.Vector3) => void;
}) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const lastDustTime = useRef(0);
  const prevPosition = useRef(new THREE.Vector3());

  useEffect(() => {
    meshRef.current.position.set(position.x, position.y, position.z);
  }, [position]);

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    const currentTime = clock.elapsedTime * 1000; // Convert to ms

    // Calculate position on circle
    const x = Math.cos(elapsedTime * speed) * radius;
    const z = Math.sin(elapsedTime * speed) * radius;

    // Add vertical sine motion if enabled
    let y = position.y;
    if (verticalMotion) {
      y =
        position.y +
        Math.sin(elapsedTime * verticalFrequency) * verticalAmplitude;
    }

    // Update sphere position
    if (meshRef.current) {
      meshRef.current.position.x = x;
      meshRef.current.position.z = z;
      meshRef.current.position.y = y; // Using calculated y position

      const currentPosition = new THREE.Vector3(x, y, z);

      // Create dust effect every specified interval
      if (currentTime - lastDustTime.current > dustInterval) {
        lastDustTime.current = currentTime;

        // For a circle, the direction of movement is perpendicular to the radius vector
        // The tangent vector to the circle at point (x,z) is (-z,x) normalized
        const movementDirection = new THREE.Vector3(-z, 0, x).normalize();

        // Calculate the opposite direction
        const oppositeDirection = movementDirection
          .clone()
          .multiplyScalar(-0.5);

        // Position the dust behind the sphere in the opposite direction
        const dustPosition = currentPosition.clone().add(oppositeDirection);

        // Create dust at the calculated position
        onCreateDust(dustPosition);
      }

      // Save current position for next frame
      prevPosition.current.copy(currentPosition);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
};

interface MagicEffect {
  key: number;
  magic: EffectProps;
}

export function Experience() {
  const controllerRef = useRef<ControllerHandle>(null);
  const playerRef = useRef<PlayerRef>(null);
  const playerTransform = useRef({
    position: new THREE.Vector3(),
    direction: new THREE.Vector3(0, 0, 1),
  });
  const handleUpdatePlayerTransform = useCallback(
    (position: THREE.Vector3, direction: THREE.Vector3) => {
      playerTransform.current.position = position;
      playerTransform.current.direction = direction;
    },
    []
  );

  const targetHeight = 1.6;

  const [magicEffects, setMagicEffects] = useState<MagicEffect[]>([]);
  const [selectedMagic, setSelectedMagic] = useState<EffectType>(
    EffectType.FireBall
  );
  const effectKeyCounter = useRef(0);

  const [pausedPhysics, setPausedPhysics] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPausedPhysics(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (playerRef.current) {
      const boundingBox = playerRef.current.boundingBox;
      const size = playerRef.current.size;
      if (boundingBox && size) {
        console.log("Character size information updated:", {
          boundingBox,
          size,
        });
      }
    }
  }, [playerRef.current?.boundingBox, playerRef.current?.size]);

  const handleCastMagic = useCallback(
    (
      type: EffectType,
      direction: THREE.Vector3,
      startPosition: THREE.Vector3,
      targetPosition: THREE.Vector3,
      onHit: (other: unknown, pos: THREE.Vector3) => void,
      onComplete: (key: number) => void
    ) => {
      const newKey = effectKeyCounter.current++;

      let magic: EffectProps | undefined;
      switch (type) {
        case EffectType.FireBall:
          magic = {
            type: EffectType.FireBall,
            speed: 10,
            duration: 2000,
            startPosition,
            direction,
            radius: 0.5,
            excludeCollisionGroup: [CollisionGroup.Player],
            onHit: onHit,
            onComplete: () => onComplete(newKey),
          };
          break;
        case EffectType.Laser:
          magic = {
            type: EffectType.Laser,
            playerTransformRef: playerTransform,
            duration: 2000,
            length: 10,
            thickness: 0.3,
            hitInterval: 500,
            excludeCollisionGroup: [CollisionGroup.Player],
            onHit: onHit,
            onComplete: () => onComplete(newKey),
          };
          break;
        case EffectType.Lightning:
          magic = {
            type: EffectType.Lightning,
            duration: 2000,
            targetPosition: targetPosition,
            strikeCount: 5,
            spread: 1,
            rayOriginYOffset: 15,
            excludeCollisionGroup: [CollisionGroup.Player],
            onHit: onHit,
            onComplete: () => onComplete(newKey),
          };
          break;
        case EffectType.Meteor:
          magic = {
            type: EffectType.Meteor,
            count: 1,
            radius: 3,
            spread: 3,
            rayOriginYOffset: 15,
            duration: 2000,
            targetPosition: targetPosition,
            excludeCollisionGroup: [CollisionGroup.Player],
            onHit: onHit,
            onComplete: () => onComplete(newKey),
          };
          break;
        case EffectType.PoisonSwamp:
          magic = {
            type: EffectType.PoisonSwamp,
            duration: 2000,
            targetPosition: targetPosition,
            hitInterval: 1000,
            radius: 3,
            height: 0,
            opacity: 0.8,
            excludeCollisionGroup: [CollisionGroup.Player],
            onHit: onHit,
            onComplete: () => onComplete(newKey),
          };
          break;
        case EffectType.AreaIndicator:
          magic = {
            type: EffectType.AreaIndicator,
            radius: 2,
            targetPosition: targetPosition,
            onComplete: () => onComplete(newKey),
          };
          break;
        case EffectType.Bullet:
          magic = {
            type: EffectType.Bullet,
            speed: 100,
            duration: 2000,
            startPosition: startPosition,
            direction: direction,
            size: new THREE.Vector3(0.5, 0.5, 1),
            excludeCollisionGroup: [CollisionGroup.Player],
            onHit: onHit,
            onComplete: () => onComplete(newKey),
          };
          break;
        case EffectType.Dust:
          magic = {
            type: EffectType.Dust,
            startPosition: new THREE.Vector3(
              startPosition.x,
              startPosition.y - targetHeight * 0.5,
              startPosition.z
            ),
            size: 0.1,
            opacity: 0.5,
            duration: 200,
            onComplete: () => onComplete(newKey),
          };
          break;
      }

      if (!magic) return;

      setMagicEffects((prev) => [...prev, { key: newKey, magic }]);
    },
    []
  );

  const handleMagicEffectComplete = useCallback((keyToRemove: number) => {
    console.log("Experience complete effect", keyToRemove);
    setMagicEffects((prevEffects) =>
      prevEffects.filter((effect) => effect.key !== keyToRemove)
    );
  }, []);

  const handleEffectHit = useCallback((other: unknown, pos: THREE.Vector3) => {
    console.log("Experience hit effect", other, pos);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "1") setSelectedMagic(EffectType.FireBall);
      if (e.key === "2") setSelectedMagic(EffectType.Laser);
      if (e.key === "3") setSelectedMagic(EffectType.Lightning);
      if (e.key === "4") setSelectedMagic(EffectType.Meteor);
      if (e.key === "5") setSelectedMagic(EffectType.PoisonSwamp);
      if (e.key === "6") setSelectedMagic(EffectType.AreaIndicator);
      if (e.key === "7") setSelectedMagic(EffectType.Bullet);
      if (e.key === "8") setSelectedMagic(EffectType.Dust);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Function to create dust at sphere position
  const handleCreateDustGround = useCallback(
    (position: THREE.Vector3) => {
      const newKey = effectKeyCounter.current++;

      const dustEffect: EffectProps = {
        type: EffectType.Dust,
        startPosition: position,
        size: 0.3,
        opacity: 0.2,
        duration: 800,
        onComplete: () => handleMagicEffectComplete(newKey),
      };

      setMagicEffects((prev) => [...prev, { key: newKey, magic: dustEffect }]);
    },
    [handleMagicEffectComplete]
  );

  const handleCreateDustSky = useCallback(
    (position: THREE.Vector3) => {
      const newKey = effectKeyCounter.current++;
      const positionY = position.y;

      const dustEffect: EffectProps = {
        type: EffectType.Dust,
        startPosition: new THREE.Vector3(position.x, positionY, position.z),
        size: 0.3,
        opacity: 0.2,
        duration: 800,
        onComplete: () => handleMagicEffectComplete(newKey),
      };

      setMagicEffects((prev) => [...prev, { key: newKey, magic: dustEffect }]);
    },
    [handleMagicEffectComplete]
  );

  return (
    <>
      <Grid
        args={[100, 100]}
        position={[0, 0.01, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9f9f9f"
        fadeDistance={100}
        fadeStrength={1}
        userData={{ camExcludeCollision: true }}
      />

      <ambientLight intensity={0.7} />

      {/* Add spheres with different movement patterns */}
      <CircularSphere
        speed={0.5}
        position={new THREE.Vector3(0, 0, 0)}
        onCreateDust={handleCreateDustGround}
      />
      {/* <CircularSphere
        radius={7}
        speed={1}
        dustInterval={100}
        position={new THREE.Vector3(0, 5, 0)}
        onCreateDust={handleCreateDustSky}
      /> */}
      <CircularSphere
        radius={3}
        speed={2}
        dustInterval={150}
        position={new THREE.Vector3(0, 3, 0)}
        verticalMotion={true}
        verticalAmplitude={1}
        verticalFrequency={3}
        onCreateDust={handleCreateDustSky}
      />

      <Physics debug={false} paused={pausedPhysics}>
        <KeyboardControls map={keyboardMap}>
          <Environment preset="night" background={true} />

          <FreeViewController
            ref={controllerRef}
            targetHeight={targetHeight}
            camInitDis={-10}
            camMinDis={-10}
            followLight={{ position: [20, 30, 10], intensity: 1.2 }}
          >
            <Player
              ref={playerRef}
              initState={CharacterState.IDLE}
              controllerRef={controllerRef}
              targetHeight={targetHeight}
              onCastMagic={(dir, start, target) =>
                handleCastMagic(
                  selectedMagic,
                  dir,
                  start,
                  target,
                  handleEffectHit,
                  handleMagicEffectComplete
                )
              }
              onUpdatePlayerTransform={handleUpdatePlayerTransform}
            />
          </FreeViewController>
        </KeyboardControls>

        {/* <RandomBoxes count={20} range={10} /> */}
        <Floor />

        {magicEffects.map((effect) => (
          <React.Fragment key={effect.key}>
            {EffectFactory.create(effect.magic)}
          </React.Fragment>
        ))}
      </Physics>
    </>
  );
}
