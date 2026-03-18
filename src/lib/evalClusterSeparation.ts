/**
 * Cluster Separation eval.
 * LLM-as-a-judge: compares pairs of theme clusters and checks if they represent
 * clearly different topics.
 */

import type { InsightComment } from '@/lib/npsAnalysis';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';

/** Judge model (GPT-5.4 via Responses API) */
const JUDGE_MODEL = 'gpt-5.4';

const CLUSTER_SEPARATION_JUDGE_PROMPT = `You are an expert evaluator for clustering quality. Your task is to determine whether two clusters (themes) represent clearly different topics.

Given two clusters, each with a theme name and sample items (issues extracted from NPS comments):

- If the clusters cover distinct, non-overlapping topics → YES
- If the clusters overlap significantly or could be merged → NO

Consider: Are these themes semantically distinct? Would a user find them useful as separate categories?

Respond with ONLY a single word: YES or NO. No explanation.`;

const MAX_PAIR_EVALS = 30;

interface Cluster {
  theme: string;
  items: string[];
}

function buildClusters(comments: InsightComment[]): Cluster[] {
  const byTheme = new Map<string, string[]>();

  for (const c of comments) {
    const themes = c.themes ?? [];
    for (const t of themes) {
      const theme = t.theme?.trim();
      const issue = t.issue?.trim();
      if (!theme || !issue) continue;
      const list = byTheme.get(theme) ?? [];
      if (!list.includes(issue)) list.push(issue);
      byTheme.set(theme, list);
    }
  }

  return Array.from(byTheme.entries()).map(([theme, items]) => ({
    theme,
    items: items.slice(0, 5),
  }));
}

function samplePairs(clusters: Cluster[]): [Cluster, Cluster][] {
  const pairs: [Cluster, Cluster][] = [];
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      pairs.push([clusters[i], clusters[j]]);
    }
  }
  return pairs.slice(0, MAX_PAIR_EVALS);
}

/** Extract text from Responses API output */
function extractOutputText(data: { output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> }): string {
  const output = data?.output ?? [];
  for (const item of output) {
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const part of item.content) {
        if (part.type === 'output_text' && part.text) return part.text;
      }
    }
  }
  return '';
}

function formatCluster(cluster: Cluster): string {
  const items = cluster.items.length ? cluster.items.map((i) => `- ${i}`).join('\n') : '(no items)';
  return `${cluster.theme}\n${items}`;
}

/**
 * Evaluates cluster separation by comparing theme pairs with LLM-as-a-judge.
 * Returns % of pairs that are clearly different (0–1), or 0 if fewer than 2 clusters.
 */
export async function evaluateClusterSeparation(
  comments: InsightComment[],
  apiKey: string
): Promise<number> {
  const clusters = buildClusters(comments);
  if (clusters.length < 2) return 0;

  const pairs = samplePairs(clusters);
  let yesCount = 0;

  for (const [clusterA, clusterB] of pairs) {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        input: [
          { role: 'system', content: CLUSTER_SEPARATION_JUDGE_PROMPT },
          {
            role: 'user',
            content: `Cluster A:\n${formatCluster(clusterA)}\n\nCluster B:\n${formatCluster(clusterB)}\n\nDo these clusters represent clearly different topics? (YES or NO):`,
          },
        ],
        max_output_tokens: 16,
        reasoning: { effort: 'none' },
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `API error: ${response.status}`);
    }

    const data = await response.json();
    const text = extractOutputText(data).trim().toUpperCase();
    if (text.includes('YES')) yesCount++;
  }

  return pairs.length > 0 ? yesCount / pairs.length : 0;
}
