export class ProfileValidationError extends Error {}

export const BIO_MAX_LENGTH = 160;
export const DEFAULT_MOODS = ['happy', 'sad', 'angry', 'silly'] as const;

// The settings form sends the literal "none" for "no default mood".
const NO_MOOD = 'none';

type ProfileUpdate = {
  name?: unknown;
  bio?: unknown;
  defaultMood?: unknown;
  [key: string]: unknown;
};

/**
 * Server-side rules for the profile fields BetterAuth does not know about.
 * Username rules (length, characters, uniqueness) live in BetterAuth's
 * username plugin. Returns the data to persist, or throws a ProfileValidationError.
 */
export function validateProfileUpdate<T extends ProfileUpdate>(data: T): T {
  const next: ProfileUpdate = { ...data };

  if (next.name !== undefined) {
    const name = typeof next.name === 'string' ? next.name.trim() : '';
    if (!name) throw new ProfileValidationError('Name is required');
    next.name = name;
  }

  if (next.bio !== undefined && next.bio !== null) {
    if (typeof next.bio !== 'string' || next.bio.length > BIO_MAX_LENGTH) {
      throw new ProfileValidationError(
        `Bio can be at most ${BIO_MAX_LENGTH} characters`,
      );
    }
    next.bio = next.bio.trim() || null;
  }

  if (next.defaultMood !== undefined && next.defaultMood !== null) {
    if (next.defaultMood === NO_MOOD) {
      next.defaultMood = null;
    } else if (
      !DEFAULT_MOODS.includes(
        next.defaultMood as (typeof DEFAULT_MOODS)[number],
      )
    ) {
      throw new ProfileValidationError('Unknown mood');
    }
  }

  return next as T;
}
