/**
 * Eval benchmark configuration. Used by Configure page and eval suite.
 */

export const BENCHMARKS_STORAGE_KEY = 'nps:benchmarks';

export interface BenchmarkSpec {
  target: number;
  operator: '>=' | '>' | '<=' | '<' | '==';
  unit: 'percent' | 'score';
  scale?: [number, number];
  description?: string;
}

export type BenchmarkKey =
  | 'clusterCohesion'
  | 'clusterSeparation'
  | 'labelQuality'
  | 'stability'
  | 'coverage'
  | 'humanAlignment'
  | 'businessUsefulness'
  | 'pairwiseAccuracy';

export const BENCHMARK_DEFAULTS: Record<BenchmarkKey, BenchmarkSpec> = {
  clusterCohesion: {
    target: 0.85,
    operator: '>=',
    unit: 'percent',
    description: '% PASS clusters',
  },
  clusterSeparation: {
    target: 0.9,
    operator: '>=',
    unit: 'percent',
    description: 'Clusters represent clearly different topics',
  },
  labelQuality: {
    target: 4,
    operator: '>=',
    unit: 'score',
    scale: [1, 5],
    description: 'Average label accuracy score',
  },
  stability: {
    target: 0.8,
    operator: '>=',
    unit: 'percent',
    description: '% items that remain in same cluster across runs',
  },
  coverage: {
    target: 0.9,
    operator: '>=',
    unit: 'percent',
    description: 'clustered_items / total_items',
  },
  humanAlignment: {
    target: 4,
    operator: '>=',
    unit: 'score',
    scale: [1, 5],
    description: 'Aggregate of coherence, label clarity, topic usefulness',
  },
  businessUsefulness: {
    target: 0.8,
    operator: '>=',
    unit: 'percent',
    description: '% clusters that are actionable',
  },
  pairwiseAccuracy: {
    target: 0.85,
    operator: '>=',
    unit: 'percent',
    description: 'LLM judge agreement with cluster output',
  },
};

export const BENCHMARK_LABELS: Record<BenchmarkKey, string> = {
  clusterCohesion: 'Cluster cohesion',
  clusterSeparation: 'Cluster separation',
  labelQuality: 'Label quality',
  stability: 'Stability',
  coverage: 'Coverage',
  humanAlignment: 'Human alignment',
  businessUsefulness: 'Business usefulness',
  pairwiseAccuracy: 'Pairwise accuracy',
};

export function loadBenchmarks(): Record<BenchmarkKey, BenchmarkSpec> {
  try {
    const stored = localStorage.getItem(BENCHMARKS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<Record<BenchmarkKey, BenchmarkSpec>>;
      const result = { ...BENCHMARK_DEFAULTS };
      for (const key of Object.keys(BENCHMARK_DEFAULTS) as BenchmarkKey[]) {
        const p = parsed[key];
        if (p && typeof p.target === 'number') {
          result[key] = { ...BENCHMARK_DEFAULTS[key], target: p.target };
        }
      }
      return result;
    }
  } catch {
    // ignore
  }
  return { ...BENCHMARK_DEFAULTS };
}

export function saveBenchmarks(benchmarks: Record<BenchmarkKey, BenchmarkSpec>): void {
  try {
    localStorage.setItem(BENCHMARKS_STORAGE_KEY, JSON.stringify(benchmarks));
  } catch {
    // ignore
  }
}

/** Display value for input: percent as 0–100, score as-is */
export function toInputValue(spec: BenchmarkSpec): number {
  return spec.unit === 'percent' ? spec.target * 100 : spec.target;
}

/** Parse input back to stored value */
export function fromInputValue(spec: BenchmarkSpec, input: number): number {
  return spec.unit === 'percent' ? input / 100 : input;
}
