import { RigidBody } from "@react-three/rapier";
import { CollisionBitmask } from "../../constants/collisionGroups";
import { RigidBodyCollisionSystem } from "../../utils/rigidbodyCollisionSystem";

export function Floor() {
  return (
    <RigidBody
      type="fixed"
      colliders="trimesh"
      collisionGroups={RigidBodyCollisionSystem.setupRigidBodyCollisionGroups(
        CollisionBitmask.Ground
      )}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry name="floor-geometry" args={[100, 100]} />
        <meshStandardMaterial color="#3f3f3f" />
      </mesh>
    </RigidBody>
  );
}
