import React from "react";
import {
  FireBallEffectController,
  FireBallEffectProps,
} from "../components/effects/FireBallEffectController";
import {
  LaserEffectController,
  LaserEffectProps,
} from "../components/effects/LaserEffectController";
import {
  LightningEffectController,
  LightningEffectProps,
} from "../components/effects/LightningEffectController";
import {
  MeteorEffectController,
  MeteorEffectProps,
} from "../components/effects/MeteorEffectController";
import {
  PoisonSwampEffectController,
  PoisonSwampEffectProps,
} from "../components/effects/PoisonSwampEffectController";
import { EffectType } from "../types/effect";
import {
  AreaIndicatorEffectController,
  AreaIndicatorEffectProps,
} from "../components/effects/AreaIndicatorEffectController";
import {
  BulletEffectProps,
  BulletEffectController,
} from "../components/effects/BulletEffectController";
import {
  DustEffectController,
  DustEffectProps,
} from "../components/effects/DustEffectController";

export type EffectProps =
  | FireBallEffectProps
  | LaserEffectProps
  | LightningEffectProps
  | MeteorEffectProps
  | PoisonSwampEffectProps
  | AreaIndicatorEffectProps
  | BulletEffectProps
  | DustEffectProps;

export const MagicComponentMap = {
  [EffectType.FireBall]: FireBallEffectController,
  [EffectType.Laser]: LaserEffectController,
  [EffectType.Lightning]: LightningEffectController,
  [EffectType.Meteor]: MeteorEffectController,
  [EffectType.PoisonSwamp]: PoisonSwampEffectController,
  [EffectType.AreaIndicator]: AreaIndicatorEffectController,
  [EffectType.Bullet]: BulletEffectController,
  [EffectType.Dust]: DustEffectController,
} as const;

export class EffectFactory {
  static create(props: EffectProps): JSX.Element {
    switch (props.type) {
      case EffectType.FireBall:
        return <FireBallEffectController {...props} />;
      case EffectType.Laser:
        return <LaserEffectController {...props} />;
      case EffectType.Lightning:
        return <LightningEffectController {...props} />;
      case EffectType.Meteor:
        return <MeteorEffectController {...props} />;
      case EffectType.PoisonSwamp:
        return <PoisonSwampEffectController {...props} />;
      case EffectType.AreaIndicator:
        return <AreaIndicatorEffectController {...props} />;
      case EffectType.Bullet:
        return <BulletEffectController {...props} />;
      case EffectType.Dust:
        return <DustEffectController {...props} />;
      default:
        console.warn(`[MagicFactory] Unknown magic type`);
        return null;
    }
  }
}
