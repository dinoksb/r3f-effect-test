import React, { useMemo } from "react";
import * as THREE from "three";
import { Box } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import {
  CollisionGroup,
  createCollisionGroups,
} from "../../constants/collisionGroups";
// import {
//   CollisionGroup,
//   createCollisionGroup,
// } from "../../constants/collisionGroups";

type RandomBoxProps = {
  count?: number;
  range?: number;
};

export const RandomBoxes: React.FC<RandomBoxProps> = ({
  count = 10,
  range = 5,
}) => {
  const positions = useMemo(() => {
    return Array.from({ length: count }, () => {
      return new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(range * 2),
        THREE.MathUtils.randFloatSpread(range * 2) + 5, // Y 위치는 위에 배치해서 낙하 가능
        THREE.MathUtils.randFloatSpread(range * 2)
      );
    });
  }, [count, range]);

  return (
    <>
      {positions.map((pos, index) => (
        <RigidBody
          name={`box-${index}`}
          key={index}
          type="dynamic"
          colliders="cuboid"
          collisionGroups={createCollisionGroups(CollisionGroup.Box, [])}
        >
          <Box position={pos.toArray()} args={[1, 1, 1]} scale={[1, 3, 1]}>
            <meshStandardMaterial attach="material" color="orange" />
          </Box>
        </RigidBody>
      ))}
    </>
  );
};
