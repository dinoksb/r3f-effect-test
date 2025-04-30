import React, {
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
  useState,
} from "react";
import * as THREE from "three";
import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CharacterState } from "../../constants/character";
import { Box3, Vector3 } from "three";
import {
  AnimationConfigMap,
  CharacterResource,
  ControllerHandle,
} from "vibe-starter-3d";
import {
  CharacterRenderer,
  CharacterRendererRef,
} from "vibe-starter-3d/dist/src/components/renderers/CharacterRenderer";
import { CollisionBitmask } from "../../constants/collisionGroups";
import { RigidBodyCollisionSystem } from "../../utils/rigidbodyCollisionSystem";
import { EffectType } from "../../types/effect";
import { createFireBallEffectConfig } from "../effects/FireBallEffectController";
import { createLightningEffectConfig } from "../effects/LightningEffectController";
import { createMeteorEffectConfig } from "../effects/MeteorEffectController";
import { createExplosionWithImpactConfig } from "../effects/ShockwaveExplosion";
import { createPoisonSwampEffectConfig } from "../effects/PoisonSwampEffectController";
import { createBulletEffectConfig } from "../effects/BulletEffectController";
import { createAreaIndicatorConfig } from "../effects/AreaIndicator";
import { createDustConfig } from "../effects/EnvironmentalDust";
import { usePlayerStore } from "../store/playerStore";

/**
 * Player input parameters for action determination
 */
interface PlayerInputs {
  isRevive: boolean;
  isDying: boolean;
  isPunching: boolean;
  isHit: boolean;
  isJumping: boolean;
  isMoving: boolean;
  isRunning: boolean;
  isMagic: boolean;
  currentVelY: number;
}

/**
 * Player ref interface
 */
export interface PlayerRef {
  /** Bounding box of the character model */
  boundingBox: Box3 | null;
  /** Size of the character model */
  size: Vector3 | null;
}

/**
 * Player component props
 */
interface PlayerProps {
  /** Initial state of the player character */
  initState?: CharacterState;
  /** Reference to the controller component */
  controllerRef?: React.RefObject<ControllerHandle>;
  /** Target height for the character model */
  targetHeight?: number;
  /** Callback to request magic cast */
  spawnEffect?: (type: EffectType, config?: { [key: string]: any }) => void;
}

/**
 * Hook for determining player state based on inputs
 * MODIFIED: MAGIC state is now transient (only for the frame it's triggered)
 */
function usePlayerStates() {
  const determinePlayerState = React.useCallback(
    (
      currentState: CharacterState,
      {
        isRevive,
        isDying,
        isPunching,
        isHit,
        isJumping,
        isMoving,
        isRunning,
        isMagic,
      }: PlayerInputs
    ): CharacterState => {
      // --- Highest priority checks ---
      if (isRevive && currentState === CharacterState.DIE)
        return CharacterState.IDLE;
      if (isDying || currentState === CharacterState.DIE)
        return CharacterState.DIE;
      if (isHit) return CharacterState.HIT; // Hit interrupts most things

      // --- Action triggering (only if not in a blocking state like DIE/HIT) ---
      // If magic key is pressed *now* and not already in MAGIC state (prevents re-triggering)
      if (isMagic && currentState !== CharacterState.MAGIC) {
        return CharacterState.MAGIC; // Enter MAGIC state momentarily this frame
      }

      // --- State continuation or transition *from* non-blocking states ---
      // If currently in MAGIC state, immediately decide next state based on other inputs
      // This makes the MAGIC animation state very short lived. The visual effect continues independently.
      if (currentState === CharacterState.MAGIC) {
        if (isJumping) return CharacterState.JUMP;
        if (isMoving)
          return isRunning ? CharacterState.RUN : CharacterState.WALK;
        return CharacterState.IDLE;
      }

      // --- Other actions (ensure they don't trigger if casting/punching/jumping etc.) ---
      if (
        isPunching &&
        currentState !== CharacterState.PUNCH &&
        currentState !== CharacterState.JUMP
      ) {
        return CharacterState.PUNCH;
      }
      if (
        isJumping &&
        currentState !== CharacterState.JUMP &&
        currentState !== CharacterState.PUNCH
      ) {
        return CharacterState.JUMP;
      }

      // --- Movement / Idle ---
      // Maintain jump/punch until animation completes (handled by usePlayerAnimations hook resetting state)
      if (
        currentState === CharacterState.JUMP ||
        currentState === CharacterState.PUNCH
      ) {
        return currentState;
      }
      // Note: HIT state completion is also handled by usePlayerAnimations
      if (currentState === CharacterState.HIT) {
        return currentState;
      }

      if (isMoving) {
        // Don't switch to move if just finished punching/jumping this frame (wait for animation hook)
        if (
          currentState !== CharacterState.PUNCH &&
          currentState !== CharacterState.JUMP
        )
          return isRunning ? CharacterState.RUN : CharacterState.WALK;
      }

      // Default to IDLE if not moving and not in an active action state
      if (
        !isMoving &&
        currentState !== CharacterState.PUNCH &&
        currentState !== CharacterState.JUMP &&
        currentState !== CharacterState.HIT
      ) {
        return CharacterState.IDLE;
      }

      // Fallback: maintain current state if none of the above apply
      return currentState;
    },
    []
  );

  return { determinePlayerState: determinePlayerState };
}

