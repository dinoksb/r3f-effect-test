import * as THREE from "three";
import { CollisionGroup } from "../constants/collisionGroups";

/**
 * 통합 충돌 시스템:
 * 1. Three.js의 레이캐스팅 기반 충돌 감지
 * 2. Rapier 물리 엔진 기반 충돌 감지
 * 두 방식 모두를 지원하여 일관된 API를 제공
 */
export class CollisionSystem {
  /**
   * 오브젝트에 충돌 그룹 정보를 설정
   *
   * @param object Three.js 오브젝트
   * @param collisionGroup 충돌 그룹
   * @param excludeGroups 제외할 충돌 그룹
   */
  static setupCollisionObject(
    object: THREE.Object3D,
    collisionGroup: CollisionGroup,
    excludeGroups: CollisionGroup[] = []
  ) {
    // 1. userData에 충돌 그룹 정보 저장 (레이캐스팅 사용 시 필요)
    object.userData.collisionGroup = collisionGroup;
    object.userData.excludeCollisionGroups = excludeGroups;

    // 2. Three.js 레이어 설정 (레이캐스팅 최적화에 사용)
    // THREE.js의 레이어는 0-31까지 지원하므로 비트 위치를 계산
    const layerBit = Math.log2(collisionGroup);
    if (layerBit >= 0 && layerBit <= 31) {
      object.layers.set(layerBit);
    }

    return object;
  }

  /**
   * RigidBody 컴포넌트를 위한 충돌 그룹 값 생성
   *
   * @param collisionGroup 충돌 그룹
   * @param excludeGroups 제외할 충돌 그룹
   * @returns 생성된 충돌 그룹 값
   */
  static createRigidBodyCollisionGroups(
    collisionGroup: CollisionGroup,
    excludeGroups: CollisionGroup[] | CollisionGroup | undefined
  ): number {
    const excludeArray = Array.isArray(excludeGroups)
      ? excludeGroups
      : excludeGroups
      ? [excludeGroups]
      : [];

    return CollisionSystem.createCollisionGroups(collisionGroup, excludeArray);
  }

  /**
   * 레이캐스팅 기반 충돌 감지
   *
   * @param raycaster Three.js 레이캐스터
   * @param excludeGroups 제외할 충돌 그룹
   * @param scene Three.js 씬
   * @returns 충돌 객체 배열
   */
  static raycastCollision(
    raycaster: THREE.Raycaster,
    excludeGroups: CollisionGroup[] = [],
    scene: THREE.Scene
  ): THREE.Intersection[] {
    // 모든 비트 설정
    raycaster.layers.mask = 0xffffffff;

    // 제외 그룹 마스크 계산
    if (excludeGroups && excludeGroups.length > 0) {
      const excludeMask = excludeGroups.reduce(
        (mask, group) => mask | group,
        0
      );
      raycaster.layers.mask &= ~excludeMask;
    }

    // 레이캐스팅 수행
    const intersects = raycaster.intersectObjects(scene.children, true);

    // 충돌 그룹 필터링 (userData 기반)
    return intersects.filter((hit) => {
      if (!hit.object.userData.collisionGroup) return true;

      const objectGroup = hit.object.userData.collisionGroup;
      return !excludeGroups.includes(objectGroup as CollisionGroup);
    });
  }

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
