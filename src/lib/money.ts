export function formatMoney(amount: string, currency: string) {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(amount);
  if (!match) throw new TypeError(`Invalid decimal amount: ${amount}`);

  const [, sign, integerText, fractionText = ''] = match;
  const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const fractionDigits = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits;
  if (fractionDigits === undefined)
    throw new Error(`Unable to determine decimal precision for ${currency}.`);
  if (fractionText.length > fractionDigits)
    throw new RangeError(`Amount has too many decimal places for ${currency}`);

  const integer = BigInt(`${sign}${integerText}`);
  const parts = currencyFormatter.formatToParts(integer);
  if (!fractionDigits) return parts.map((part) => part.value).join('');

  const decimal = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
    .formatToParts(1.1)
    .find((part) => part.type === 'decimal')?.value;
  if (!decimal) throw new Error('Unable to format the currency decimal mark.');

  const lastIntegerPart = parts.findLastIndex(
    (part) => part.type === 'integer',
  );
  const fraction = fractionText.padEnd(fractionDigits, '0');
  parts.splice(
    lastIntegerPart + 1,
    0,
    { type: 'decimal', value: decimal },
    { type: 'fraction', value: fraction },
  );
  return parts.map((part) => part.value).join('');
}