/**
 * Hook for handling player animations
 */
function usePlayerAnimations(
  currentStateRef: React.MutableRefObject<CharacterState>
) {
  const handleAnimationComplete = React.useCallback(
    (state: CharacterState) => {
      console.log(`Animation ${state} completed`);
      // Reset to IDLE only if the state hasn't changed to something else already
      if (currentStateRef.current === state) {
        switch (state) {
          case CharacterState.JUMP:
          case CharacterState.PUNCH:
          case CharacterState.HIT:
            // MAGIC state is transient, doesn't need animation completion logic here
            currentStateRef.current = CharacterState.IDLE;
            break;
          default:
            break;
        }
      }
    },
    [currentStateRef]
  );

  // Animation configuration
  const animationConfigMap: Partial<AnimationConfigMap<CharacterState>> =
    useMemo(
      () => ({
        [CharacterState.IDLE]: {
          animationType: "IDLE",
          loop: true,
        },
        [CharacterState.WALK]: {
          animationType: "WALK",
          loop: true,
        },
        [CharacterState.RUN]: {
          animationType: "RUN",
          loop: true,
        },
        [CharacterState.JUMP]: {
          animationType: "JUMP",
          loop: false,
          clampWhenFinished: true,
          onComplete: () => handleAnimationComplete(CharacterState.JUMP),
        },
        [CharacterState.PUNCH]: {
          animationType: "PUNCH",
          loop: false,
          clampWhenFinished: true,
          onComplete: () => handleAnimationComplete(CharacterState.PUNCH),
        },
        [CharacterState.HIT]: {
          animationType: "HIT", // Uses 'HIT' type but will map to IDLE animation below
          loop: false,
          clampWhenFinished: true,
          onComplete: () => handleAnimationComplete(CharacterState.HIT),
        },
        [CharacterState.DIE]: {
          animationType: "DIE", // Uses 'DIE' type but will map to IDLE animation below
          loop: false,
          duration: 0.1, // Short duration as it's just IDLE
          clampWhenFinished: true,
        },
        // MAGIC animation config removed - handled by custom effect
      }),
      [handleAnimationComplete]
    );

  return { animationConfigMap };
}

/**
 * Player component that manages character model and animations
 *
 * Handles player state management, rendering, and requests magic casts via callback.
 */
