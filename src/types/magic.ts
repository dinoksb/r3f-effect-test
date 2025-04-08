import * as THREE from "three";

// 마법 타입 enum
export enum MagicType {
  FireBall = "fire-ball",
  Laser = "laser",
  Lightning = "lightning",
  Meteor = "meteor",
  PoisonSwamp = "poison-swamp",
}

/**
 * 공통 콜백 타입
 */
export type HitCallback = (other?: unknown, pos?: THREE.Vector3) => void;
export type CompleteCallback = () => void;

/**
 * 모든 마법 컴포넌트의 기본 Props
 */
export interface BaseMagicProps {
  type: MagicType;
  onHit?: HitCallback;
  onComplete?: CompleteCallback;
  debug?: boolean;
}

/**
 * 모든 Factory 컴포넌트의 기본 Props
 */
export interface BaseMagicFactoryProps {
  key?: React.Key;
  onHit?: HitCallback;
  onComplete?: CompleteCallback;
  debug?: boolean;
}

/**
 * ===== 마법 타입별 컴포넌트 Props =====
 */

// 방향성 마법(FireBall, Laser)의 공통 기본 Props
export interface DirectionalMagicProps extends BaseMagicProps {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;
}

// 위치 타겟팅 마법(Lightning, Meteor, PoisonSwamp)의 공통 기본 Props
export interface TargetPositionMagicProps extends BaseMagicProps {
  targetPosition: THREE.Vector3;
}

// FireBall 마법 Props
export interface FireBallProps extends DirectionalMagicProps {
  type: MagicType.FireBall;
  speed: number;
  duration: number;
}

// Laser 마법 Props
export interface LaserProps extends DirectionalMagicProps {
  type: MagicType.Laser;
  duration: number;
  length: number;
  thickness: number;
  hitInterval: number;
  getLatestPosition?: () => THREE.Vector3;
  getLatestDirection?: () => THREE.Vector3;
}

// Lightning 마법 Props
export interface LightningProps extends TargetPositionMagicProps {
  type: MagicType.Lightning;
  duration: number;
  strikeCount: number;
  spread: number;
  rayOriginYOffset: number;
}

// Meteor 마법 Props
export interface MeteorProps extends TargetPositionMagicProps {
  type: MagicType.Meteor;
  count: number;
  radius: number;
  duration: number;
  spread: number;
  rayOriginYOffset: number;
}

// PoisonSwamp 마법 Props
export interface PoisonSwampProps extends TargetPositionMagicProps {
  type: MagicType.PoisonSwamp;
  duration: number;
  hitInterval: number;
  radius: number;
  height: number;
  opacity: number;
}

/**
 * ===== 마법 타입별 Factory Props =====
 */

// 방향성 마법(FireBall, Laser)의 Factory Props
export interface DirectionalMagicFactoryProps extends BaseMagicFactoryProps {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;
}

// 위치 타겟팅 마법(Lightning, Meteor, PoisonSwamp)의 Factory Props
export interface TargetPositionMagicFactoryProps extends BaseMagicFactoryProps {
  targetPosition: THREE.Vector3;
}

// FireBall Factory Props
export interface FireBallFactoryProps extends DirectionalMagicFactoryProps {
  type: MagicType.FireBall;
}

// Laser Factory Props
export interface LaserFactoryProps extends DirectionalMagicFactoryProps {
  type: MagicType.Laser;
  getLatestPosition?: () => THREE.Vector3;
  getLatestDirection?: () => THREE.Vector3;
}

// Lightning Factory Props
export interface LightningFactoryProps extends TargetPositionMagicFactoryProps {
  type: MagicType.Lightning;
}

// Meteor Factory Props
export interface MeteorFactoryProps extends TargetPositionMagicFactoryProps {
  type: MagicType.Meteor;
}

// PoisonSwamp Factory Props
export interface PoisonSwampFactoryProps
  extends TargetPositionMagicFactoryProps {
  type: MagicType.PoisonSwamp;
}

// 모든 Magic Factory Props 타입 (MagicFactory 컴포넌트의 입력값 타입)
export type MagicFactoryProps =
  | FireBallFactoryProps
  | LaserFactoryProps
  | LightningFactoryProps
  | MeteorFactoryProps
  | PoisonSwampFactoryProps;
