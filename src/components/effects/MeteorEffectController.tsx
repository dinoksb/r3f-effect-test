import React, { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import { IntersectionEnterPayload, useRapier } from "@react-three/rapier";
import { Ray } from "@dimforge/rapier3d-compat";
import { Meteor } from "./Meteor";
import { AreaIndicator } from "./AreaIndicator";

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

const DEFAULT_COUNT = 1;
const DEFAULT_RADIUS = 3;
const DEFAULT_DURATION = 2000;
const DEFAULT_SPREAD = 10;
const DEFAULT_RAY_ORIGIN_Y_OFFSET = 15;

// Meteor 마법 Props
export interface MeteorEffectControllerProps {
  config: { [key: string]: PrimitiveOrArray };
  onHit?: (other: IntersectionEnterPayload, pos: THREE.Vector3) => void;
  onImpact?: (pos: THREE.Vector3) => void;
  onComplete?: () => void;
}

// Utility to convert THREE.Vector3 to array (needed for store/server)
const vecToArray = (vec: THREE.Vector3): [number, number, number] => {
  return [vec.x, vec.y, vec.z];
};

// Utility to convert Vector3 array to THREE.Vector3 (needed for rendering)
const arrayToVec = (arr?: [number, number, number]): THREE.Vector3 => {
  if (!arr) {
    console.error("Missing required config properties");
    return new THREE.Vector3();
  }
  return new THREE.Vector3(arr[0], arr[1], arr[2]);
};

export const createMeteorEffectConfig = (
  targetPosition: THREE.Vector3,
  count?: number,
  radius?: number
): { [key: string]: PrimitiveOrArray } => {
  return {
    targetPosition: vecToArray(targetPosition),
    count,
    radius,
  };
};

const parseConfig = (config: { [key: string]: any }) => {
  return {
    targetPosition: arrayToVec(
      config.targetPosition as [number, number, number]
    ),
    count: (config.count as number) || DEFAULT_COUNT,
    radius: (config.radius as number) || DEFAULT_RADIUS,
  };
};

export const MeteorEffectController: React.FC<MeteorEffectControllerProps> = ({
  config,
  onHit,
  onImpact,
  onComplete,
}) => {
  const { targetPosition, count, radius } = parseConfig(config);

  const { world } = useRapier();
  const [meteorCompleteCount, setMeteorCompleteCount] = useState(0);
  const [targetPositions, setTargetPositions] = useState<THREE.Vector3[]>([]);
  const [calculatedStartPosition, setCalculatedStartPosition] =
    useState<THREE.Vector3>();

  // 랜덤 요소를 저장할 ref - 컴포넌트 라이프사이클 동안 값이 유지됨
  const initializedRef = useRef(false);
  const randomOffsetXRef = useRef(Math.random() * 2 - 1);
  const randomOffsetZRef = useRef(Math.random() * 2 - 1);

  // Generate all meteor target positions at once based on the provided target position
  useEffect(() => {
    if (initializedRef.current) return; // 이미 초기화되었으면 다시 실행하지 않음

    // 랜덤값을 ref에서 가져와서 사용 - 리렌더링 시에도 같은 값 유지
    const randomOffsetRange = 20; // 시작 위치의 랜덤 범위
    const baseStart = new THREE.Vector3(
      targetPosition.x + randomOffsetXRef.current * randomOffsetRange,
      targetPosition.y + DEFAULT_RAY_ORIGIN_Y_OFFSET,
      targetPosition.z - 15 + randomOffsetZRef.current * randomOffsetRange
    );
    setCalculatedStartPosition(baseStart);

    const generated: THREE.Vector3[] = [];

    // 메테오가 1개일 때는 targetPosition을 그대로 사용
    if (count === 1) {
      generated.push(targetPosition.clone());
    } else {
      // 첫 번째 메테오는 항상 정확한 targetPosition
      generated.push(targetPosition.clone());

      // 각 메테오 위치에 대한 랜덤값 미리 생성 및 고정
      const randomAngles: number[] = [];
      const randomRadii: number[] = [];

      for (let i = 1; i < count; i++) {
        randomAngles[i] = Math.random() * Math.PI * 2;
        randomRadii[i] = Math.random() * DEFAULT_SPREAD;
      }

      // 나머지 메테오는 랜덤 위치에 생성 (미리 계산된 랜덤값 사용)
      for (let i = 1; i < count; i++) {
        const randomAngle = randomAngles[i];
        const randomRadius = randomRadii[i];
        const proposedTarget = new THREE.Vector3(
          targetPosition.x + Math.cos(randomAngle) * randomRadius,
          targetPosition.y,
          targetPosition.z + Math.sin(randomAngle) * randomRadius
        );

        const rayOrigin = proposedTarget
          .clone()
          .setY(proposedTarget.y + DEFAULT_RAY_ORIGIN_Y_OFFSET);
        const ray = new Ray(rayOrigin, new THREE.Vector3(0, -1, 0));
        const maxDistance = DEFAULT_RAY_ORIGIN_Y_OFFSET + 5;
        const hit = world.castRay(ray, maxDistance, true);

        if (hit) {
          console.log("Hit, using hit point");
          const rapierHit = ray.pointAt(hit.timeOfImpact);
          const groundPoint = new THREE.Vector3(
            rapierHit.x,
            rapierHit.y + 0.01,
            rapierHit.z
          );
          generated.push(groundPoint);
        } else {
          console.log("No hit, using fallback");
          const fallback = proposedTarget.clone();
          fallback.y = 0.01;
          generated.push(fallback);
        }
      }
    }

    // Set all target positions at once and mark as initialized
    setTargetPositions(generated);
    initializedRef.current = true;
  }, [count, targetPosition, world]);

  const onHandleMeteorsComplete = () => {
    setMeteorCompleteCount((prev) => prev + 1);
    onImpact?.(targetPositions[meteorCompleteCount]);
    if (meteorCompleteCount === targetPositions.length) {
      onComplete?.();
    }
  };

  if (!calculatedStartPosition || targetPositions.length === 0) return null;

  return (
    <>
      {targetPositions.map((targetPos, index) => (
        <>
          <Meteor
            key={index}
            startPosition={calculatedStartPosition}
            targetPosition={targetPos}
            radius={radius}
            duration={DEFAULT_DURATION}
            onHit={onHit}
            onImpact={onImpact}
            onComplete={onHandleMeteorsComplete}
            startDelay={100 * index + Math.random() * 100}
          />

          <AreaIndicator
            config={{
              position: vecToArray(targetPos),
              radius: radius,
              duration: DEFAULT_DURATION,
            }}
            onComplete={onHandleMeteorsComplete}
          />
        </>
      ))}
    </>
  );
};
