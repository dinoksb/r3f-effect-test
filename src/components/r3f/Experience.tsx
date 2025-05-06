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
import { TargetShooter } from "../projectile-shooting-system/TargetShooter";
import { KeyboardCircularShooter } from "../projectile-shooting-system/KeyboardCircularShooter";
import { useStraightLineProjectile } from "../../hooks/useStraightLineProjectile";
import { EffectType } from "../../types/effect";

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

export function Experience() {
  const controllerRef = useRef<ControllerHandle>(null);
  const playerRef = useRef<PlayerRef>(null);
  // Get addEffect action from the store
  const addEffect = useEffectStore((state) => state.addEffect);

  useStraightLineProjectile({
    rigidBodyRef: controllerRef.current?.rigidBodyRef || { current: null },
    projectileType: EffectType.FIREBALL,
    fireAction: "zAttack",
    projectileSpeed: 50,
  });

  const targetHeight = 1.6;

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

          <KeyboardCircularShooter
            controllerRef={controllerRef}
            fireAction="action1"
            projectileSize={1}
            projectileSpeed={15}
            projectileColor="#FF5500"
            projectileLifetime={2}
            maxProjectiles={20}
            cooldown={300}
          />

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
