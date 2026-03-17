/**
 * Eval benchmarks for LLM-based unsupervised classification.
 * Import this file to use benchmarks programmatically.
 */

import benchmarks from "./benchmarks.json";

export type BenchmarkOperator = ">=" | ">" | "<=" | "<" | "==";

export interface BenchmarkSpec {
  target: number;
  operator: BenchmarkOperator;
  unit: "percent" | "score";
  scale?: [number, number];
  description?: string;
}

export interface BenchmarksConfig {
  description: string;
  version: string;
  evalSetSize: number;
  benchmarks: Record<string, BenchmarkSpec>;
}

export const benchmarksConfig = benchmarks as unknown as BenchmarksConfig;

/** Check if a result passes its benchmark */
export function passesBenchmark(
  benchmarkKey: keyof typeof benchmarksConfig.benchmarks,
  actualValue: number
): boolean {
  const spec = benchmarksConfig.benchmarks[benchmarkKey];
  if (!spec) return false;

  const { target, operator } = spec;
  switch (operator) {
    case ">=":
      return actualValue >= target;
    case ">":
      return actualValue > target;
    case "<=":
      return actualValue <= target;
    case "<":
      return actualValue < target;
    case "==":
      return actualValue === target;
    default:
      return false;
  }
}

/** Get benchmark target for display */
export function getBenchmarkTarget(key: keyof typeof benchmarksConfig.benchmarks): string {
  const spec = benchmarksConfig.benchmarks[key];
  if (!spec) return "—";
  const { target, operator, unit } = spec;
  const formatted = unit === "percent" ? `${(target * 100).toFixed(0)}%` : `${target}`;
  return `${operator} ${formatted}`;
}
