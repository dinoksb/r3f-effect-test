import React from "react";
import {
  MagicType,
  MagicFactoryProps,
  FireBallProps,
  LaserProps,
  LightningProps,
  MeteorProps,
  PoisonSwampProps,
  FireBallFactoryProps,
  LaserFactoryProps,
  LightningFactoryProps,
  MeteorFactoryProps,
  PoisonSwampFactoryProps,
} from "../types/magic";
import { FireBallEffectController } from "../components/effects/FireBallEffectController";
import { LaserEffectController } from "../components/effects/LaserEffectController";
import { LightningEffectController } from "../components/effects/LightningEffectController";
import { MeteorEffectController } from "../components/effects/MeteorEffectController";
import { PoisonSwampEffectController } from "../components/effects/PoisonSwampEffectController";

/**
 * 마법별 기본 설정값 (상수)
 */
const MAGIC_CONFIG = {
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
    DURATION: 2000,
    COUNT: 10,
  },
  POISONSWAMP: {
    DURATION: 2000,
    RADIUS: 5,
    HEIGHT: -0.5,
    OPACITY: 0.5,
    HIT_INTERVAL: 500,
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
      return createFireBall(props as FireBallFactoryProps);
    case MagicType.Laser:
      return createLaser(props as LaserFactoryProps);
    case MagicType.Lightning:
      return createLightning(props as LightningFactoryProps);
    case MagicType.Meteor:
      return createMeteor(props as MeteorFactoryProps);
    case MagicType.PoisonSwamp:
      return createPoisonSwamp(props as PoisonSwampFactoryProps);
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
    speed: MAGIC_CONFIG.FIREBALL.SPEED,
    duration: MAGIC_CONFIG.FIREBALL.DURATION,
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
    duration: MAGIC_CONFIG.LASER.DURATION,
    length: MAGIC_CONFIG.LASER.LENGTH,
    thickness: MAGIC_CONFIG.LASER.THICKNESS,
    hitInterval: MAGIC_CONFIG.LASER.HIT_INTERVAL,
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
  const { type, targetPosition, onHit, onComplete, debug } = props;

  const lightningProps: LightningProps = {
    type,
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
  const { type, targetPosition, onHit, onComplete, debug } = props;

  const meteorProps: MeteorProps = {
    type,
    targetPosition,
    count: MAGIC_CONFIG.METEOR.COUNT,
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
  const { type, targetPosition, onHit, onComplete, debug } = props;

  const swampProps: PoisonSwampProps = {
    type,
    targetPosition,
    duration: MAGIC_CONFIG.POISONSWAMP.DURATION,
    hitInterval: MAGIC_CONFIG.POISONSWAMP.HIT_INTERVAL,
    radius: MAGIC_CONFIG.POISONSWAMP.RADIUS,
    height: MAGIC_CONFIG.POISONSWAMP.HEIGHT,
    opacity: MAGIC_CONFIG.POISONSWAMP.OPACITY,
    onHit,
    onComplete,
    debug,
  };

  return <PoisonSwampEffectController {...swampProps} />;
}
