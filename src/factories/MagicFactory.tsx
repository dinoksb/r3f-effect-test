import React from "react";
import {
  MagicType,
  FireBallProps,
  LaserProps,
  LightningProps,
  MeteorProps,
  PoisonSwampProps,
} from "../types/magic";
import { FireBallEffectController } from "../components/effects/FireBallEffectController";
import { LaserEffectController } from "../components/effects/LaserEffectController";
import { LightningEffectController } from "../components/effects/LightningEffectController";
import { MeteorEffectController } from "../components/effects/MeteorEffectController";
import { PoisonSwampEffectController } from "../components/effects/PoisonSwampEffectController";
import * as THREE from "three";

// 공통 props (모든 마법 타입이 공유)
type CommonProps = {
  key?: number | string;
  onHit?: (other?: unknown, pos?: THREE.Vector3) => void;
  onComplete?: () => void;
  debug?: boolean;
};

// 방향성 마법 전용 props
type DirectionalProps = CommonProps & {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;
};

// 위치 타겟팅 마법 전용 props
type TargetPositionProps = CommonProps & {
  targetPosition: THREE.Vector3;
};

// 타입별 필수 props 정의
type FireBallFactoryProps = DirectionalProps & {
  type: MagicType.FireBall;
};

type LaserFactoryProps = DirectionalProps & {
  type: MagicType.Laser;
  getLatestPosition?: () => THREE.Vector3;
  getLatestDirection?: () => THREE.Vector3;
};

type LightningFactoryProps = TargetPositionProps & {
  type: MagicType.Lightning;
};

type MeteorFactoryProps = TargetPositionProps & {
  type: MagicType.Meteor;
};

type PoisonSwampFactoryProps = TargetPositionProps & {
  type: MagicType.PoisonSwamp;
};

// Union 타입으로 MagicFactoryProps 정의
export type MagicFactoryProps =
  | FireBallFactoryProps
  | LaserFactoryProps
  | LightningFactoryProps
  | MeteorFactoryProps
  | PoisonSwampFactoryProps;

// 상수값 정의 (마법별 기본값)
const MAGIC_CONSTANTS = {
  FIREBALL: {
    SPEED: 10,
    DURATION: 2000,
  },
  LASER: {
    DURATION: 2000,
    LENGTH: 15,
    THICKNESS: 0.3,
    HIT_INTERVAL: 500,
  },
  METEOR: {
    COUNT: 5,
  },
};

/**
 * 마법 이펙트를 렌더링하는 컴포넌트
 * Experience.tsx에서 <MagicFactory /> 형태로 사용 가능
 */
export const MagicFactory: React.FC<MagicFactoryProps> = (props) => {
  const { type } = props;

  switch (type) {
    case MagicType.FireBall:
      return createFireBall(props);
    case MagicType.Laser:
      return createLaser(props);
    case MagicType.Lightning:
      return createLightning(props);
    case MagicType.Meteor:
      return createMeteor(props);
    case MagicType.PoisonSwamp:
      return createPoisonSwamp(props);
    default:
      console.warn(`[MagicFactory] Unknown magic type: ${type}`);
      return null;
  }
};

/**
 * FireBall 마법 렌더링 함수
 */
function createFireBall(props: FireBallFactoryProps): React.ReactNode {
  const { type, startPosition, direction, onHit, onComplete, debug } = props;

  const fireBallProps: FireBallProps = {
    type,
    startPosition,
    direction,
    speed: MAGIC_CONSTANTS.FIREBALL.SPEED,
    duration: MAGIC_CONSTANTS.FIREBALL.DURATION,
    onHit,
    onComplete,
    debug,
  };

  return <FireBallEffectController {...fireBallProps} />;
}

/**
 * Laser 마법 렌더링 함수
 */
function createLaser(props: LaserFactoryProps): React.ReactNode {
  const {
    type,
    startPosition,
    direction,
    getLatestPosition,
    getLatestDirection,
    onHit,
    onComplete,
    debug,
  } = props;

  const laserProps: LaserProps = {
    type,
    startPosition,
    direction,
    duration: MAGIC_CONSTANTS.LASER.DURATION,
    length: MAGIC_CONSTANTS.LASER.LENGTH,
    thickness: MAGIC_CONSTANTS.LASER.THICKNESS,
    hitInterval: MAGIC_CONSTANTS.LASER.HIT_INTERVAL,
    getLatestPosition,
    getLatestDirection,
    onHit,
    onComplete,
    debug,
  };

  return <LaserEffectController {...laserProps} />;
}

/**
 * Lightning 마법 렌더링 함수
 */
function createLightning(props: LightningFactoryProps): React.ReactNode {
  const { targetPosition, onHit, onComplete, debug } = props;

  const lightningProps: LightningProps = {
    type: MagicType.Lightning,
    targetPosition,
    onHit,
    onComplete,
    debug,
  };

  return <LightningEffectController {...lightningProps} />;
}

/**
 * Meteor 마법 렌더링 함수
 */
function createMeteor(props: MeteorFactoryProps): React.ReactNode {
  const { targetPosition, onHit, onComplete, debug } = props;

  const meteorProps: MeteorProps = {
    type: MagicType.Meteor,
    targetPosition,
    count: MAGIC_CONSTANTS.METEOR.COUNT,
    onHit,
    onComplete,
    debug,
  };

  return <MeteorEffectController {...meteorProps} />;
}

/**
 * PoisonSwamp 마법 렌더링 함수
 */
function createPoisonSwamp(props: PoisonSwampFactoryProps): React.ReactNode {
  const { targetPosition, onHit, onComplete, debug } = props;

  const swampProps: PoisonSwampProps = {
    type: MagicType.PoisonSwamp,
    targetPosition,
    onHit,
    onComplete,
    debug,
  };

  return <PoisonSwampEffectController {...swampProps} />;
}
