/**
 * Effect type enumeration
 */
export enum EffectType {
  FIREBALL = "FIREBALL",
  EXPLOSION_DUST = "EXPLOSION_DUST",
  SHOCKWAVE_EXPLOSION = "SHOCKWAVE_EXPLOSION",
  LASER = "LASER",
  LIGHTNING = "LIGHTNING",
  METEOR = "METEOR",
  POISON_SWAMP = "POISON_SWAMP",
  AREA_INDICATOR = "AREA_INDICATOR",
  BULLET = "BULLET",
  ENVIRONMENTAL_DUST = "ENVIRONMENTAL_DUST",
}

/**
 * Base effect data interface
 * Basic structure for all effect-related data
 */
export interface EffectData {
  type: string;
  config: { [key: string]: any };
}

/**
 * Active effect interface
 * Effect instance managed on the client
 */
export interface ActiveEffect {
  key: number;
  // Sender account
  sender?: string;
  effectData: EffectData;
}

/**
 * Effect message exchanged between server and client
 */
export interface EffectEventMessage {
  sender: string;
  effectData: EffectData;
  timestamp: number;
}
