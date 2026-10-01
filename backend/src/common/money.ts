import { ValueTransformer } from 'typeorm';

/** Rounds to 2 decimal places, avoiding common floating-point artifacts (e.g. 10.005 -> 10.01). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Postgres `numeric` columns come back from `pg`/TypeORM as strings (to avoid silent precision
 * loss). This transformer centralizes the string<->number conversion in one place so every
 * money column behaves consistently, instead of each call site doing its own parseFloat/toFixed.
 */
export const moneyTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : parseFloat(value),
};
