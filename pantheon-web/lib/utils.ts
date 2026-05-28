import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Verdict } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function verdictColor(verdict: Verdict | null): string {
  if (verdict === "BUILD IT") return "text-green-400";
  if (verdict === "VALIDATE FIRST") return "text-amber-400";
  if (verdict === "AVOID") return "text-red-400";
  return "text-zinc-400";
}

export function verdictBg(verdict: Verdict | null): string {
  if (verdict === "BUILD IT") return "bg-green-950 border-green-800";
  if (verdict === "VALIDATE FIRST") return "bg-amber-950 border-amber-800";
  if (verdict === "AVOID") return "bg-red-950 border-red-800";
  return "bg-zinc-900 border-zinc-700";
}

export function verdictDot(verdict: Verdict | null): string {
  if (verdict === "BUILD IT") return "bg-green-400";
  if (verdict === "VALIDATE FIRST") return "bg-amber-400";
  if (verdict === "AVOID") return "bg-red-400";
  return "bg-zinc-400";
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

// Cookie-based usage limit: 3 teardowns per calendar month (free tier)
const USAGE_COOKIE = "pth_usage";

export function getMonthlyUsage(): number {
  if (typeof document === "undefined") return 0;
  const raw = document.cookie
    .split("; ")
    .find((r) => r.startsWith(`${USAGE_COOKIE}=`));
  if (!raw) return 0;
  try {
    const data = JSON.parse(decodeURIComponent(raw.split("=")[1]));
    const now = new Date();
    if (data.month !== `${now.getFullYear()}-${now.getMonth()}`) return 0;
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

export function incrementMonthlyUsage(): number {
  if (typeof document === "undefined") return 0;
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const current = getMonthlyUsage();
  const next = current + 1;
  const expires = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  document.cookie = `${USAGE_COOKIE}=${encodeURIComponent(
    JSON.stringify({ month: monthKey, count: next })
  )}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  return next;
}

export const FREE_TIER_LIMIT = 3;
