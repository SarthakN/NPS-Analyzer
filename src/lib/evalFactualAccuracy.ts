/**
 * Factual Accuracy / Contextual Relevance eval.
 * LLM-as-a-judge: scores theme generation outputs 1–5 based on:
 * - Does classification reflect input meaning?
 * - Is context preserved?
 */

import type { InsightComment } from '@/lib/npsAnalysis';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';

/** Judge model (GPT-5.4 via Responses API) */
const JUDGE_MODEL = 'gpt-5.4';

const FACTUAL_ACCURACY_JUDGE_PROMPT = `You are an expert evaluator for LLM classification quality. Your task is to score how well the classification output reflects the input.

Given:
1. INPUT: The original NPS survey comment
2. OUTPUT: The extracted issues and themes (classification)

Score from 1 to 5 based on:
- Does the classification accurately reflect the input's meaning? (no hallucination, no fabrication)
- Is the context preserved? (sentiment, tone, specific concerns mentioned)
- Are the themes appropriate and grounded in the comment?

Scoring guide:
1 = Poor: Output misrepresents or fabricates content; themes unrelated to input
2 = Below average: Significant gaps or misalignment
3 = Average: Partially accurate but some issues
4 = Good: Accurate reflection with minor gaps
5 = Excellent: Accurate, context-preserved, well-grounded themes

Respond with ONLY a single number: 1, 2, 3, 4, or 5. No explanation.`;

const EVAL_SAMPLE_SIZE = 50;

function formatClassificationOutput(comment: InsightComment): string {
  const themes = comment.themes ?? [];
  if (themes.length === 0) return '(no themes extracted)';
  return themes.map((t) => `- ${t.theme}: ${t.issue}`).join('\n');
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

function parseScore(text: string): number | null {
  const match = text.trim().match(/\b([1-5])\b/);
  if (match) {
    const n = parseInt(match[1], 10);
    if (n >= 1 && n <= 5) return n;
  }
  return null;
}

/**
 * Evaluates factual accuracy for theme generation using LLM-as-a-judge.
 * Samples up to EVAL_SAMPLE_SIZE comments with themes.
 * Returns average score 1–5, or 0 if no valid samples.
 */
export async function evaluateFactualAccuracy(
  comments: InsightComment[],
  apiKey: string
): Promise<number> {
  const withThemes = comments.filter((c) => Array.isArray(c.themes) && c.themes.length > 0);
  if (withThemes.length === 0) return 0;

  const sample = withThemes.slice(0, EVAL_SAMPLE_SIZE);

  const scores: number[] = [];

  for (let i = 0; i < sample.length; i++) {
    const c = sample[i];
    const classificationOutput = formatClassificationOutput(c);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        input: [
          { role: 'system', content: FACTUAL_ACCURACY_JUDGE_PROMPT },
          {
            role: 'user',
            content: `INPUT (NPS comment, score ${c.score}):\n"${c.comment}"\n\nOUTPUT (extracted issues and themes):\n${classificationOutput}\n\nScore (1-5):`,
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
    const text = extractOutputText(data).trim();
    const score = parseScore(text);
    if (score !== null) scores.push(score);
  }

  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
