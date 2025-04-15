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
  const startTime = useRef(Date.now());

  // Bullet removal function
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

    // Automatically remove bullet after the specified duration
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

    // New position = initial position + direction * speed * elapsed time
    const currentPos = startPosition
      .clone()
      .add(normalizedDirection.clone().multiplyScalar(speed * seconds));

    // Update Rapier Kinematic Body movement
    rigidRef.current?.setNextKinematicTranslation({
      x: currentPos.x,
      y: currentPos.y,
      z: currentPos.z,
    });

    // Destroy when lifetime ends (backup check)
    if (elapsed > duration) {
      removeBullet();
    }
  });

  // Calculate rotation quaternion in the firing direction
  const bulletQuaternion = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normalizedDirection
    );
    return quaternion;
  }, [normalizedDirection]);

  // Calculate rotation & position for RigidBody
  const bulletRotation = useMemo(() => {
    return new THREE.Euler().setFromQuaternion(bulletQuaternion);
  }, [bulletQuaternion]);

  // Calculate actual bullet size (base geometry × scale)
  const actualBulletSize = useMemo(() => {
    return {
      x: bulletGeometry.parameters.width * DEFAULT_SIZE.x,
      y: bulletGeometry.parameters.height * DEFAULT_SIZE.y,
      z: bulletGeometry.parameters.depth * DEFAULT_SIZE.z,
    };
  }, [bulletGeometry.parameters]);

  // Don't render if the bullet has been removed
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
        // Collision event triggered
        if (onHit) onHit(payload, hitPosition);
        // Remove bullet
        removeBullet();
      }}
      gravityScale={0}
      collisionGroups={createCollisionGroups()}
    >
      {/* CuboidCollider for bullet collision - considers both base geometry size and scale */}
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
