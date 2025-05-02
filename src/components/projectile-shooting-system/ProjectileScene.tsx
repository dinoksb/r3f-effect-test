import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  KeyboardControls,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { KEYBOARD_CONTROLS, ProjectileDemo } from "./ProjectileDemo";

export function ProjectileScene() {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <KeyboardControls map={KEYBOARD_CONTROLS}>
        <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
          <Suspense fallback={null}>
            <color attach="background" args={["#050505"]} />

            <ambientLight intensity={0.3} />
            <directionalLight
              castShadow
              position={[5, 10, 5]}
              intensity={1}
              shadow-mapSize={1024}
            />

            <Environment preset="city" />
            <ContactShadows
              opacity={0.5}
              scale={10}
              blur={1}
              far={10}
              resolution={256}
              position={[0, -0.01, 0]}
            />

            <Physics debug>
              <ProjectileDemo />

              {[...Array(5)].map((_, i) => (
                <group
                  key={i}
                  position={[Math.sin(i * 1.5) * 8, 0, Math.cos(i * 1.5) * 8]}
                >
                  <mesh castShadow position={[0, 1.5, 0]}>
                    <boxGeometry args={[1, 3, 1]} />
                    <meshStandardMaterial color={`hsl(${i * 50}, 70%, 50%)`} />
                  </mesh>
                </group>
              ))}
            </Physics>

            <OrbitControls
              target={[0, 1, 0]}
              minPolarAngle={0.2}
              maxPolarAngle={1.5}
              enableDamping
            />
          </Suspense>
        </Canvas>
      </KeyboardControls>

      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          color: "white",
          backgroundColor: "rgba(0,0,0,0.7)",
          padding: "15px",
          borderRadius: "5px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0" }}>Controls</h3>
        <p style={{ margin: "5px 0" }}>WASD / Arrow Keys: Move</p>
        <p style={{ margin: "5px 0" }}>F: Shoot Projectile</p>
      </div>
    </div>
  );
}
