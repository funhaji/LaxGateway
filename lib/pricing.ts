/** Price per 1 GB in Iranian Rials */
export const PRICE_PER_GB_IRR = 200_000;

export const MIN_GB = 1;
export const MAX_GB = 100;

export function amountForGb(gb: number): number {
  if (!Number.isInteger(gb) || gb < MIN_GB || gb > MAX_GB) {
    throw new Error(`GB must be an integer between ${MIN_GB} and ${MAX_GB}`);
  }
  return gb * PRICE_PER_GB_IRR;
}

export function formatIrr(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount) + " ریال";
}
