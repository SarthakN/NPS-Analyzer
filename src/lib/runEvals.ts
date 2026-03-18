/**
 * Runs evaluation metrics against NPS analysis result (theme/cluster quality).
 */

import type { NpsAnalysisResult, InsightComment } from '@/lib/npsAnalysis';
import type { BenchmarkKey } from '@/lib/benchmarks';
import { loadBenchmarks, passesBenchmark, BENCHMARK_LABELS } from '@/lib/benchmarks';
import { evaluateFactualAccuracy } from '@/lib/evalFactualAccuracy';
import { evaluateClusterSeparation } from '@/lib/evalClusterSeparation';

const OPENAI_KEY_STORAGE = 'nps:openaiKey';

const NPS_RESULT_KEY = 'nps:analysisResult';
export const INSIGHT_COMMENTS_KEY = 'nps:insightComments';

export interface EvalResultItem {
  key: BenchmarkKey;
  label: string;
  value: number | null; // null = N/A (no actual calculation)
  target: string;
  passed: boolean | null; // null = N/A
  unit: 'percent' | 'score' | 'raw';
}

export interface EvalRunResult {
  ranAt: string;
  totalComments: number;
  commentsWithThemes: number;
  uniqueThemes: number;
  results: EvalResultItem[];
}

function getCommentsWithThemes(result: NpsAnalysisResult): InsightComment[] {
  const comments = result?.surveyComments ?? [];
  return comments.filter((c): c is InsightComment => {
    const ic = c as InsightComment;
    return Array.isArray(ic.themes) && ic.themes.length > 0;
  });
}

/** Compute eval metrics from NPS result. Some metrics are derived; others require LLM/system evals. */
export async function runEvals(
  result: NpsAnalysisResult,
  enabledMetrics: BenchmarkKey[],
  apiKey?: string
): Promise<EvalRunResult> {
  const benchmarks = loadBenchmarks();
  const comments = result?.surveyComments ?? [];
  const withThemes = getCommentsWithThemes(result);
  const themeSet = new Set<string>();
  withThemes.forEach((c) =>
    c.themes?.forEach((t) => themeSet.add(t.theme))
  );

  const totalComments = comments.length;
  const commentsWithThemes = withThemes.length;
  const uniqueThemes = themeSet.size;

  const coverage = totalComments > 0 ? commentsWithThemes / totalComments : 0;

  const key = apiKey ?? (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(OPENAI_KEY_STORAGE) : null);
  const hasApiKey = !!key?.trim();

  let factualAccuracy: number | null = null;
  if (enabledMetrics.includes('factualAccuracy') && withThemes.length > 0) {
    if (hasApiKey) {
      factualAccuracy = await evaluateFactualAccuracy(withThemes, key!.trim());
    } else {
      throw new Error('OpenAI API key required for factual accuracy eval. Add it on the Configure page.');
    }
  }

  let clusterSeparation: number | null = null;
  if (enabledMetrics.includes('clusterSeparation') && withThemes.length > 0) {
    if (hasApiKey) {
      clusterSeparation = await evaluateClusterSeparation(withThemes, key!.trim());
    } else {
      throw new Error('OpenAI API key required for cluster separation eval. Add it on the Configure page.');
    }
  }

  /** Only metrics with actual calculation get values; others are null (N/A) */
  const computed: Partial<Record<BenchmarkKey, number | null>> = {
    factualAccuracy,
    clusterSeparation,
    consistency: null,
    classificationAccuracy: null,
    creativity: null,
    hallucinationRate: null,
    piiLeakageRate: null,
    latencyP50: null,
    latencyP95: null,
    latencyP99: null,
    rps: null,
    queueWaitTime: null,
    costPerRequest: null,
    contextWindowUtilization: null,
    errorRate: null,
    rouge: null,
    bertScore: null,
    compressionRatio: null,
    keyPointCoverage: null,
    modelDrift: null,
    thumbsUpDownRatio: null,
  };

  const results: EvalResultItem[] = enabledMetrics.map((key) => {
    const value = computed[key] ?? null;
    const spec = benchmarks[key];
    const passed = value !== null ? passesBenchmark(key, value) : null;
    let targetStr: string;
    if (spec.unit === 'percent') {
      targetStr = `${(spec.target * 100).toFixed(1)}%`;
    } else {
      targetStr = `${spec.target}`;
    }
    const target = spec.operator === '<=' ? `≤ ${targetStr}` : `≥ ${targetStr}`;
    return {
      key,
      label: BENCHMARK_LABELS[key] ?? key,
      value,
      target,
      passed,
      unit: spec.unit,
    };
  });

  return {
    ranAt: new Date().toISOString(),
    totalComments,
    commentsWithThemes,
    uniqueThemes,
    results,
  };
}

export const EVAL_RESULT_KEY = 'nps:evalResult';

export function loadEvalResult(): EvalRunResult | undefined {
  try {
    const raw = sessionStorage.getItem(EVAL_RESULT_KEY);
    return raw ? (JSON.parse(raw) as EvalRunResult) : undefined;
  } catch {
    return undefined;
  }
}

export function saveEvalResult(result: EvalRunResult): void {
  try {
    sessionStorage.setItem(EVAL_RESULT_KEY, JSON.stringify(result));
  } catch {
    // ignore
  }
}

export function getNpsResultFromStorage(): NpsAnalysisResult | undefined {
  try {
    const raw = sessionStorage.getItem(NPS_RESULT_KEY);
    const result = raw ? (JSON.parse(raw) as NpsAnalysisResult) : undefined;
    if (!result) return undefined;
    const insightsRaw = sessionStorage.getItem(INSIGHT_COMMENTS_KEY);
    const insights = insightsRaw ? (JSON.parse(insightsRaw) as InsightComment[]) : undefined;
    if (insights?.length) {
      return { ...result, surveyComments: insights };
    }
    return result;
  } catch {
    return undefined;
  }
}

export function saveInsightComments(comments: InsightComment[]): void {
  try {
    sessionStorage.setItem(INSIGHT_COMMENTS_KEY, JSON.stringify(comments));
  } catch {
    // ignore
  }
}
