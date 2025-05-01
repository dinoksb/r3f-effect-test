import { useCallback, useRef, useMemo } from "react";
import { Vector3, Raycaster, Vector2 } from "three";
import { useThree } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { InteractionGroups } from "@dimforge/rapier3d-compat";

/**
 * 마우스 클릭 위치를 3D 공간 상의 좌표로 변환하는 훅
 * Rapier 물리 엔진을 사용하여 지형과의 정확한 교차점을 계산
 */
export function useMousePosition() {
  // Three.js 훅에서 카메라와 화면 크기 가져오기
  const { camera, size } = useThree();

  // Rapier 물리 엔진 접근
  const { rapier, world } = useRapier();

  // 레이캐스터 생성
  const raycaster = useRef(new Raycaster());

  // 마우스 포인터 위치 추적
  const pointerPositionRef = useRef(new Vector2(0, 0));

  // 자주 사용하는 값 메모이제이션
  const maxDistance = useMemo(() => 100, []);

  /**
   * 마우스 클릭 위치를 3D 공간 상의 좌표로 변환
   * @param collisionGroups 충돌 그룹
   * @returns 클릭한 3D 위치, 교차점이 없으면 null
   */
  const getMouseWorldPosition = useCallback(
    (collisionGroups?: InteractionGroups): Vector3 | null => {
      // 정규화된 마우스 좌표 계산 (-1부터 1까지)
      const normalizedPosition = new Vector2(
        (pointerPositionRef.current.x / size.width) * 2 - 1,
        -(pointerPositionRef.current.y / size.height) * 2 + 1
      );

      // 레이캐스터 업데이트
      raycaster.current.setFromCamera(normalizedPosition, camera);

      // 레이의 출발점과 방향 벡터
      const rayOrigin = new Vector3();
      camera.getWorldPosition(rayOrigin);

      const rayDirection = new Vector3();
      rayDirection.copy(raycaster.current.ray.direction).normalize();

      // Rapier 물리 레이캐스트 수행
      if (rapier && world) {
        try {
          // Rapier Ray 객체 생성
          const raycastOrigin = {
            x: rayOrigin.x,
            y: rayOrigin.y,
            z: rayOrigin.z,
          };
          const raycastDir = {
            x: rayDirection.x,
            y: rayDirection.y,
            z: rayDirection.z,
          };

          // 물리 레이캐스트 쿼리 실행
          const ray = new rapier.Ray(raycastOrigin, raycastDir);

          console.log("collisionGroups", collisionGroups);
          // 모든 충돌체와 교차점 검사 (충돌 그룹이 지정되지 않은 경우)
          const hit = world.castRay(
            ray,
            maxDistance,
            true, // solid 객체만
            undefined, // 첫 번째 교차점만
            collisionGroups || undefined // 충돌 그룹 (없으면 모든 그룹)
          );

          if (
            hit &&
            hit.timeOfImpact !== undefined &&
            hit.timeOfImpact < maxDistance
          ) {
            // 교차 거리만큼 레이 방향으로 이동하여 교차점 계산
            return new Vector3(
              rayOrigin.x + rayDirection.x * hit.timeOfImpact,
              rayOrigin.y + rayDirection.y * hit.timeOfImpact,
              rayOrigin.z + rayDirection.z * hit.timeOfImpact
            );
          } else {
            console.log("No hit");
          }
        } catch (error) {
          console.error("Physics raycast error:", error);
          // 에러 발생 시 폴백
        }
      }

      // 교차점을 찾지 못하면 null 반환
      return null;
    },
    [camera, size, rapier, world, maxDistance]
  );

  /**
   * 마우스 이벤트 처리를 위한 이벤트 핸들러를 등록하고 클릭 위치를 반환하는 함수
   * @param mouseButton 감지할 마우스 버튼 (0: 좌클릭, 1: 휠, 2: 우클릭)
   * @param collisionGroups 충돌 그룹
   */
  const useMouseClick = useCallback(
    (mouseButton: number = 0, collisionGroups?: InteractionGroups) => {
      const handlePointerMove = (event: PointerEvent) => {
        pointerPositionRef.current.set(event.clientX, event.clientY);
      };

      // 구독 함수 - 인자로 받은 콜백을 클릭 시 호출
      const subscribe = (onClick: (position: Vector3 | null) => void) => {
        const handleClick = (event: PointerEvent) => {
          if (event.button === mouseButton) {
            const worldPosition = getMouseWorldPosition(collisionGroups);
            onClick(worldPosition);
          }
        };

        // 이벤트 리스너 등록
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerdown", handleClick);

        // 이벤트 리스너 해제 함수 반환
        return () => {
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerdown", handleClick);
        };
      };

      // 현재 포인터 위치에 해당하는 월드 좌표 계산 (실시간)
      const getCurrentPosition = () => getMouseWorldPosition(collisionGroups);

      return {
        subscribe,
        getCurrentPosition, // 현재 포인터 위치 (실시간)
      };
    },
    [getMouseWorldPosition]
  );

  return {
    useMouseClick,
    getMouseWorldPosition,
  };
}
