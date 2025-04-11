// Collision groups defined using bit masks.
// Each group is represented by a unique bit flag.
export enum CollisionBitmask {
  My = 1 << 0,
  Character = 1 << 1, // 0b0001 - Represents the player object
  Ground = 1 << 2, // 0b0010 - Represents ground or terrain
  Projectile = 1 << 3, // 0b0100 - Represents projectiles (e.g., fireballs, arrows)
  AOE = 1 << 4, // 0b1000 - Represents area of effect (e.g., poison swamp, lightning strike)
  Box = 1 << 5, // 0b10000 - Represents movable or static boxes

  // Add more groups as needed (up to 16 in total)
}
