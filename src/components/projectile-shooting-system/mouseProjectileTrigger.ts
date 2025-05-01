import { useCallback, useRef, useState, MutableRefObject } from "react";
import { Vector3, Raycaster, Vector2 } from "three";
import { useThree } from "@react-three/fiber";
import { RigidBody } from "@dimforge/rapier3d-compat";

/**
 * 투사체 발사를 위한 마우스 입력 처리 시스템
 * 마우스 위치를 기반으로 발사 방향 결정 및 트리거 감지 기능 제공
 */
export function useMouseProjectileTrigger(options: {
  /** 발사 트리거로 사용할 마우스 버튼 (0: 좌클릭, 1: 휠클릭, 2: 우클릭) */
  mouseButton?: number;
  /** 플레이어 RigidBody 참조 (시작 위치 계산에 사용) - 필수 */
  playerRigidBodyRef: MutableRefObject<RigidBody | null>;
  /** 지면 위 높이 (기본값 1.5) */
  heightAboveGround?: number;
  /** 최대 발사 거리 */
  maxDistance?: number;
}) {
  const {
    mouseButton = 0, // 기본값은 좌클릭
    playerRigidBodyRef,
    heightAboveGround,
    maxDistance = 100,
  } = options;

  // Three.js 훅에서 카메라와 화면 크기 가져오기
  const { camera, size } = useThree();

  // 레이캐스터 생성
  const raycaster = useRef(new Raycaster());

  // 마우스 포인터 위치 추적
  const pointerPositionRef = useRef(new Vector2(0, 0));
  const [isMouseDown, setIsMouseDown] = useState(false);
  const lastTriggerTimeRef = useRef(0);

  // 마지막 계산된 방향 캐싱
  const lastDirectionRef = useRef(new Vector3(0, 0, -1));

  /**
   * 마우스 위치 기반 발사 방향 벡터 계산
   */
  const getFireDirection = useCallback(() => {
    // playerRigidBodyRef가 없으면 기본 방향 반환
    if (!playerRigidBodyRef?.current) {
      return lastDirectionRef.current.clone();
    }

    // 정규화된 마우스 좌표 계산 (-1부터 1까지)
    const normalizedPosition = new Vector2(
      (pointerPositionRef.current.x / size.width) * 2 - 1,
      -(pointerPositionRef.current.y / size.height) * 2 + 1
    );

    // 레이캐스터 업데이트
    raycaster.current.setFromCamera(normalizedPosition, camera);

    // 플레이어 위치 가져오기
    const position = playerRigidBodyRef.current.translation();
    const startPosition = new Vector3(
      position.x,
      position.y + heightAboveGround,
      position.z
    );

    // 레이 방향 계산 - 정해진 거리만큼의 지점
    const endPosition = new Vector3();
    raycaster.current.ray.at(maxDistance, endPosition);

    // 시작점에서 타겟 방향을 가리키는 방향 벡터 계산
    const direction = new Vector3()
      .subVectors(endPosition, startPosition)
      .normalize();

    // 계산된 방향 캐싱
    lastDirectionRef.current.copy(direction);

    return direction;
  }, [camera, size, playerRigidBodyRef, heightAboveGround, maxDistance]);

  /**
   * 발사 트리거 이벤트를 구독
   * @param onFire 발사 시 호출할 콜백
   * @param cooldown 발사 쿨다운 (밀리초)
   * @returns 구독 해제 함수
   */
  const subscribeTrigger = useCallback(
    (onFire: (direction: Vector3) => void, cooldown: number = 0) => {
      const handlePointerMove = (event: PointerEvent) => {
        pointerPositionRef.current.set(event.clientX, event.clientY);
      };

      const handlePointerDown = (event: PointerEvent) => {
        if (event.button === mouseButton) {
          setIsMouseDown(true);

          // 쿨다운 확인
          const now = Date.now();
          if (now - lastTriggerTimeRef.current >= cooldown) {
            const direction = getFireDirection();
            onFire(direction);
            lastTriggerTimeRef.current = now;
          }
        }
      };

      const handlePointerUp = (event: PointerEvent) => {
        if (event.button === mouseButton) {
          setIsMouseDown(false);
        }
      };

      // 이벤트 리스너 등록
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerdown", handlePointerDown);
      window.addEventListener("pointerup", handlePointerUp);

      // 이벤트 리스너 해제 함수 반환
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerdown", handlePointerDown);
        window.removeEventListener("pointerup", handlePointerUp);
      };
    },
    [mouseButton, getFireDirection]
  );

  /**
   * 현재 마우스 트리거 상태 확인
   */
  const isTriggerPressed = useCallback(() => {
    return isMouseDown;
  }, [isMouseDown]);

  return {
    /** 발사 트리거 구독 (방향 정보 포함) - 클릭할 때마다 발사 */
    subscribeTrigger,
    /** 현재 발사 방향 계산 */
    getFireDirection,
    /** 마우스 버튼 눌림 상태 확인 */
    isTriggerPressed,
    /** 현재 마우스 포인터 위치 */
    pointerPosition: pointerPositionRef.current,
  };
}
