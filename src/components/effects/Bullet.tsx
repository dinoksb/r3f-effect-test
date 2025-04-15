import * as THREE from "three";
import React, {
  useRef,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useFrame } from "@react-three/fiber";
import { CollisionBitmask } from "../../constants/collisionGroups";
import { RigidBodyCollisionSystem } from "../../utils/rigidbodyCollisionSystem";
import { RigidBody, CuboidCollider } from "@react-three/rapier";

const DEFAULT_SIZE = new THREE.Vector3(0.5, 0.5, 1);
const DEFAULT_MEMBERSHIP_COLLISION_GROUP = CollisionBitmask.Projectile;
const DEFAULT_EXCLUDE_COLLISION_GROUP = CollisionBitmask.Player;

export interface BulletProps {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  duration: number;
  onHit?: (other?: unknown, pos?: THREE.Vector3) => void;
  onComplete?: () => void;
}

const createCollisionGroups = () => {
  return RigidBodyCollisionSystem.setupRigidBodyCollisionGroups(
    DEFAULT_MEMBERSHIP_COLLISION_GROUP,
    DEFAULT_EXCLUDE_COLLISION_GROUP
  );
};

export const Bullet: React.FC<BulletProps> = ({
  startPosition,
  direction,
  speed,
  duration,
  onHit,
  onComplete,
}) => {
  const [active, setActive] = useState(true);
  const rigidRef = useRef(null);
  const timeRef = useRef(0);
  const normalizedDirection = direction.clone().normalize();
  const bulletGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: "orange" });
  const onCompleteRef = useRef(onComplete);

  // 생성 시간 기록
  const startTime = useRef(Date.now());

  // 총알 제거 함수
  const removeBullet = useCallback(() => {
    if (active) {
      setActive(false);
      if (onCompleteRef.current) onCompleteRef.current();
    }
  }, [active]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Reset the timer when the component mounts
    timeRef.current = 0;
    startTime.current = Date.now();
    setActive(true);

    // 지정된 duration 후에 자동으로 총알 제거
    const timer = setTimeout(() => {
      removeBullet();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, removeBullet]);

  useFrame(() => {
    if (!active || !rigidRef.current) return;

    const elapsed = Date.now() - startTime.current;
    const seconds = elapsed / 1000;

    // 새 위치 = 초기 위치 + 방향 * 속도 * 경과시간
    const currentPos = startPosition
      .clone()
      .add(normalizedDirection.clone().multiplyScalar(speed * seconds));

    // Rapier Kinematic Body 이동 업데이트
    rigidRef.current?.setNextKinematicTranslation({
      x: currentPos.x,
      y: currentPos.y,
      z: currentPos.z,
    });

    // 수명이 끝나면 소멸 (백업 체크)
    if (elapsed > duration) {
      removeBullet();
    }
  });

  // 발사 방향으로의 회전 쿼터니언 계산
  const bulletQuaternion = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normalizedDirection
    );
    return quaternion;
  }, [normalizedDirection]);

  // RigidBody를 위한 회전 & 위치 계산
  const bulletRotation = useMemo(() => {
    return new THREE.Euler().setFromQuaternion(bulletQuaternion);
  }, [bulletQuaternion]);

  // 총알의 실제 크기 계산 (기본 지오메트리 × 스케일)
  const actualBulletSize = useMemo(() => {
    return {
      x: bulletGeometry.parameters.width * DEFAULT_SIZE.x,
      y: bulletGeometry.parameters.height * DEFAULT_SIZE.y,
      z: bulletGeometry.parameters.depth * DEFAULT_SIZE.z,
    };
  }, [bulletGeometry.parameters]);

  // 총알이 삭제된 경우 렌더링하지 않음
  if (!active) return null;

  return (
    <RigidBody
      ref={rigidRef}
      type="kinematicPosition"
      position={[startPosition.x, startPosition.y, startPosition.z]}
      colliders={false}
      sensor={true}
      rotation={bulletRotation}
      onIntersectionEnter={(payload) => {
        const translation = rigidRef.current?.translation();
        const hitPosition = translation
          ? new THREE.Vector3(translation.x, translation.y, translation.z)
          : undefined;
        // 충돌 이벤트 발생
        if (onHit) onHit(payload, hitPosition);
        // 총알 제거
        removeBullet();
      }}
      gravityScale={0}
      collisionGroups={createCollisionGroups()}
    >
      {/* 총알 충돌용 CuboidCollider - 기본 지오메트리 크기와 스케일 모두 고려 */}
      <CuboidCollider
        args={[
          actualBulletSize.x / 2,
          actualBulletSize.y / 2,
          actualBulletSize.z / 2,
        ]}
      />

      <mesh
        geometry={bulletGeometry}
        material={bulletMaterial}
        scale={DEFAULT_SIZE}
      />
    </RigidBody>
  );
};
