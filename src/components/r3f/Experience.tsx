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
import { EffectType } from "../../types/magic";
import React from "react";

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
            excludeCollisionGroup: [],
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
            hitInterval: 0.1,
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

        <RandomBoxes count={20} range={10} />
        <Floor />

        {magicEffects.map((effect) => (
          <React.Fragment key={effect.key}>
            {EffectFactory.create({
              ...effect.magic,
            })}
          </React.Fragment>
        ))}
      </Physics>
    </>
  );
}
