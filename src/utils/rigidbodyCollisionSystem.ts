import * as THREE from "three";
import { CollisionGroup } from "../constants/collisionGroups";

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
    collisionGroup: CollisionGroup
  ): boolean {
    return object.userData.collisionGroup === collisionGroup;
  }

  /**
   * RigidBody 컴포넌트를 위한 충돌 그룹 값 생성
   *
   * @param collisionGroup 충돌 그룹
   * @param excludeGroups 제외할 충돌 그룹
   * @returns 생성된 충돌 그룹 값
   */
  static setupRigidBodyCollisionGroups(
    collisionGroup: CollisionGroup,
    excludeGroups: CollisionGroup[] | CollisionGroup | undefined
  ): number {
    const excludeArray = Array.isArray(excludeGroups)
      ? excludeGroups
      : excludeGroups
      ? [excludeGroups]
      : [];

    return RigidBodyCollisionSystem.createCollisionGroups(
      collisionGroup,
      excludeArray
    );
  }

  /**
   * Generates a collision group bitmask for a RigidBody.
   *
   * @param membership - The group this object belongs to (one or more CollisionGroup values combined using bitwise OR).
   * @param exclude - An array of CollisionGroup values that this object should *not* collide with.
   * @returns A 32-bit integer representing the collisionGroups mask (16 bits for membership, 16 bits for filter).
   *
   * The returned mask is structured as follows:
   * - Upper 16 bits: groups this object belongs to (membership)
   * - Lower 16 bits: groups this object can collide with (filter)
   */
  private static createCollisionGroups(membership: number, exclude: number[]) {
    const ALL = 0xffff; // All 16 bits set to 1 (allow collision with all groups by default)
    const excludeMask = exclude.reduce((mask, g) => mask | g, 0); // Combine all groups to exclude
    const filter = ALL & ~excludeMask; // Remove excluded groups from filter
    return (membership << 16) | filter; // Combine membership and filter into a single bitmask
  }
}
