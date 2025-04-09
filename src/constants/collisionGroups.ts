// Collision groups defined using bit masks.
// Each group is represented by a unique bit flag.
export enum CollisionGroup {
  Player = 1 << 0, // 0b0001 - Represents the player object
  Ground = 1 << 1, // 0b0010 - Represents ground or terrain
  Projectile = 1 << 2, // 0b0100 - Represents projectiles (e.g., fireballs, arrows)
  Box = 1 << 3, // 0b1000 - Represents movable or static boxes
  // Add more groups as needed (up to 16 in total)
}

/**
 * Generates a collision group bitmask for a RigidBody.
 *
 * @param membership - The group this object belongs to (one or more CollisionGroup values combined using bitwise OR).
 * @param exclude - An array of CollisionGroup values that this object should *not* collide with.
 * @returns A 32-bit integer representing the collisionGroups mask (16 bits for membership, 16 bits for filter).
 *
 * The returned mask is structured as follows:
 * - Upper 16 bits: groups this object belongs to (membership)
 * - Lower 16 bits: groups this object can collide with (filter)
 */
export const createCollisionGroups = (
  membership: number,
  exclude: number[]
) => {
  const ALL = 0xffff; // All 16 bits set to 1 (allow collision with all groups by default)
  const excludeMask = exclude.reduce((mask, g) => mask | g, 0); // Combine all groups to exclude
  const filter = ALL & ~excludeMask; // Remove excluded groups from filter
  return (membership << 16) | filter; // Combine membership and filter into a single bitmask
};
