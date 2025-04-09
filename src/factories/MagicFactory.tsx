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
import { MagicType } from "../types/magic";

export type MagicProps =
  | FireBallEffectProps
  | LaserEffectProps
  | LightningEffectProps
  | MeteorEffectProps
  | PoisonSwampEffectProps;

export const MagicComponentMap = {
  [MagicType.FireBall]: FireBallEffectController,
  [MagicType.Laser]: LaserEffectController,
  [MagicType.Lightning]: LightningEffectController,
  [MagicType.Meteor]: MeteorEffectController,
  [MagicType.PoisonSwamp]: PoisonSwampEffectController,
} as const;

export class MagicFactory {
  static create(props: MagicProps): JSX.Element {
    switch (props.type) {
      case MagicType.FireBall:
        console.log("FireBallEffectController", props);
        return <FireBallEffectController {...props} />;
      case MagicType.Laser:
        console.log("LaserEffectController", props);
        return <LaserEffectController {...props} />;
      case MagicType.Lightning:
        return <LightningEffectController {...props} />;
      case MagicType.Meteor:
        return <MeteorEffectController {...props} />;
      case MagicType.PoisonSwamp:
        return <PoisonSwampEffectController {...props} />;
      default:
        console.warn(`[MagicFactory] Unknown magic type`);
        return null;
    }
  }
}
