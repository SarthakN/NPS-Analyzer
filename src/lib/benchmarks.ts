/**
 * Eval benchmark configuration. Used by Dev mode and eval suite.
 */

export const BENCHMARKS_STORAGE_KEY = 'nps:benchmarks';
export const BENCHMARK_ENABLED_KEY = 'nps:benchmarkEnabled';

export interface BenchmarkSpec {
  target: number;
  operator: '>=' | '>' | '<=' | '<' | '==';
  unit: 'percent' | 'score' | 'raw';
  scale?: [number, number];
  description?: string;
  category?: string;
}

export type BenchmarkKey =
  | 'factualAccuracy'
  | 'clusterSeparation'
  | 'consistency'
  | 'classificationAccuracy'
  | 'creativity'
  | 'hallucinationRate'
  | 'piiLeakageRate'
  | 'latencyP50'
  | 'latencyP95'
  | 'latencyP99'
  | 'rps'
  | 'queueWaitTime'
  | 'costPerRequest'
  | 'contextWindowUtilization'
  | 'errorRate'
  | 'rouge'
  | 'bertScore'
  | 'compressionRatio'
  | 'keyPointCoverage'
  | 'modelDrift'
  | 'thumbsUpDownRatio';

export const BENCHMARK_DEFAULTS: Record<BenchmarkKey, BenchmarkSpec> = {
  factualAccuracy: {
    target: 4,
    operator: '>=',
    unit: 'score',
    scale: [1, 5],
    description: 'LLM judge: does classification reflect input meaning?',
    category: 'Classification Quality',
  },
  clusterSeparation: {
    target: 0.9,
    operator: '>=',
    unit: 'percent',
    description: 'LLM judge: % cluster pairs that are clearly different topics',
    category: 'Classification Quality',
  },
  consistency: {
    target: 0.9,
    operator: '>=',
    unit: 'percent',
    description: 'Avg cosine similarity across N runs',
    category: 'Classification Quality',
  },
  classificationAccuracy: {
    target: 0.85,
    operator: '>=',
    unit: 'percent',
    description: '% overlap: LLM vs embedding clustering',
    category: 'Classification Quality',
  },
  creativity: {
    target: 4,
    operator: '>=',
    unit: 'score',
    scale: [1, 5],
    description: 'Human: novelty, insightfulness, non-generic',
    category: 'Classification Quality',
  },
  hallucinationRate: {
    target: 0.05,
    operator: '<=',
    unit: 'percent',
    description: '% outputs with unsupported/fabricated info',
    category: 'Safety',
  },
  piiLeakageRate: {
    target: 0,
    operator: '<=',
    unit: 'percent',
    description: '% outputs exposing sensitive info',
    category: 'Safety',
  },
  latencyP50: {
    target: 1000,
    operator: '<=',
    unit: 'raw',
    description: 'p50 latency (ms)',
    category: 'System Performance',
  },
  latencyP95: {
    target: 2000,
    operator: '<=',
    unit: 'raw',
    description: 'p95 latency (ms)',
    category: 'System Performance',
  },
  latencyP99: {
    target: 5000,
    operator: '<=',
    unit: 'raw',
    description: 'p99 latency (ms)',
    category: 'System Performance',
  },
  rps: {
    target: 10,
    operator: '>=',
    unit: 'raw',
    description: 'Requests per second',
    category: 'System Performance',
  },
  queueWaitTime: {
    target: 500,
    operator: '<=',
    unit: 'raw',
    description: 'Time before model execution (ms)',
    category: 'System Performance',
  },
  costPerRequest: {
    target: 0.01,
    operator: '<=',
    unit: 'raw',
    scale: [0, 1],
    description: 'Cost = (input + output tokens) * price',
    category: 'System Performance',
  },
  contextWindowUtilization: {
    target: 0.8,
    operator: '<=',
    unit: 'percent',
    description: 'tokens_used / max_context',
    category: 'System Performance',
  },
  errorRate: {
    target: 0.01,
    operator: '<=',
    unit: 'percent',
    description: 'API failures, timeouts, invalid outputs',
    category: 'System Performance',
  },
  rouge: {
    target: 0.7,
    operator: '>=',
    unit: 'percent',
    description: 'vs reference summaries/labels',
    category: 'Output Similarity',
  },
  bertScore: {
    target: 0.85,
    operator: '>=',
    unit: 'percent',
    description: 'Semantic similarity vs reference',
    category: 'Output Similarity',
  },
  compressionRatio: {
    target: 0.5,
    operator: '<=',
    unit: 'percent',
    description: 'output_length / input_length',
    category: 'Output Similarity',
  },
  keyPointCoverage: {
    target: 0.85,
    operator: '>=',
    unit: 'percent',
    description: '% key points from input captured',
    category: 'Output Similarity',
  },
  modelDrift: {
    target: 0.1,
    operator: '<=',
    unit: 'percent',
    description: 'KL divergence vs baseline',
    category: 'Safety & Reliability',
  },
  thumbsUpDownRatio: {
    target: 0.8,
    operator: '>=',
    unit: 'percent',
    description: 'Thumbs up / (up + down)',
    category: 'Safety & Reliability',
  },
};