export const Player = forwardRef<PlayerRef, PlayerProps>(
  (
    {
      initState: initAction = CharacterState.IDLE,
      controllerRef,
      targetHeight = 1.6,
      spawnEffect,
    },
    ref
  ) => {
    const currentStateRef = useRef<CharacterState>(initAction);
    const [, getKey] = useKeyboardControls();
    const { determinePlayerState: determinePlayerState } = usePlayerStates();
    const { animationConfigMap } = usePlayerAnimations(currentStateRef);
    const characterRendererRef = useRef<CharacterRendererRef>(null);
    const hasInitializedRef = useRef(false);
    const magicTriggeredRef = useRef(false);
    const [selectedMagic, setSelectedMagic] = useState<EffectType>(
      EffectType.FIREBALL
    );
    const { account } = useMemo(() => ({ account: "player" }), []);
    const { registerPlayerRef, unregisterPlayerRef } = usePlayerStore();

    useImperativeHandle(
      ref,
      () => ({
        get boundingBox() {
          return characterRendererRef.current?.boundingBox || null;
        },
        get size() {
          return characterRendererRef.current?.size || null;
        },
      }),
      []
    );

    useEffect(() => {
      if (!controllerRef.current?.rigidBodyRef.current) return;

      const rigidBody = controllerRef.current.rigidBodyRef.current;
      if (rigidBody.userData) {
        rigidBody.userData["account"] = account;
      } else {
        rigidBody.userData = { account };
      }

      registerPlayerRef(account, controllerRef.current.rigidBodyRef);

      return () => {
        unregisterPlayerRef(account);
      };
    }, [account, controllerRef, registerPlayerRef, unregisterPlayerRef]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "1") setSelectedMagic(EffectType.FIREBALL);
        if (e.key === "2") setSelectedMagic(EffectType.LASER);
        if (e.key === "3") setSelectedMagic(EffectType.LIGHTNING);
        if (e.key === "4") setSelectedMagic(EffectType.METEOR);
        if (e.key === "5") setSelectedMagic(EffectType.POISON_SWAMP);
        if (e.key === "6") setSelectedMagic(EffectType.AREA_INDICATOR);
        if (e.key === "7") setSelectedMagic(EffectType.BULLET);
        if (e.key === "8") setSelectedMagic(EffectType.EXPLOSION_DUST);
        if (e.key === "9") setSelectedMagic(EffectType.SHOCKWAVE_EXPLOSION);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Set collision groups on player rigid body
    useFrame(() => {
      if (hasInitializedRef.current) return;

      const rigidBody = controllerRef?.current?.rigidBodyRef?.current;
      if (!rigidBody) return;

      for (let i = 0; i < rigidBody.collider.length; ++i) {
        rigidBody
          .collider(i)
          .setCollisionGroups(
            RigidBodyCollisionSystem.setupRigidBodyCollisionGroups([
              CollisionBitmask.Player,
            ])
          );
      }

      hasInitializedRef.current = true;
    });

    // Magic casting logic extracted as a separate function
    const handleMagicCast = useCallback(() => {
      if (!controllerRef?.current?.rigidBodyRef?.current) return;

      console.log("Magic key pressed - Requesting cast!");

      // Call callback provided by parent component
      if (spawnEffect) {
        // Calculate magic direction (direction character is facing)
        const rigidBody = controllerRef.current.rigidBodyRef.current;
        const position = rigidBody.translation();
        const startPosition = new THREE.Vector3(
          position.x,
          position.y,
          position.z
        );
        const rotation = rigidBody.rotation();
        const quaternion = new THREE.Quaternion(
          rotation.x,
          rotation.y,
          rotation.z,
          rotation.w
        );
        const direction = new THREE.Vector3(0, 0, 1)
          .applyQuaternion(quaternion)
          .normalize();

        console.log("Selected magic:", selectedMagic);

        switch (selectedMagic) {
          case EffectType.FIREBALL:
            spawnEffect(
              EffectType.FIREBALL,
              createFireBallEffectConfig({
                startPosition,
                direction,
              })
            );
            break;
          case EffectType.LIGHTNING: {
            const playerPos = startPosition.clone();
            const targetPos = playerPos.clone().add(direction.clone());
            spawnEffect(
              EffectType.LIGHTNING,
              createLightningEffectConfig(targetPos)
            );
            break;
          }
          case EffectType.METEOR:
            spawnEffect(
              EffectType.METEOR,
              createMeteorEffectConfig(startPosition)
            );
            break;
          case EffectType.SHOCKWAVE_EXPLOSION:
            spawnEffect(
              EffectType.SHOCKWAVE_EXPLOSION,
              createExplosionWithImpactConfig(startPosition)
            );
            break;
          case EffectType.POISON_SWAMP:
            {
              const playerPos = startPosition.clone();
              const targetPos = new THREE.Vector3(
                playerPos.x,
                0.01,
                playerPos.z
              );

              spawnEffect(
                EffectType.POISON_SWAMP,
                createPoisonSwampEffectConfig(targetPos)
              );
            }
            break;
          case EffectType.BULLET:
            spawnEffect(
              EffectType.BULLET,
              createBulletEffectConfig({
                startPosition,
                direction,
                speed: 100,
                duration: 500,
                scale: 3,
                flashDuration: 30,
                color: "black",
              })
            );
            break;
          case EffectType.AREA_INDICATOR:
            spawnEffect(
              EffectType.AREA_INDICATOR,
              createAreaIndicatorConfig(startPosition)
            );
            break;
          case EffectType.EXPLOSION_DUST:
            spawnEffect(
              EffectType.EXPLOSION_DUST,
              createDustConfig(startPosition)
            );
            break;
        }
      } else {
        console.warn(
          "Player tried to cast magic, but onCastMagic prop is missing!"
        );
      }
    }, [controllerRef, spawnEffect, selectedMagic]);

    // Magic cast
    useFrame(() => {
      if (!controllerRef?.current?.rigidBodyRef?.current) return;

      const inputs = getKey();
      const isMagic = inputs.magic;

      const triggerMagic = isMagic && !magicTriggeredRef.current;

      if (triggerMagic) {
        handleMagicCast();
      }

      magicTriggeredRef.current = isMagic;

      // Determine player state
      const rigidBody = controllerRef.current.rigidBodyRef.current;
      const currentVel = rigidBody?.linvel?.() || { y: 0 };
      const isMoving =
        inputs.forward ||
        inputs.backward ||
        inputs.leftward ||
        inputs.rightward;
      const newState = determinePlayerState(currentStateRef.current, {
        isRevive: inputs.action4,
        isDying: inputs.action3,
        isPunching: inputs.action1,
        isHit: inputs.action2,
        isJumping: inputs.jump,
        isMoving,
        isRunning: inputs.run,
        isMagic, // Pass magic input for transient state
        currentVelY: currentVel.y,
      });
      if (newState !== currentStateRef.current) {
        console.log(
          `State changed from ${currentStateRef.current} to ${newState}`
        );
      }
      currentStateRef.current = newState;
    });

    // Define the character resource with all animations
    const characterResource: CharacterResource = useMemo(
      () => ({
        name: "Default Character",
        url: "https://agent8-games.verse8.io/assets/3d/characters/human/space-marine.glb",
        animations: {
          IDLE: "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/idle.glb",
          WALK: "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/walk.glb",
          RUN: "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/run.glb",
          JUMP: "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/jump-up.glb",
          PUNCH:
            "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/punch.glb",
          HIT: "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/idle.glb", // Use IDLE for HIT
          DIE: "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/idle.glb", // Use IDLE for DIE
          // MAGIC animation URL removed
        },
        animationConfigMap: animationConfigMap,
      }),
      [animationConfigMap]
    );

    return (
      <>
        <CharacterRenderer
          ref={characterRendererRef}
          characterResource={characterResource}
          animationConfigMap={animationConfigMap}
          currentActionRef={currentStateRef}
          targetHeight={targetHeight}
        />
      </>
    );
  }
);
