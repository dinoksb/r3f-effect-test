import React, { useRef, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { useProjectileKeyboardInput } from "./projectileKeyboardInput";
import { useEffectStore } from "../store/effectStore";
import { EffectType } from "../../types/effect";
import { createBulletEffectConfig } from "../effects/BulletEffectController";
import { useGameServer } from "@agent8/gameserver";
import { ControllerHandle } from "vibe-starter-3d";

interface BoxShooterProps {
  controllerRef?: React.RefObject<ControllerHandle>; // 컨트롤러 참조 직접 받음
  fireAction?: string;
  cooldown?: number;
  boxColor?: string;
  speed?: number;
  duration?: number;
  scale?: number;
}

export const BoxShooter: React.FC<BoxShooterProps> = ({
  controllerRef,
  fireAction = "action1",
  cooldown = 500,
  boxColor = "orange",
  speed = 30,
  duration = 3000,
  scale = 1.5,
}) => {
  // Get the effect store functions to add effects
  const addEffect = useEffectStore((state) => state.addEffect);

  // Get account for tracking effect ownership
  const { account } = useGameServer();

  // Track cooldown
  const lastFireTime = useRef(0);
  const isCoolingDown = useRef(false);

  // useKeyboardProjectileTrigger의 내부 구현을 확인해 MutableRefObject 예외 처리
  const { subscribeTrigger } = useProjectileKeyboardInput({
    fireAction,
    // @ts-expect-error - CustomEcctrlRigidBody와 RigidBody 간의 타입 호환성 문제
    playerRigidBodyRef: controllerRef?.current?.rigidBodyRef,
  });

  // Handle shooting logic with cooldown
  const handleFire = useCallback(
    (direction: Vector3) => {
      const now = Date.now();

      // Check cooldown
      if (now - lastFireTime.current < cooldown) {
        return;
      }

      // Update last fire time
      lastFireTime.current = now;
      isCoolingDown.current = true;

      // Get player position for starting point
      const playerPosition =
        controllerRef?.current?.rigidBodyRef?.current?.translation() || {
          x: 0,
          y: 1,
          z: 0,
        };

      const startPosition = new Vector3(
        playerPosition.x,
        playerPosition.y + 1, // Shoot from slightly above player
        playerPosition.z
      );

      // Calculate bullet configuration
      const config = createBulletEffectConfig({
        startPosition,
        direction,
        speed,
        duration,
        scale,
        color: boxColor,
      });

      // Add the effect locally
      addEffect(EffectType.BULLET, account, config);

      // We don't need to send to server since the EffectContainer handles this
      // with the effect store and onRoomMessage
    },
    [
      addEffect,
      controllerRef,
      cooldown,
      speed,
      duration,
      scale,
      boxColor,
      account,
    ]
  );

  // Subscribe to fire trigger
  React.useEffect(() => {
    // Subscribe to the fire action
    const unsubscribe = subscribeTrigger(handleFire);
    return unsubscribe;
  }, [subscribeTrigger, handleFire]);

  // Handle cooldown reset
  useFrame(() => {
    if (
      isCoolingDown.current &&
      Date.now() - lastFireTime.current >= cooldown
    ) {
      isCoolingDown.current = false;
    }
  });

  // This component doesn't render anything directly, it just hooks into the firing mechanism
  return null;
};
