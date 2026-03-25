import {
  CONTENT_KIND_VALUES,
  CONTENT_PACKET_ROLE_VALUES,
  RISK_APPETITE_VALUES,
  isContentKind,
  isContentPacketRole,
  isRiskAppetite,
} from '../../../src/models/content-taxonomy';

describe('isContentKind', () => {
  it('has exactly 12 values', () => {
    expect(CONTENT_KIND_VALUES).toHaveLength(12);
  });

  it.each(CONTENT_KIND_VALUES.map((value) => [value]))('accepts valid value: %s', (value) => {
    expect(isContentKind(value)).toBe(true);
  });

  it('accepts PLACE', () => {
    expect(isContentKind('PLACE')).toBe(true);
  });

  it('accepts SECRET', () => {
    expect(isContentKind('SECRET')).toBe(true);
  });

  it.each([['INVALID'], ['entity'], [''], [null], [undefined], [42], [true]])(
    'rejects invalid value: %p',
    (value) => {
      expect(isContentKind(value)).toBe(false);
    }
  );
});

describe('isContentPacketRole', () => {
  it.each(CONTENT_PACKET_ROLE_VALUES.map((value) => [value]))(
    'accepts valid value: %s',
    (value) => {
      expect(isContentPacketRole(value)).toBe(true);
    }
  );

  it.each([['INVALID'], ['primary_seed'], [''], [null], [undefined], [42]])(
    'rejects invalid value: %p',
    (value) => {
      expect(isContentPacketRole(value)).toBe(false);
    }
  );
});

describe('isRiskAppetite', () => {
  it.each(RISK_APPETITE_VALUES.map((value) => [value]))('accepts valid value: %s', (value) => {
    expect(isRiskAppetite(value)).toBe(true);
  });

  it.each([['INVALID'], ['low'], [''], [null], [undefined], [42]])(
    'rejects invalid value: %p',
    (value) => {
      expect(isRiskAppetite(value)).toBe(false);
    }
  );
});
