import { FireBall } from "../components/effects/FireBall";
import { LaserEffectController } from "../components/effects/LaserEffectController";
import { LightningEffectController } from "../components/effects/LightningEffectController";
import { MeteorEffectController } from "../components/effects/MeteorEffectController";
import { PoisonSwampEffectController } from "../components/effects/PoisonSwampEffectController";
import { EffectType } from "../types/effect";
import { AreaIndicator } from "../components/effects/AreaIndicator";
import { BulletEffectController } from "../components/effects/BulletEffectController";
import { EnvironmentalDust } from "../components/effects/EnvironmentalDust";
import { ExplosionDust } from "../components/effects/ExplosionDust";

// Map effect types to their respective components
export const MagicComponentMap = {
  [EffectType.FIREBALL]: FireBall,
  [EffectType.LASER]: LaserEffectController,
  [EffectType.LIGHTNING]: LightningEffectController,
  [EffectType.METEOR]: MeteorEffectController,
  [EffectType.POISON_SWAMP]: PoisonSwampEffectController,
  [EffectType.AREA_INDICATOR]: AreaIndicator,
  [EffectType.BULLET]: BulletEffectController,
  [EffectType.ENVIRONMENTAL_DUST]: EnvironmentalDust,
  [EffectType.EXPLOSION_DUST]: ExplosionDust,
} as const;
