import { useRef, forwardRef, useImperativeHandle, ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { useKeyboardControls } from "@react-three/drei";
import { Vector3, Quaternion, Euler } from "three";

interface PlayerControllerProps {
  speed?: number;
  turnSpeed?: number;
  children: ReactNode;
}

export const PlayerController = forwardRef<any, PlayerControllerProps>(
  ({ speed = 5, turnSpeed = 5, children }, ref) => {
    const playerRef = useRef(null);

    // Forward the rigid body ref to parent components
    useImperativeHandle(ref, () => playerRef.current);

    const [, getKeys] = useKeyboardControls();
    const targetRotationRef = useRef(new Euler(0, 0, 0));

    // Calculate direction from keyboard input
    const getMovementDirection = () => {
      const { forward, backward, left, right } = getKeys();

      const direction = new Vector3(0, 0, 0);

      if (forward) direction.z -= 1;
      if (backward) direction.z += 1;
      if (left) direction.x -= 1;
      if (right) direction.x += 1;

      return direction.normalize();
    };

    // Update player movement and rotation
    useFrame((state, delta) => {
      if (!playerRef.current) return;

      const rigidBody = playerRef.current;
      const direction = getMovementDirection();

      // Only update rotation if we're moving
      if (direction.length() > 0) {
        // Calculate target rotation
        const angle = Math.atan2(direction.x, direction.z);
        targetRotationRef.current.y = angle;

        // Get current rotation
        const currentRotation = rigidBody.rotation();
        const currentQuat = new Quaternion(
          currentRotation.x,
          currentRotation.y,
          currentRotation.z,
          currentRotation.w
        );

        // Create target quaternion
        const targetQuat = new Quaternion();
        targetQuat.setFromEuler(targetRotationRef.current);

        // Smoothly interpolate rotation
        currentQuat.slerp(targetQuat, turnSpeed * delta);

        // Apply rotation
        rigidBody.setRotation(currentQuat, true);

        // Apply movement
        const velocity = direction.multiplyScalar(speed);
        rigidBody.setLinvel({ x: velocity.x, y: 0, z: velocity.z }, true);
      } else {
        // Stop moving if no input
        rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    });

    return (
      <RigidBody
        ref={playerRef}
        position={[0, 1, 0]}
        type="dynamic"
        lockRotations={false}
        enabledRotations={[false, true, false]}
        linearDamping={0.9}
        angularDamping={0.9}
      >
        {children}
      </RigidBody>
    );
  }
);
