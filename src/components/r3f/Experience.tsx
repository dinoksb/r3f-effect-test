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
import { MagicFactory } from "../../factories/MagicFactory";
import { MagicType } from "../../types/magic";
import React from "react";
import { TargetIndicatorEffectController } from "../effects/TargetIndicatorEffectController";

interface ActiveEffect {
  key: number;
  type: MagicType;
  direction: THREE.Vector3;
  startPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  size?: number;
  sourceRef?: React.RefObject<PlayerRef>;
}

export function Experience() {
  const controllerRef = useRef<ControllerHandle>(null);
  const playerRef = useRef<PlayerRef>(null);
  const targetHeight = 1.6;

  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [selectedMagic, setSelectedMagic] = useState<MagicType>(
    MagicType.FireBall
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
      type: MagicType,
      direction: THREE.Vector3,
      startPosition: THREE.Vector3,
      targetPosition: THREE.Vector3
    ) => {
      const newKey = effectKeyCounter.current++;
      setActiveEffects((prev) => [
        ...prev,
        {
          key: newKey,
          type,
          direction,
          startPosition,
          targetPosition,
          sourceRef: playerRef,
        },
      ]);
    },
    []
  );

  const handleMagicEffectComplete = useCallback((keyToRemove: number) => {
    console.log("Experience complete effect", keyToRemove);
    setActiveEffects((prevEffects) =>
      prevEffects.filter((effect) => effect.key !== keyToRemove)
    );
  }, []);

  const handleEffectHit = useCallback((other: unknown, pos: THREE.Vector3) => {
    console.log("Experience hit effect", other, pos);
  }, []);

  const getPlayerPosition = useCallback(() => {
    if (!playerRef.current || !controllerRef.current?.rigidBodyRef?.current)
      return new THREE.Vector3();
    const position = controllerRef.current.rigidBodyRef.current.translation();
    return new THREE.Vector3(position.x, position.y, position.z);
  }, []);

  const getPlayerDirection = useCallback(() => {
    if (!playerRef.current || !controllerRef.current?.rigidBodyRef?.current)
      return new THREE.Vector3(0, 0, 1);
    const rigidBody = controllerRef.current.rigidBodyRef.current;
    const rotation = rigidBody.rotation();
    const quaternion = new THREE.Quaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w
    );
    return new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "1") setSelectedMagic(MagicType.FireBall);
      if (e.key === "2") setSelectedMagic(MagicType.Laser);
      if (e.key === "3") setSelectedMagic(MagicType.Lightning);
      if (e.key === "4") setSelectedMagic(MagicType.Meteor);
      if (e.key === "5") setSelectedMagic(MagicType.PoisonSwamp);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
                handleCastMagic(selectedMagic, dir, start, target)
              }
            />
          </FreeViewController>
        </KeyboardControls>

        <RandomBoxes count={20} range={10} />
        <Floor />

        {activeEffects.map((effect) => (
          <React.Fragment key={effect.key}>
            <MagicFactory
              type={effect.type}
              startPosition={effect.startPosition}
              direction={effect.direction}
              targetPosition={effect.targetPosition}
              size={effect.size}
              getLatestPosition={getPlayerPosition}
              getLatestDirection={getPlayerDirection}
              onHit={handleEffectHit}
              onComplete={() => handleMagicEffectComplete(effect.key)}
            />
            <TargetIndicatorEffectController
              key={`targeting-${effect.key}`}
              duration={3000}
              radius={3}
              targetPosition={effect.targetPosition}
            />
          </React.Fragment>
        ))}
      </Physics>
    </>
  );
}
