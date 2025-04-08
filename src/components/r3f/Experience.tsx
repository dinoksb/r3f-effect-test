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
import { TargetIndicatorEffectController } from "../effects/TargetIndicatorEffectController";
import { MeteorEffectController } from "../effects/MeteorEffectController";

interface ActiveEffect {
  key: number;
  type: MagicType;
  direction: THREE.Vector3;
  startPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  sourceRef?: React.RefObject<PlayerRef>;
}

interface TargetIndicatorEffect {
  key: number;
  targetPosition: THREE.Vector3;
}

export function Experience() {
  const controllerRef = useRef<ControllerHandle>(null);
  const playerRef = useRef<PlayerRef>(null);
  const targetHeight = 1.6;

  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [targetIndicatorEffects, setTargetIndicatorEffects] = useState<
    TargetIndicatorEffect[]
  >([]);
  const [selectedMagic, setSelectedMagic] = useState<MagicType>(
    MagicType.FireBall
  );
  const effectKeyCounter = useRef(0);
  const targetIndicatorKeyCounter = useRef(5000);

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

      const newTargetIndicatorKey = targetIndicatorKeyCounter.current++;
      setTargetIndicatorEffects((prev) => [
        ...prev,
        {
          key: newTargetIndicatorKey,
          targetPosition,
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

  const handleTargetIndicatorEffectComplete = useCallback(
    (keyToRemove: number) => {
      console.log("Experience complete target indicator effect", keyToRemove);
      setTargetIndicatorEffects((prevEffects) =>
        prevEffects.filter((effect) => effect.key !== keyToRemove)
      );
    },
    []
  );

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
  }, [activeEffects]);

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
          <>
            <MeteorEffectController
              key={effect.key}
              radius={2}
              type={MagicType.Meteor}
              count={1}
              duration={2500}
              spread={10}
              rayOriginYOffset={15}
              targetPosition={effect.targetPosition}
              startPosition={
                new THREE.Vector3(
                  effect.targetPosition.x,
                  effect.targetPosition.y + 15,
                  effect.targetPosition.z - 15
                )
              }
              onHit={handleEffectHit}
              onComplete={() => handleMagicEffectComplete(effect.key)}
            />

            <TargetIndicatorEffectController
              key={targetIndicatorKeyCounter.current}
              duration={2500}
              radius={2}
              targetPosition={effect.targetPosition}
              onComplete={() =>
                handleTargetIndicatorEffectComplete(
                  targetIndicatorKeyCounter.current
                )
              }
            />
          </>
          // <MagicFactory
          //   key={effect.key}
          //   type={effect.type}
          //   startPosition={effect.startPosition}
          //   direction={effect.direction}
          //   targetPosition={effect.targetPosition}
          //   getLatestPosition={getPlayerPosition}
          //   getLatestDirection={getPlayerDirection}
          //   onHit={handleEffectHit}
          //   onComplete={() => handleMagicEffectComplete(effect.key)}
          // />
        ))}
        {/* <TargetIndicatorEffectController
          key={effectKeyCounter.current}
          duration={2500}
          radius={2}
          targetPosition={
            activeEffects.length > 0
              ? activeEffects[activeEffects.length - 1].targetPosition
              : new THREE.Vector3(0, 0, 0)
          }
          onComplete={() => handleMagicEffectComplete(effectKeyCounter.current)}
        /> */}
        ;
      </Physics>
    </>
  );
}
