import * as THREE from "three";

// 마법 타입
export enum MagicType {
  FireBall = "fire-ball",
  Laser = "laser",
  Lightning = "lightning",
  Meteor = "meteor",
  PoisonSwamp = "poison-swamp",
}

// 기본 콜백 타입 정의
export type HitCallback = (other?: unknown, pos?: THREE.Vector3) => void;
export type CompleteCallback = () => void;

// FireBall 마법 속성
export interface FireBallProps {
  type: MagicType.FireBall;
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;
  speed?: number;
  duration?: number;
  onHit?: HitCallback;
  onComplete?: CompleteCallback;
  debug?: boolean;
}

// Laser 마법 속성
export interface LaserProps {
  type: MagicType.Laser;
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;
  duration?: number;
  length?: number;
  thickness?: number;
  hitInterval?: number;
  getLatestPosition?: () => THREE.Vector3;
  getLatestDirection?: () => THREE.Vector3;
  onHit?: HitCallback;
  onComplete?: CompleteCallback;
  debug?: boolean;
}

// Lightning 마법 속성
export interface LightningProps {
  type: MagicType.Lightning;
  targetPosition: THREE.Vector3;
  onHit?: HitCallback;
  onComplete?: CompleteCallback;
  debug?: boolean;
}

// Meteor 마법 속성
export interface MeteorProps {
  type: MagicType.Meteor;
  targetPosition: THREE.Vector3;
  duration?: number;
  count?: number;
  onHit?: HitCallback;
  onComplete?: CompleteCallback;
  debug?: boolean;
}

// PoisonSwamp 마법 속성
export interface PoisonSwampProps {
  type: MagicType.PoisonSwamp;
  targetPosition: THREE.Vector3;
  duration?: number;
  onHit?: HitCallback;
  onComplete?: CompleteCallback;
  debug?: boolean;
}
