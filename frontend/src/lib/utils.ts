import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMNEE(wei: bigint | string | number): string {
  const value = typeof wei === 'bigint' ? wei : BigInt(wei);
  const mnee = Number(value) / 1e18;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(mnee);
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatDate(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date * 1000) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatTimeRemaining(deadline: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = deadline - now;
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  
  const minutes = Math.floor((diff % 3600) / 60);
  return `${minutes}m`;
}

/**
 * Validate Discord User ID format
 * Discord IDs are snowflakes: 17-19 digit numbers
 */
export function isValidDiscordId(id: string): boolean {
  return /^\d{17,19}$/.test(id);
}

/**
 * Validate Discord Server ID format (same as User ID - snowflake)
 */
export function isValidDiscordServerId(id: string): boolean {
  return /^\d{17,19}$/.test(id);
}

/**
 * Parse MNEE amount to wei (18 decimals)
 */
export function parseMneeToWei(amount: number | string): bigint {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  // Multiply by 10^18, but handle decimal precision carefully
  return BigInt(Math.floor(num * 1e6)) * BigInt(1e12);
}
