import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Experience } from "./Experience";
import WebGLVersionChecker from "../../WebGLVersionChecker";
import { EffectContainer } from "../EffectContainer";
import { Physics } from "@react-three/rapier";

/**
 * Main game scene component
 *
 * This component is responsible for setting up the 3D environment
 * including physics, lighting, and scene elements.
 */
export const GameScene: React.FC = () => {
  return (
    <>
      <Canvas
        shadows
        onPointerDown={(e) => {
          (e.target as HTMLCanvasElement).requestPointerLock();
        }}
      >
        <Physics debug={false}>
          <Suspense fallback={null}>
            <Experience />
            <WebGLVersionChecker />
            <EffectContainer />
          </Suspense>
        </Physics>
      </Canvas>
    </>
  );
};
