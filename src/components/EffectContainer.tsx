import { useCallback, useEffect } from "react";
import { Vector3 } from "three";
import { FireBallEffectController } from "./effects/FireBallEffectController";
import { ActiveEffect, EffectType } from "../types/effect";
import {
  useEffectStore,
  useActiveEffects,
} from "../../src/components/store/effectStore";
import { IntersectionEnterPayload } from "@react-three/rapier";
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

/**
 * Effect container component using Zustand store for effect management.
 */
export function EffectContainer() {
  const { server, account } = useGameServer();
  //   if (!connected) return null;
  const { roomId } = useRoomState();

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

  // Handler for when an effect hits something (logic might be needed here)
  const handleFireBallEffectHit = useCallback(
    (other: IntersectionEnterPayload, pos?: Vector3, sender?: string) => {
      console.log("handleFireBallEffectHit", other, pos, sender);

      if (sender) {
        if (other.rigidBody?.userData?.["account"] === sender) return false;
      }

      if (pos) {
        addEffect(
          EffectType.EXPLOSION_DUST,
          undefined,
          createExplosionEffectConfig(pos, 0.5)
        );
      }
      return true;
    },
    []
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

  const handleLightningEffectHit = useCallback(
    (effectKey: number) => {
      handleEffectComplete(effectKey);
    },
    [handleEffectComplete]
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
              onHit={(other, pos) => {
                return handleFireBallEffectHit(other, pos, effect.sender);
              }}
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
              onHit={() => {
                return handleLightningEffectHit(effect.key);
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
              onHit={(other, pos) => {
                console.log("Meteor hit", other, pos);
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
    [handleFireBallEffectHit, handleEffectComplete]
  );

  // Render all active effects from the store
  return <>{activeEffects.map(renderEffect)}</>;
}
