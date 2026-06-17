import { describe, it, expect } from 'vitest';
import { DEFAULT_USER_ID } from './constants';

describe('constants', () => {
  it('defines the correct DEFAULT_USER_ID value', () => {
    expect(DEFAULT_USER_ID).toBe('default');
  });
});
