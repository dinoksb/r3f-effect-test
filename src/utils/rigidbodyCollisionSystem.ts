import * as THREE from "three";
import { CollisionBitmask } from "../constants/collisionGroups";

/**
 * 통합 충돌 시스템:
 * 1. Three.js의 레이캐스팅 기반 충돌 감지
 * 2. Rapier 물리 엔진 기반 충돌 감지
 * 두 방식 모두를 지원하여 일관된 API를 제공
 */
export class RigidBodyCollisionSystem {
  /**
   * 특정 오브젝트가 특정 충돌 그룹에 속하는지 확인
   *
   * @param object Three.js 오브젝트
   * @param collisionGroup 확인할 충돌 그룹
   */
  static isInCollisionGroup(
    object: THREE.Object3D,
    collisionGroup: CollisionBitmask
  ): boolean {
    return object.userData.collisionGroup === collisionGroup;
  }

  static setupRigidBodyCollisionGroups(
    memberships: number | number[] | null | undefined,
    excludeFilter?: number | number[] | null
  ): number {
    // 입력값(숫자, 배열, null/undefined)을 처리하여 단일 비트마스크로 반환하는 헬퍼 함수
    const processInput = (
      input: number | number[] | null | undefined
    ): number => {
      if (Array.isArray(input)) {
        return input.reduce((acc, val) => acc | Number(val), 0);
      } else if (typeof input === "number") {
        return input;
      }
      return 0;
    };

    const combinedMemberships = processInput(memberships);
    const combinedExcludeFilter = processInput(excludeFilter);

    const allInteractionGroupsMask = 0xffff;
    const filter = allInteractionGroupsMask & ~combinedExcludeFilter;

    return (combinedMemberships << 16) | filter;
  }
}
