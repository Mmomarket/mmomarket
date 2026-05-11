import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Like formatBRL but auto-increases decimal places for very small values
 * (useful for price-per-unit of game currencies, e.g. R$ 0,000025)
 */
export function formatBRLPrecise(value: number): string {
  if (!isFinite(value) || isNaN(value)) return "—";
  const abs = Math.abs(value);
  let decimals = 2;
  if (abs > 0 && abs < 0.01) {
    // -mag gives the position of the first significant digit after the decimal
    const mag = Math.floor(Math.log10(abs));
    decimals = Math.min(-mag + 1, 10);
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatPercent(value: number): string {
  const v = value ?? 0;
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

export function calculateFee(totalBRL: number, feePercent: number = 2): number {
  return totalBRL * (feePercent / 100);
}

/**
 * Round a BRL monetary value to 2 decimal places using banker's rounding
 * (round-half-to-even) to prevent float drift accumulation across many
 * wallet transactions.  Always call this before persisting or comparing
 * financial amounts.
 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
