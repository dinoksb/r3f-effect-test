import { useRef, useState, useEffect, useCallback } from 'react';
import { Physics } from '@react-three/rapier';
import { Environment, Grid, KeyboardControls } from '@react-three/drei';
import { CharacterState } from '../../constants/character';
import { keyboardMap } from '../../constants/controls';
import { Player, PlayerRef } from './Player';
import { Floor } from './Floor';
import { RandomBoxes } from './RandomBoxes';
import * as THREE from 'three';
import { ControllerHandle, FreeViewController } from 'vibe-starter-3d';
import { LaserEffectController } from './LaserEffectController';
import { FireBallEffectController } from './FireBallEffectController';

// Define type for active effect state (same as in Player previously)
interface ActiveEffect {
  key: number;
  direction: THREE.Vector3;
  startPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  sourceRef?: React.RefObject<PlayerRef>; // 레이저 소스 참조 (플레이어)
}

export function Experience() {
  const controllerRef = useRef<ControllerHandle>(null);
  const playerRef = useRef<PlayerRef>(null);
  const targetHeight = 1.6;

  // State for active lightning effects, managed here
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const effectKeyCounter = useRef(0);

  /**
   * Delay physics activate
   */
  const [pausedPhysics, setPausedPhysics] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPausedPhysics(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (playerRef.current) {
      const boundingBox = playerRef.current.boundingBox;
      const size = playerRef.current.size;

      if (boundingBox && size) {
        console.log('Character size information updated:', {
          boundingBox,
          size,
        });
      }
    }
  }, [playerRef.current?.boundingBox, playerRef.current?.size]);

  // Callback for Player to request a magic cast
  const handleCastMagic = useCallback((direction: THREE.Vector3, startPosition: THREE.Vector3, targetPosition: THREE.Vector3) => {
    console.log('Experience received cast request at:', targetPosition);
    const newKey = effectKeyCounter.current++;
    
    // sourceRef에 playerRef 추가하여 위치와 방향을 동적으로 얻을 수 있도록 함
    setActiveEffects((prev) => [...prev, { 
      key: newKey, 
      direction: direction, 
      startPosition: startPosition, 
      targetPosition: targetPosition,
      sourceRef: playerRef // 플레이어 참조 전달
    }]);
  }, []); // No dependencies needed as it only uses refs and setters

  // Callback to remove completed effects
  const handleMagicEffectComplete = useCallback((keyToRemove: number) => {
    console.log(`Experience removing effect ${keyToRemove}`);
    setActiveEffects((prevEffects) => prevEffects.filter((effect) => effect.key !== keyToRemove));
  }, []);

  // 플레이어의 최신 포지션을 가져오는 함수
  const getPlayerPosition = useCallback(() => {
    if (!playerRef.current || !controllerRef.current?.rigidBodyRef?.current) return new THREE.Vector3();
    
    const position = controllerRef.current.rigidBodyRef.current.translation();
    return new THREE.Vector3(position.x, position.y, position.z);
  }, []);

  // 플레이어의 최신 방향을 가져오는 함수
  const getPlayerDirection = useCallback(() => {
    if (!playerRef.current || !controllerRef.current?.rigidBodyRef?.current) return new THREE.Vector3(0, 0, 1);
    
    const rigidBody = controllerRef.current.rigidBodyRef.current;
    const rotation = rigidBody.rotation(); // Quaternion
    const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    return new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
  }, []);

  return (
    <>
      {/* Grid */}
      <Grid
        args={[100, 100]}
        position={[0, 0.01, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9f9f9f"
        fadeDistance={100}
        fadeStrength={1}
        userData={{ camExcludeCollision: true }} // this won't be collide by camera ray
      />

      <ambientLight intensity={0.7} />

      <Physics debug={false} paused={pausedPhysics}>
        {/* Keyboard preset */}
        <KeyboardControls map={keyboardMap}>
          {/* Environment */}
          <Environment preset="night" background={true} />

          {/* player character with controller */}
          <FreeViewController
            ref={controllerRef}
            targetHeight={targetHeight}
            camInitDis={-10}
            camMinDis={-10}
            followLight={{
              position: [20, 30, 10],
              intensity: 1.2,
            }}
          >
            <Player ref={playerRef} initState={CharacterState.IDLE} controllerRef={controllerRef} targetHeight={targetHeight} onCastMagic={handleCastMagic} />
          </FreeViewController>
        </KeyboardControls>

        {/* RandomBoxes */}
        <RandomBoxes count={20} range={10} />

        {/* Floor */}
        <Floor />
        {/* Render active lightning effects at the scene level */}
        {activeEffects.map((effect) => (
        // <FireBallEffectController 
        //   key={effect.key} 
        //   startPosition={effect.startPosition} 
        //   direction={effect.direction}
        //   onComplete={() => handleMagicEffectComplete(effect.key)} 
        //   />
          <LaserEffectController 
            key={effect.key} 
            startPosition={effect.startPosition} 
            direction={effect.direction}
            getLatestPosition={getPlayerPosition}
            getLatestDirection={getPlayerDirection}
            onComplete={() => handleMagicEffectComplete(effect.key)} 
          />
        ))}
      </Physics>
    </>
  );
}
