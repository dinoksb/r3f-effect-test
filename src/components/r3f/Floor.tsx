import { RigidBody } from "@react-three/rapier";
import {} from "../../constants/collisionGroups";

export function Floor() {
  return (
    <RigidBody
      type="fixed"
      colliders="trimesh"
      // collisionGroups={createCollisionGroup(
      //   CollisionGroup.Ground,
      //   CollisionGroup.Projectile
      // )}
      // collisionGroups={interactionGroups(CollisionGroup.Ground, [
      //   CollisionGroup.Player,
      //   CollisionGroup.Box,
      // ])}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry name="floor-geometry" args={[100, 100]} />
        <meshStandardMaterial color="#3f3f3f" />
      </mesh>
    </RigidBody>
  );
}
