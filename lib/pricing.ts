/** Price per 1 GB in Iranian Rials (TetraPay / Dar\u0101met amounts use rials). */
export const PRICE_PER_GB_IRR = 2_000_000;

export const MIN_GB = 1;
export const MAX_GB = 100;

export function amountForGb(gb: number): number {
  if (!Number.isInteger(gb) || gb < MIN_GB || gb > MAX_GB) {
    throw new Error(`GB must be an integer between ${MIN_GB} and ${MAX_GB}`);
  }
  return gb * PRICE_PER_GB_IRR;
}

/** Format a rials amount for UI: 1 تومان = 10 ریال */
export function formatToman(amountRials: number): string {
  const tomans = amountRials / 10;
  return new Intl.NumberFormat("fa-IR").format(tomans) + " تومان";
}
