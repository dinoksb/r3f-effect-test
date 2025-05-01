import { useCallback, useRef, MutableRefObject } from "react";
import { Vector3, Quaternion } from "three";
import { useKeyboardControls } from "@react-three/drei";
import { RigidBody } from "@dimforge/rapier3d-compat";

/**
 * 투사체 발사를 위한 키보드 입력 처리 시스템
 * 발사 트리거와 방향 결정을 위한 특화된 훅
 */
export function useKeyboardProjectileTrigger(options: {
  /** 발사 트리거로 사용할 키 액션 */
  fireAction?: string;
  /** 플레이어 RigidBody 참조 (방향 계산에 사용) */
  playerRigidBodyRef?: MutableRefObject<RigidBody | null>;
}) {
  const { fireAction = "action1", playerRigidBodyRef } = options;

  // 키보드 입력 훅
  const [subscribeKeys, getKeys] = useKeyboardControls();

  // 마지막 계산된 방향 캐싱
  const lastDirectionRef = useRef(new Vector3(0, 0, -1));

  /**
   * 플레이어가 바라보는 방향 벡터 계산
   */
  const getFireDirection = useCallback(() => {
    // playerRef가 없는 경우 기본 방향 사용
    if (!playerRigidBodyRef?.current) {
      return lastDirectionRef.current.clone();
    }

    // 플레이어 회전에서 전방 방향 계산
    const rigidBody = playerRigidBodyRef.current;
    const rotation = rigidBody.rotation();

    // Rapier quaternion to Three.js quaternion
    const quaternion = new Quaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w
    );

    const direction = new Vector3(0, 0, -1);
    direction.applyQuaternion(quaternion);

    // 계산된 방향 캐싱
    lastDirectionRef.current.copy(direction);

    return direction;
  }, [playerRigidBodyRef]);

  /**
   * 발사 트리거 이벤트를 구독
   * @param onFire 발사 시 호출할 콜백
   * @returns 구독 해제 함수
   */
  const subscribeTrigger = useCallback(
    (onFire: (direction: Vector3) => void) => {
      return subscribeKeys(
        (state) => state[fireAction],
        (pressed) => {
          if (pressed) {
            // 발사 시점의 방향 계산하여 콜백에 전달
            const direction = getFireDirection();
            onFire(direction);
          }
        }
      );
    },
    [subscribeKeys, fireAction, getFireDirection]
  );

  /**
   * 수동으로 발사 여부 확인 (필요시)
   */
  const isTriggerPressed = useCallback(() => {
    const keys = getKeys();
    return !!keys[fireAction];
  }, [getKeys, fireAction]);

  return {
    /** 발사 트리거 구독 (방향 정보 포함) */
    subscribeTrigger,
    /** 현재 발사 방향 계산 */
    getFireDirection,
    /** 발사 키 눌림 상태 확인 */
    isTriggerPressed,
  };
}
