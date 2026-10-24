import { describe, expect, it } from 'vitest';
import { formatMoney } from '../../src/lib/money';

describe('formatMoney', () => {
  it('formats currency decimal strings without converting through floating point', () => {
    expect(formatMoney('12345678901234567890.45', 'INR')).toBe(
      '₹12,345,678,901,234,567,890.45',
    );
  });

  it('formats zero and currencies without fractional digits', () => {
    expect(formatMoney('0.00', 'INR')).toBe('₹0.00');
    expect(formatMoney('42', 'JPY')).toBe('¥42');
  });

  it('rejects invalid or over-precision amounts explicitly', () => {
    expect(() => formatMoney('1.234', 'INR')).toThrow(RangeError);
    expect(() => formatMoney('not-money', 'INR')).toThrow(TypeError);
  });
});
