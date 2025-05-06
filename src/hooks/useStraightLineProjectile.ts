import { useCallback, useEffect, useRef } from "react";
import { Vector3, Quaternion } from "three";
import { useKeyboardControls } from "@react-three/drei";
import { useEffectStore } from "../components/store/effectStore";
import { EffectType } from "../types/effect";

interface StraightLineProjectileOptions {
  /**
   * RigidBody 참조 (위치와 방향 계산에 사용)
   */
  rigidBodyRef: React.RefObject<{
    translation: () => { x: number; y: number; z: number };
    rotation: () => { x: number; y: number; z: number; w: number };
  }>;

  /**
   * 투사체 타입
   */
  projectileType: string;

  /**
   * 투사체 속도
   */
  projectileSpeed: number;

  /**
   * 발사 키 액션
   */
  fireAction: string;
}

/**
 * 직선 발사 투사체 훅
 * 키보드 입력에 따라 투사체를 직선으로 발사하는 기능 제공
 */
export function useStraightLineProjectile(
  options: StraightLineProjectileOptions
) {
  const { rigidBodyRef, projectileType, projectileSpeed, fireAction } = options;

  // 이펙트 스토어에서 투사체 추가 함수 가져오기
  const addEffect = useEffectStore((state) => state.addEffect);

  // 마지막 발사 시간
  const lastFireTime = useRef(0);

  // 키보드 입력 상태 확인
  const [subscribeKeys] = useKeyboardControls();

  // 시작 위치 계산
  const getStartPos = useCallback(() => {
    if (!rigidBodyRef?.current) {
      return new Vector3(0, 0, 0); // 기본 위치
    }

    const position = rigidBodyRef.current.translation();
    // 기본적으로 눈높이에서 발사하도록 y값 조정
    return new Vector3(position.x, position.y + 1, position.z);
  }, [rigidBodyRef]);

  // 발사 방향 계산
  const getFireDirection = useCallback(() => {
    if (!rigidBodyRef?.current) {
      return new Vector3(0, 0, 1); // 기본 방향
    }

    const rotation = rigidBodyRef.current.rotation();
    const quaternion = new Quaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w
    );

    // 기본 전방 방향
    const direction = new Vector3(0, 0, 1);
    direction.applyQuaternion(quaternion);

    return direction.normalize();
  }, [rigidBodyRef]);

  // 투사체 발사 함수
  const fireProjectile = useCallback(() => {
    // 쿨다운 확인 (연속 발사 방지)
    const now = Date.now();
    const cooldown = 200; // 발사 간격 (ms)
    if (now - lastFireTime.current < cooldown) return;
    lastFireTime.current = now;

    // 시작 위치 계산
    const startPos = getStartPos();

    // 발사 방향 계산
    const direction = getFireDirection();

    // 투사체 종료 위치 계산 (기본 거리 100 사용)
    const maxDistance = 100;
    const endPos = new Vector3()
      .copy(startPos)
      .addScaledVector(direction, maxDistance);

    // 이펙트 스토어를 통해 투사체 생성
    addEffect(projectileType, undefined, {
      startPosition: startPos.toArray(),
      endPosition: endPos.toArray(),
      speed: projectileSpeed,
    });
  }, [
    getStartPos,
    getFireDirection,
    addEffect,
    projectileType,
    projectileSpeed,
  ]);

  // 키 입력 구독
  useEffect(() => {
    // 발사 트리거 키 구독
    const unsubscribe = subscribeKeys(
      (state) => state[fireAction],
      (pressed) => {
        if (pressed) {
          fireProjectile();
        }
      }
    );

    return () => unsubscribe();
  }, [subscribeKeys, fireAction, fireProjectile]);

  // 외부에서 수동 발사할 수 있도록 함수 노출
  return { fireProjectile };
}