export const BENCHMARK_KEYS = Object.keys(BENCHMARK_DEFAULTS) as BenchmarkKey[];

export const BENCHMARK_LABELS: Record<BenchmarkKey, string> = {
  factualAccuracy: 'Factual accuracy',
  clusterSeparation: 'Cluster separation',
  consistency: 'Consistency',
  classificationAccuracy: 'Classification accuracy',
  creativity: 'Creativity',
  hallucinationRate: 'Hallucination rate',
  piiLeakageRate: 'PII leakage rate',
  latencyP50: 'Latency p50',
  latencyP95: 'Latency p95',
  latencyP99: 'Latency p99',
  rps: 'Requests per second',
  queueWaitTime: 'Queue wait time',
  costPerRequest: 'Cost per request',
  contextWindowUtilization: 'Context window utilization',
  errorRate: 'Error rate',
  rouge: 'ROUGE',
  bertScore: 'BERTScore',
  compressionRatio: 'Compression ratio',
  keyPointCoverage: 'Key point coverage',
  modelDrift: 'Model drift',
  thumbsUpDownRatio: 'Thumbs up/down ratio',
};

export function loadBenchmarks(): Record<BenchmarkKey, BenchmarkSpec> {
  try {
    const stored = localStorage.getItem(BENCHMARKS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<Record<BenchmarkKey, BenchmarkSpec>>;
      const result = { ...BENCHMARK_DEFAULTS };
      for (const key of BENCHMARK_KEYS) {
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

/** Display value for input: percent as 0–100, score/raw as-is */
export function toInputValue(spec: BenchmarkSpec): number {
  return spec.unit === 'percent' ? spec.target * 100 : spec.target;
}

/** Parse input back to stored value */
export function fromInputValue(spec: BenchmarkSpec, input: number): number {
  return spec.unit === 'percent' ? input / 100 : input;
}

export function loadEnabledMetrics(): Record<BenchmarkKey, boolean> {
  try {
    const stored = localStorage.getItem(BENCHMARK_ENABLED_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<Record<BenchmarkKey, boolean>>;
      const result: Record<BenchmarkKey, boolean> = {} as Record<BenchmarkKey, boolean>;
      for (const key of BENCHMARK_KEYS) {
        result[key] = parsed[key] ?? true;
      }
      return result;
    }
  } catch {
    // ignore
  }
  return Object.fromEntries(BENCHMARK_KEYS.map((k) => [k, true])) as Record<BenchmarkKey, boolean>;
}

export function saveEnabledMetrics(enabled: Record<BenchmarkKey, boolean>): void {
  try {
    localStorage.setItem(BENCHMARK_ENABLED_KEY, JSON.stringify(enabled));
  } catch {
    // ignore
  }
}

/** Check if a result passes its benchmark */
export function passesBenchmark(key: BenchmarkKey, actualValue: number): boolean {
  const spec = loadBenchmarks()[key];
  if (!spec) return false;
  const { target, operator } = spec;
  switch (operator) {
    case '>=':
      return actualValue >= target;
    case '>':
      return actualValue > target;
    case '<=':
      return actualValue <= target;
    case '<':
      return actualValue < target;
    case '==':
      return actualValue === target;
    default:
      return false;
  }
}
