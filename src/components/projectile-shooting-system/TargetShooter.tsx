import React, { useRef, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { useMousePosition } from "./useMousePosition";
import { useEffectStore } from "../store/effectStore";
import { EffectType } from "../../types/effect";
import { createBulletEffectConfig } from "../effects/BulletEffectController";
import { useGameServer } from "@agent8/gameserver";
import { ControllerHandle } from "vibe-starter-3d";
import { InteractionGroups } from "@dimforge/rapier3d-compat";

interface TargetShooterProps {
  controllerRef: React.RefObject<ControllerHandle>; // 컨트롤러 참조 (필수)
  mouseButton?: number; // 마우스 버튼 (0: 좌클릭, 1: 휠, 2: 우클릭)
  targetY?: number; // 타겟팅할 Y 높이 (기본값: 플레이어 높이)
  cooldown?: number; // 발사 쿨다운 (밀리초)
  boxColor?: string; // 박스 색상
  speed?: number; // 투사체 속도
  duration?: number; // 투사체 지속 시간
  scale?: number; // 투사체 크기
  collisionGroups?: InteractionGroups; // 레이캐스트에서 제외할 충돌 그룹
}

export const TargetShooter: React.FC<TargetShooterProps> = ({
  controllerRef,
  mouseButton = 0, // 기본값은 좌클릭
  targetY, // 기본값은 아래에서 플레이어 높이로 설정
  cooldown = 200,
  boxColor = "blue",
  speed = 50,
  duration = 2000,
  scale = 1.2,
}) => {
  // 이펙트 스토어에서 이펙트 추가 함수 가져오기
  const addEffect = useEffectStore((state) => state.addEffect);

  // 계정 정보 (소유권 추적용)
  const { account } = useGameServer();

  // 쿨다운 추적
  const lastFireTime = useRef(0);
  const isCoolingDown = useRef(false);

  // 마우스 위치 훅 사용
  const { useMouseClick } = useMousePosition();

  // 플레이어의 현재 높이를 타겟 높이로 사용
  const getPlayerY = useCallback(() => {
    if (!controllerRef?.current?.rigidBodyRef?.current) return 0;
    const position = controllerRef.current.rigidBodyRef.current.translation();
    return position.y || 0;
  }, [controllerRef]);

  const defaultY = targetY !== undefined ? targetY : getPlayerY();

  // 마우스 클릭 훅 사용 - Physics 레이캐스트 사용
  const { subscribe } = useMouseClick(mouseButton, defaultY);

  // 발사 처리 함수
  const handleFire = useCallback(
    (targetPosition: Vector3 | null) => {
      // 교차점이 없으면 발사 취소
      if (!targetPosition) {
        return;
      }

      const now = Date.now();

      // 쿨다운 확인
      if (now - lastFireTime.current < cooldown) {
        return;
      }

      // 마지막 발사 시간 업데이트
      lastFireTime.current = now;
      isCoolingDown.current = true;

      // 플레이어 위치 가져오기 (시작점)
      if (!controllerRef?.current?.rigidBodyRef?.current) return;
      const position = controllerRef.current.rigidBodyRef.current.translation();

      const startPosition = new Vector3(position.x, position.y, position.z);

      // 방향 계산 (시작점에서 타겟 위치까지)
      const direction = new Vector3()
        .subVectors(targetPosition, startPosition)
        .normalize();

      // 총알 설정 계산
      const config = createBulletEffectConfig({
        startPosition,
        direction,
        speed,
        duration,
        scale,
        color: boxColor,
      });

      // 이펙트 로컬에 추가
      addEffect(EffectType.BULLET, account, config);
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

  // 클릭 이벤트 구독
  useEffect(() => {
    const unsubscribe = subscribe(handleFire);
    return unsubscribe;
  }, [subscribe, handleFire]);

  // 쿨다운 리셋 처리
  useFrame(() => {
    if (
      isCoolingDown.current &&
      Date.now() - lastFireTime.current >= cooldown
    ) {
      isCoolingDown.current = false;
    }
  });

  // 이 컴포넌트는 렌더링할 것이 없음 (기능만 제공)
  return null;
};
