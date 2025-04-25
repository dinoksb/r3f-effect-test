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
  LightningEffectControllerProps,
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
  BulletEffectControllerProps,
  BulletEffectController,
} from "../components/effects/BulletEffectController";
import {
  EnvironmentalDust,
  EnvironmentalDustProps,
} from "../components/effects/EnvironmentalDust";
import {
  ExplosionDust,
  ExplosionEffectProps,
} from "../components/effects/ExplosionDust";

export type EffectProps =
  | FireBallEffectProps
  | LaserEffectProps
  | LightningEffectControllerProps
  | MeteorEffectProps
  | PoisonSwampEffectProps
  | AreaIndicatorEffectProps
  | BulletEffectControllerProps
  | EnvironmentalDustProps
  | ExplosionEffectProps;

export const MagicComponentMap = {
  [EffectType.FireBall]: FireBallEffectController,
  [EffectType.Laser]: LaserEffectController,
  [EffectType.Lightning]: LightningEffectController,
  [EffectType.Meteor]: MeteorEffectController,
  [EffectType.PoisonSwamp]: PoisonSwampEffectController,
  [EffectType.AreaIndicator]: AreaIndicatorEffectController,
  [EffectType.Bullet]: BulletEffectController,
  [EffectType.Dust]: EnvironmentalDust,
  [EffectType.Explosion]: ExplosionDust,
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
        return <EnvironmentalDust {...props} />;
      case EffectType.Explosion:
        return <ExplosionDust {...props} />;
    }
  }
}
