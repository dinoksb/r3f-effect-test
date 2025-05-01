import { useRef, useState, useEffect, useCallback } from "react";
import { Physics } from "@react-three/rapier";
import { Environment, Grid, KeyboardControls } from "@react-three/drei";
import { CharacterState } from "../../constants/character";
import { keyboardMap } from "../../constants/controls";
import { Player, PlayerRef } from "./Player";
import { Floor } from "./Floor";
import { RandomBoxes } from "./RandomBoxes";
import { ControllerHandle, FreeViewController } from "vibe-starter-3d";
import { useEffectStore } from "../store/effectStore";
import { EffectContainer } from "../EffectContainer";
import { BoxShooter } from "../projectile-shooting-system/BoxShooter";
import { TargetShooter } from "../projectile-shooting-system/TargetShooter";

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

export function Experience() {
  const controllerRef = useRef<ControllerHandle>(null);
  const playerRef = useRef<PlayerRef>(null);
  // Get addEffect action from the store
  const addEffect = useEffectStore((state) => state.addEffect);

  const targetHeight = 1.6;

  // const [magicEffects, setMagicEffects] = useState<Effect[]>([]);
  // const [selectedMagic, setSelectedMagic] = useState<EffectType>(
  //   EffectType.FireBall
  // );
  // const effectKeyCounter = useRef(0);

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

  // const handleCastMagic = useCallback(
  //   (
  //     type: EffectType,
  //     direction: THREE.Vector3,
  //     startPosition: THREE.Vector3,
  //     targetPosition: THREE.Vector3
  //   ) => {
  //     const newKey = effectKeyCounter.current++;

  //     let magic: EffectProps | undefined;
  //     switch (type) {
  //       case EffectType.FireBall:
  //         magic = {
  //           type: EffectType.FireBall,
  //           speed: 10,
  //           duration: 2000,
  //           startPosition,
  //           direction,
  //           radius: 0.5,
  //           excludeCollisionGroup: [CollisionBitmask.Player],
  //           onHit: handleEffectHit,
  //           onComplete: () => handleMagicEffectComplete(newKey),
  //         };
  //         break;
  //       case EffectType.Laser:
  //         magic = {
  //           type: EffectType.Laser,
  //           playerTransformRef: playerTransform,
  //           duration: 2000,
  //           length: 10,
  //           thickness: 0.3,
  //           hitInterval: 500,
  //           excludeCollisionGroup: [CollisionBitmask.Player],
  //           onHit: handleEffectHit,
  //           onComplete: () => handleMagicEffectComplete(newKey),
  //         };
  //         break;
  //       case EffectType.Lightning:
  //         magic = {
  //           type: EffectType.Lightning,
  //           duration: 2000,
  //           targetPosition: targetPosition,
  //           strikeCount: 5,
  //           spread: 1,
  //           rayOriginYOffset: 15,
  //           excludeCollisionGroup: [CollisionBitmask.Player],
  //           onHit: handleEffectHit,
  //           onComplete: () => handleMagicEffectComplete(newKey),
  //         };
  //         break;
  //       case EffectType.Meteor:
  //         magic = {
  //           type: EffectType.Meteor,
  //           count: 1,
  //           radius: 3,
  //           spread: 10,
  //           rayOriginYOffset: 15,
  //           duration: 2000,
  //           targetPosition: targetPosition,
  //           excludeCollisionGroup: [CollisionBitmask.Player],
  //           onHit: handleEffectHit,
  //           onImpact: handleMagicEffectImpact,
  //           onComplete: () => handleMagicEffectComplete(newKey),
  //         };
  //         break;
  //       case EffectType.PoisonSwamp:
  //         magic = {
  //           type: EffectType.PoisonSwamp,
  //           duration: 2000,
  //           targetPosition: targetPosition,
  //           hitInterval: 1000,
  //           radius: 3,
  //           height: 0,
  //           opacity: 0.8,
  //           excludeCollisionGroup: [CollisionBitmask.Player],
  //           onHit: handleEffectHit,
  //           onComplete: () => handleMagicEffectComplete(newKey),
  //         };
  //         break;
  //       case EffectType.AreaIndicator:
  //         magic = {
  //           type: EffectType.AreaIndicator,
  //           radius: 2,
  //           targetPosition: targetPosition,
  //           onComplete: () => handleMagicEffectComplete(newKey),
  //         };
  //         break;
  //       case EffectType.Bullet:
  //         magic = {
  //           type: EffectType.Bullet,
  //           config: {
  //             startPosition: [
  //               startPosition.x,
  //               startPosition.y,
  //               startPosition.z,
  //             ],
  //             direction: [direction.x, direction.y, direction.z],
  //             speed: 100,
  //             duration: 2000,
  //           },
  //           onHit: handleEffectHit,
  //           onComplete: () => handleMagicEffectComplete(newKey),
  //         };
  //         break;
  //       case EffectType.Dust:
  //         magic = {
  //           type: EffectType.Dust,
  //           startPosition: startPosition,
  //           size: 0.4,
  //           opacity: 0.3,
  //           duration: 500,
  //           onComplete: () => handleMagicEffectComplete(newKey),
  //         };
  //         break;
  //       case EffectType.Explosion:
  //         magic = {
  //           type: EffectType.Explosion,
  //           position: targetPosition,
  //           duration: 500,
  //           radius: 5,
  //           onComplete: () => handleMagicEffectComplete(newKey),
  //         };
  //         break;
  //     }

  //     if (!magic) return;

  //     setMagicEffects((prev) => [...prev, { key: newKey, effect: magic }]);
  //   },
  //   []
  // );

  // const handleMagicEffectComplete = useCallback((keyToRemove: number) => {
  //   console.log("Experience complete effect", keyToRemove);
  //   setMagicEffects((prevEffects) =>
  //     prevEffects.filter((effect) => effect.key !== keyToRemove)
  //   );
  // }, []);

  // Callback for Player to request a magic cast
  const handleSpawnEffect = useCallback(
    async (type: string, config?: { [key: string]: PrimitiveOrArray }) => {
      // 1. Add effect locally via store
      addEffect(type, undefined, config);

      console.log("[Experience] Cast magic:", type, config);

      // 2. Send effect event to server
      // await sendEffectToServer(type, config);
    },
    [addEffect] // Dependencies
  );

  // const handleEffectHit = useCallback(
  //   (other: unknown, type: EffectType, pos: THREE.Vector3) => {
  //     console.log("Experience hit effect", other, pos);

  //     const newKey = effectKeyCounter.current++;
  //     let hitEffect: EffectProps | undefined;
  //     switch (type) {
  //       case EffectType.FireBall:
  //         hitEffect = {
  //           type: EffectType.Explosion,
  //           position: pos,
  //           duration: 600,
  //           onComplete: () => handleMagicEffectComplete(newKey),
  //         };
  //         break;
  //       default:
  //         break;
  //     }

  //     setMagicEffects((prev) => [...prev, { key: newKey, effect: hitEffect }]);
  //   },
  //   [handleMagicEffectComplete]
  // );

  // const handleMagicEffectImpact = useCallback(
  //   (type: EffectType, pos: THREE.Vector3) => {
  //     console.log("Experience impact effect", type, pos);
  //     const newKey = effectKeyCounter.current++;
  //     let impactEffect: EffectProps | undefined;
  //     switch (type) {
  //       case EffectType.Meteor:
  //         impactEffect = {
  //           type: EffectType.Explosion,
  //           position: pos,
  //           radius: 3,
  //           duration: 600,
  //           onComplete: () => handleMagicEffectComplete(newKey),
  //         };
  //         break;
  //       default:
  //         break;
  //     }

  //     setMagicEffects((prev) => [
  //       ...prev,
  //       { key: newKey, effect: impactEffect },
  //     ]);
  //   },
  //   [handleMagicEffectComplete]
  // );

  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (e.key === "1") setSelectedMagic(EffectType.FireBall);
  //     if (e.key === "2") setSelectedMagic(EffectType.Laser);
  //     if (e.key === "3") setSelectedMagic(EffectType.Lightning);
  //     if (e.key === "4") setSelectedMagic(EffectType.Meteor);
  //     if (e.key === "5") setSelectedMagic(EffectType.PoisonSwamp);
  //     if (e.key === "6") setSelectedMagic(EffectType.AreaIndicator);
  //     if (e.key === "7") setSelectedMagic(EffectType.Bullet);
  //     if (e.key === "8") setSelectedMagic(EffectType.Dust);
  //     if (e.key === "9") setSelectedMagic(EffectType.Explosion);
  //   };
  //   window.addEventListener("keydown", handleKeyDown);
  //   return () => window.removeEventListener("keydown", handleKeyDown);
  // }, []);

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

      <Physics debug={true} paused={pausedPhysics}>
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
              spawnEffect={handleSpawnEffect}
            />
          </FreeViewController>

          {/* Add BoxShooter for firing box projectiles */}
          <BoxShooter
            controllerRef={controllerRef}
            fireAction="action1"
            cooldown={500}
            boxColor="orange"
            speed={30}
            duration={3000}
            scale={1.5}
          />
          {/* 
          <MouseShooter
            controllerRef={controllerRef}
            mouseButton={0}
            cooldown={500}
            boxColor="red"
            speed={30}
            duration={3000}
            scale={1.5}
          /> */}

          <TargetShooter
            controllerRef={controllerRef}
            mouseButton={0}
            cooldown={500}
            boxColor="blue"
            speed={30}
            duration={3000}
            scale={1.5}
          />
        </KeyboardControls>
        <RandomBoxes count={20} range={10} />
        <EffectContainer />

        <Floor />
      </Physics>
    </>
  );
}
