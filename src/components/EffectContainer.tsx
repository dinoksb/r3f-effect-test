import { useCallback, useEffect } from "react";
import { Vector3 } from "three";
import { FireBallEffectController } from "./effects/FireBallEffectController";
import { ActiveEffect, EffectType } from "../types/effect";
import {
  useEffectStore,
  useActiveEffects,
} from "../../src/components/store/effectStore";
import {
  createExplosionEffectConfig,
  ExplosionDust,
} from "./effects/ExplosionDust";
import { useGameServer, useRoomState } from "@agent8/gameserver";
import { LightningEffectController } from "./effects/LightningEffectController";
import { MeteorEffectController } from "./effects/MeteorEffectController";
import {
  createExplosionWithImpactConfig,
  ShockwaveExplosion,
} from "./effects/ShockwaveExplosion";
import { PoisonSwampEffectController } from "./effects/PoisonSwampEffectController";
import { BulletEffectController } from "./effects/BulletEffectController";
import { AreaIndicator } from "./effects/AreaIndicator";
import { EnvironmentalDust } from "./effects/EnvironmentalDust";
import { Collider, RigidBody } from "@dimforge/rapier3d-compat";
import { usePlayerStore } from "./store/playerStore";

/**
 * Effect container component using Zustand store for effect management.
 */
export function EffectContainer() {
  const { server, account } = useGameServer();
  //   if (!connected) return null;
  const { roomId } = useRoomState();
  const getPlayerRef = usePlayerStore((state) => state.getPlayerRef);

  // Get state and actions from the Zustand store
  const activeEffects = useActiveEffects();
  const addEffect = useEffectStore((state) => state.addEffect);
  const removeEffect = useEffectStore((state) => state.removeEffect);

  // Callback to remove completed effects using the store action
  const handleEffectComplete = useCallback(
    (keyToRemove: number) => {
      console.log("[EffectContainer] Effect complete:", keyToRemove);
      removeEffect(keyToRemove);
    },
    [removeEffect]
  );

  const handleEffecttHit = useCallback(
    (
      type: EffectType,
      pos?: Vector3,
      rigidBody?: RigidBody,
      collider?: Collider,
      sender?: string
    ): boolean => {
      const targetAccount = rigidBody?.userData?.["account"];
      if (sender && targetAccount) {
        if (targetAccount === sender) return false;
      }

      if (!pos) return;

      switch (type) {
        case EffectType.BULLET:
        case EffectType.FIREBALL:
          addEffect(
            EffectType.EXPLOSION_DUST,
            undefined,
            createExplosionEffectConfig(pos, 0.5)
          );
          break;
        case EffectType.METEOR:
          console.log("Meteor hit: ", pos, rigidBody, collider, sender);
          break;
        case EffectType.LIGHTNING:
          console.log("Lightning hit: ", pos, rigidBody, collider, sender);
          break;
      }

      return true;
    },
    [addEffect]
  );

  const handleMeteorEffectImpact = useCallback(
    (pos: Vector3) => {
      if (pos) {
        addEffect(
          EffectType.SHOCKWAVE_EXPLOSION,
          undefined,
          createExplosionWithImpactConfig(pos)
        );
      }
    },
    [addEffect]
  );

  // Subscribe to effect events from other players
  useEffect(() => {
    if (!roomId || !server) return;

    const unsubscribe = server.onRoomMessage(
      roomId,
      "effect-event",
      (message) => {
        // Ignore messages sent by self
        if (message.sender === server.account) return;

        console.log("[EffectContainer] Received effect event:", message);

        // Add the received effect using the store action
        addEffect(message.type, message.sender, message.config);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [roomId, server, addEffect, account]);

  // Function to render individual effects based on their type
  const renderEffect = useCallback(
    (effect: ActiveEffect) => {
      const type = effect.effectData.type;

      switch (type) {
        case EffectType.FIREBALL:
          return (
            <FireBallEffectController
              key={effect.key}
              config={effect.effectData.config}
              owner={getPlayerRef("player")?.current}
              onHit={(pos, rigidBody, collider) =>
                handleEffecttHit(type, pos, rigidBody, collider, effect.sender)
              }
              onComplete={() => {
                handleEffectComplete(effect.key);
                console.log(
                  "[EffectContainer] FireBall effect complete:",
                  effect.key
                );
              }}
            />
          );
        case EffectType.EXPLOSION_DUST:
          return (
            <ExplosionDust
              key={effect.key}
              config={effect.effectData.config}
              onComplete={() => {
                handleEffectComplete(effect.key);
                console.log(
                  "[EffectContainer] Explosion effect complete:",
                  effect.key
                );
              }}
            />
          );
        case EffectType.LIGHTNING:
          return (
            <LightningEffectController
              key={effect.key}
              config={effect.effectData.config}
              onHit={(pos, rigidBody, collider) => {
                return handleEffecttHit(
                  type,
                  pos,
                  rigidBody,
                  collider,
                  effect.sender
                );
              }}
              onComplete={() => {
                handleEffectComplete(effect.key);
                console.log(
                  "[EffectContainer] Lightning effect complete:",
                  effect.key
                );
              }}
            />
          );
        case EffectType.METEOR:
          return (
            <MeteorEffectController
              key={effect.key}
              config={effect.effectData.config}
              onHit={(pos, rigidBody, collider) => {
                return handleEffecttHit(
                  type,
                  pos,
                  rigidBody,
                  collider,
                  effect.sender
                );
              }}
              onImpact={(pos) => {
                return handleMeteorEffectImpact(pos);
              }}
              onComplete={() => {
                handleEffectComplete(effect.key);
                console.log(
                  "[EffectContainer] Meteor effect complete:",
                  effect.key
                );
              }}
            />
          );
        case EffectType.SHOCKWAVE_EXPLOSION:
          return (
            <ShockwaveExplosion
              key={effect.key}
              config={effect.effectData.config}
            />
          );
        case EffectType.POISON_SWAMP:
          return (
            <PoisonSwampEffectController
              key={effect.key}
              config={effect.effectData.config}
              onComplete={() => {
                handleEffectComplete(effect.key);
              }}
            />
          );
        case EffectType.BULLET:
          return (
            <BulletEffectController
              key={effect.key}
              config={effect.effectData.config}
              owner={getPlayerRef(effect.sender)?.current}
              onHit={(pos, rigidBody, collider) =>
                handleEffecttHit(type, pos, rigidBody, collider, effect.sender)
              }
              onComplete={() => {
                handleEffectComplete(effect.key);
              }}
            />
          );
        case EffectType.AREA_INDICATOR:
          return (
            <AreaIndicator
              key={effect.key}
              config={effect.effectData.config}
              onComplete={() => {
                handleEffectComplete(effect.key);
              }}
            />
          );
        case EffectType.ENVIRONMENTAL_DUST:
          return (
            <EnvironmentalDust
              key={effect.key}
              config={effect.effectData.config}
              onComplete={() => handleEffectComplete(effect.key)}
            />
          );
        // Add cases for other effect types here
        default:
          console.warn(`[EffectContainer] Unknown effect type: ${type}`);
          return null;
      }
    },
    [handleEffectComplete, handleEffecttHit, handleMeteorEffectImpact]
  );

  // Render all active effects from the store
  return <>{activeEffects.map(renderEffect)}</>;
}
