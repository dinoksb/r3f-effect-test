import React, { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

interface LaserProps {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;  // 정규화된 방향 벡터
  duration: number;          // 생존 시간 (밀리초)
  length?: number;           // 레이저 빔 길이
  thickness?: number;        // 레이저 빔 두께
  onHit?: (other?: unknown, pos?: THREE.Vector3) => void;  // 충돌 시 콜백
  onComplete?: () => void;
  hitInterval?: number;      // onHit 호출 간격 (밀리초)
  showDebugBox?: boolean;    // 충돌 판정 박스 시각화 여부
}

export const Laser: React.FC<LaserProps> = ({
  startPosition,
  direction,
  duration,
  length = 13,
  thickness = 1,
  onHit,
  onComplete,
  hitInterval = 500,  // 기본값 0.5초
  showDebugBox = false,
}) => {
  // Component state
  const [destroyed, setDestroyed] = useState(false);
  const startTime = useRef(Date.now());
  const { clock } = useThree();
  
  // Physics refs
  const rigidRef = useRef(null);
  
  // Visual element refs
  const beamRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const debugBoxRef = useRef<THREE.Mesh>(null);
  const startOrbRef = useRef<THREE.Mesh>(null);
  
  // Tracking state
  const endPosition = useMemo(() => new THREE.Vector3(), []);
  const collisionState = useRef({
    isColliding: false,
    lastHitTime: 0,
    collidingBodies: new Set<unknown>(),
  });
  
  // Memoized beam geometry - created once and reused
  const beamGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 8);
    geo.translate(0, 0.5, 0); // Move pivot to one end
    geo.rotateX(Math.PI / 2); // Align with Z-axis
    return geo;
  }, []);
  
  // Handle collision entry
  const handleCollisionEnter = (other: unknown) => {
    const now = Date.now();
    const state = collisionState.current;
    
    state.collidingBodies.add(other);
    
    if (!state.isColliding || (now - state.lastHitTime >= hitInterval)) {
      state.isColliding = true;
      state.lastHitTime = now;
      
      if (onHit) {
        const hitPosition = calculateHitPosition();
        onHit(other, hitPosition);
      }
    }
  };
  
  // Handle collision exit
  const handleCollisionExit = (other: unknown) => {
    const state = collisionState.current;
    state.collidingBodies.delete(other);
    
    if (state.collidingBodies.size === 0) {
      state.isColliding = false;
    }
  };
  
  // Calculate hit position (middle of laser beam)
  const calculateHitPosition = () => {
    return startPosition.clone().add(
      direction.clone().normalize().multiplyScalar(length / 2)
    );
  };
  
  // Update physics body transform
  const updatePhysicsBody = (normalizedDir: THREE.Vector3) => {
    if (!rigidRef.current) return;
    
    // Update position
    rigidRef.current.setTranslation(
      { x: startPosition.x, y: startPosition.y, z: startPosition.z },
      true
    );
    
    // Update rotation based on direction
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normalizedDir
    );
    
    rigidRef.current.setRotation(
      { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
      true
    );
  };
  
  // Calculate visual effect parameters
  const calculateVisualParams = (elapsed: number, fastPulse: number) => {
    // Fade calculation
    const fadeInDuration = 200;
    const fadeOutStart = duration - 400;
    
    const fadeInProgress = Math.min(elapsed / fadeInDuration, 1);
    const fadeOutElapsed = Math.max(elapsed - fadeOutStart, 0);
    const fadeOutProgress = Math.min(fadeOutElapsed / 400, 1);
    
    // Animation parameters
    const opacityFactor = fadeInProgress * (1 - fadeOutProgress);
    const pulseEffect = Math.sin(elapsed * 0.01) * 0.2 + 0.8;
    const flickerScale = 1 + Math.sin(fastPulse) * 0.15;
    
    return { opacityFactor, pulseEffect, flickerScale };
  };
  
  // Process continuous collisions
  const processCollisions = () => {
    const state = collisionState.current;
    const now = Date.now();
    
    if (state.isColliding && now - state.lastHitTime >= hitInterval) {
      state.lastHitTime = now;
      
      if (state.collidingBodies.size > 0 && onHit) {
        const hitPosition = calculateHitPosition();
        state.collidingBodies.forEach(body => {
          onHit(body, hitPosition);
        });
      }
    }
  };
  
  // Update beam visuals
  const updateBeamVisuals = (flickerScale: number) => {
    // Main beam
    if (beamRef.current) {
      beamRef.current.scale.x = thickness * flickerScale;
      beamRef.current.scale.y = thickness * flickerScale;
      beamRef.current.scale.z = length;
    }
    
    // Core beam
    if (coreRef.current) {
      const elapsed = Date.now() - startTime.current;
      const coreScale = (0.6 + Math.sin(elapsed * 0.04) * 0.1) * flickerScale;
      
      coreRef.current.scale.x = thickness * 0.7 * coreScale;
      coreRef.current.scale.y = thickness * 0.7 * coreScale;
      coreRef.current.scale.z = length * 0.95;
    }
    
    // Outer glow
    if (glowRef.current) {
      const fastPulse = clock.getElapsedTime() * 100;
      const glowPulse = 1 + Math.sin(fastPulse * 0.5) * 0.25;
      
      glowRef.current.scale.x = thickness * 1.5 * glowPulse;
      glowRef.current.scale.y = thickness * 1.5 * glowPulse;
      glowRef.current.scale.z = length * 1.05;
    }
  };
  
  // Update decorative elements
  const updateDecorations = (
    elapsed: number, 
    fastPulse: number, 
    flickerScale: number, 
    opacityFactor: number
  ) => {
    // Start orb
    if (startOrbRef.current) {
      const orbScale = thickness * 1.2 * (1 + Math.sin(elapsed * 0.01) * 0.3) * flickerScale;
      startOrbRef.current.scale.set(orbScale, orbScale, orbScale);
      
      startOrbRef.current.rotation.x = elapsed * 0.002;
      startOrbRef.current.rotation.y = elapsed * 0.0025;
      startOrbRef.current.rotation.z = elapsed * 0.0015;
      
      updateMaterialOpacity(
        startOrbRef.current.material as THREE.MeshBasicMaterial,
        opacityFactor * (0.7 + Math.sin(fastPulse * 0.5) * 0.3)
      );
    }
  };
  
  // Update debug box
  const updateDebugBox = (elapsed: number) => {
    if (!showDebugBox || !debugBoxRef.current) return;
    
    debugBoxRef.current.scale.set(thickness * 2, thickness * 2, length);
    
    updateMaterialOpacity(
      debugBoxRef.current.material as THREE.MeshBasicMaterial,
      0.3 + Math.sin(elapsed * 0.005) * 0.1
    );
  };
  
  // Update material opacity helper
  const updateMaterialOpacity = (material: THREE.MeshBasicMaterial, opacity: number) => {
    if (!material) return;
    
    material.opacity = opacity;
    material.needsUpdate = true;
  };
  
  // Update all material opacities
  const updateMaterials = (opacityFactor: number, pulseEffect: number, fastPulse: number) => {
    const beamMat = beamRef.current?.material as THREE.MeshBasicMaterial;
    const coreMat = coreRef.current?.material as THREE.MeshBasicMaterial;
    const glowMat = glowRef.current?.material as THREE.MeshBasicMaterial;
    
    if (beamMat) {
      beamMat.opacity = 0.7 * opacityFactor * (1 + Math.sin(fastPulse * 0.3) * 0.1);
      beamMat.needsUpdate = true;
    }
    
    if (coreMat) {
      coreMat.opacity = 0.9 * opacityFactor * (1 + Math.sin(fastPulse * 0.4) * 0.1);
      coreMat.needsUpdate = true;
    }
    
    if (glowMat) {
      glowMat.opacity = 0.5 * opacityFactor * (pulseEffect + Math.sin(fastPulse * 0.2) * 0.2);
      glowMat.needsUpdate = true;
    }
  };
  
  // Update light intensity
  const updateLight = (opacityFactor: number, pulseEffect: number, fastPulse: number) => {
    if (!lightRef.current) return;
    
    lightRef.current.intensity = 3 * opacityFactor * (pulseEffect + Math.sin(fastPulse * 0.5) * 0.2);
  };
  
  // Main animation loop
  useFrame(() => {
    if (destroyed) return;

    const elapsed = Date.now() - startTime.current;
    const fastPulse = clock.getElapsedTime() * 100;
    const normalizedDir = direction.clone().normalize();
    
    // Update end position
    endPosition.copy(startPosition).add(
      normalizedDir.clone().multiplyScalar(length)
    );
    
    // Process collisions
    processCollisions();
    
    // Update physics body
    updatePhysicsBody(normalizedDir);
    
    // Calculate visual parameters
    const { opacityFactor, pulseEffect, flickerScale } = calculateVisualParams(elapsed, fastPulse);
    
    // Update visual elements
    updateBeamVisuals(flickerScale);
    updateDecorations(elapsed, fastPulse, flickerScale, opacityFactor);
    updateDebugBox(elapsed);
    updateMaterials(opacityFactor, pulseEffect, fastPulse);
    updateLight(opacityFactor, pulseEffect, fastPulse);
    
    // Check lifetime
    if (elapsed > duration) {
      setDestroyed(true);
      onComplete?.();
    }
  });
  
  // Early return when destroyed
  if (destroyed) return null;

  // Calculate initial rotation
  const initialRotation = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      direction.clone().normalize()
    )
  );

  return (
    <RigidBody
      ref={rigidRef}
      type="kinematicPosition"
      colliders={false}
      sensor={true}
      onIntersectionEnter={handleCollisionEnter}
      onIntersectionExit={handleCollisionExit}
      position={[startPosition.x, startPosition.y, startPosition.z]}
      rotation={initialRotation}
      gravityScale={0}
    >
      <CuboidCollider 
        args={[thickness, thickness, length / 2]} 
        position={[0, 0, length / 2]} 
      />

      {showDebugBox && (
        <mesh ref={debugBoxRef} position={[0, 0, length / 2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial 
            color="#ff00ff" 
            transparent
            opacity={0.3} 
            wireframe
          />
        </mesh>
      )}

      <mesh ref={startOrbRef} position={[0, 0, 0]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          color="#d580ff"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      <mesh ref={beamRef} scale={[thickness, thickness, length]}>
        <primitive object={beamGeometry} />
        <meshBasicMaterial
          color="#8a2be2"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={coreRef} scale={[thickness * 0.7, thickness * 0.7, length * 0.95]}>
        <primitive object={beamGeometry} />
        <meshBasicMaterial
          color="#e0b0ff"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={glowRef} scale={[thickness * 1.5, thickness * 1.5, length * 1.05]}>
        <primitive object={beamGeometry} />
        <meshBasicMaterial
          color="#b060ff"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <pointLight
        ref={lightRef}
        position={[0, 0, length]}
        color="#b060ff"
        intensity={3}
        distance={8}
        decay={2}
      />
    </RigidBody>
  );
}; 