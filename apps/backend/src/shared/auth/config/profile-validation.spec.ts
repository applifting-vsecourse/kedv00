import { validateProfileUpdate } from './profile-validation';

describe('validateProfileUpdate', () => {
  it('trims the name and rejects an empty one', () => {
    expect(validateProfileUpdate({ name: '  Ada ' }).name).toBe('Ada');
    expect(() => validateProfileUpdate({ name: '   ' })).toThrow();
  });

  it('allows a bio up to 160 characters and rejects longer', () => {
    expect(validateProfileUpdate({ bio: 'a'.repeat(160) }).bio).toHaveLength(
      160,
    );
    expect(() => validateProfileUpdate({ bio: 'a'.repeat(161) })).toThrow();
    expect(validateProfileUpdate({ bio: '  ' }).bio).toBeNull();
  });

  it('maps "none" to no mood and rejects unknown moods', () => {
    expect(
      validateProfileUpdate({ defaultMood: 'none' }).defaultMood,
    ).toBeNull();
    expect(validateProfileUpdate({ defaultMood: 'silly' }).defaultMood).toBe(
      'silly',
    );
    expect(() => validateProfileUpdate({ defaultMood: 'grumpy' })).toThrow();
  });

  it('leaves fields that are not sent alone', () => {
    expect(validateProfileUpdate({ username: 'ada' })).toEqual({
      username: 'ada',
    });
  });
});
