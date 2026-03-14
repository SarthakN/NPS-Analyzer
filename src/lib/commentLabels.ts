/**
 * AI-powered analysis of survey comments.
 * - Generate Insights: breaks down comments into issues, assigns themes using product context.
 * - Resolution check: after insights, determines which initiatives would resolve each issue.
 */

import type { SurveyComment, LabeledComment, InsightComment, CommentInsight } from './npsAnalysis';

export interface Initiative {
  id: string;
  summary: string;
  product: string;
  description: string;
}

const INSIGHTS_SYSTEM_PROMPT = `You are a product analyst. Your task is to analyze NPS survey comments.

For each comment:
1. Break it down into distinct issues or product areas mentioned (e.g. "slowness", "hard to find features", "poor support").
2. Assign a theme to each issue using the product context. Themes are product-relevant categories (e.g. "Performance", "Navigation/UX", "Support", "Integrations", "Reporting", "Workflow").
3. Use concise, consistent theme names that fit the product domain.

Output ONLY a JSON array of objects. Each object has "issue" (short description of the issue) and "theme" (the assigned theme). Example:
[{"issue": "slowness when loading", "theme": "Performance"}, {"issue": "hard to find where to navigate", "theme": "Navigation/UX"}].

If the comment has no clear issues, output: []`;

export async function generateCommentInsights(
  comments: SurveyComment[],
  productContext: string,
  apiKey: string
): Promise<InsightComment[]> {
  const results: InsightComment[] = [];
  const batchSize = 5;

  for (let i = 0; i < comments.length; i += batchSize) {
    const batch = comments.slice(i, i + batchSize);
    const promises = batch.map(async (c) => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: INSIGHTS_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Product context: ${productContext}\n\nComment (score ${c.score}): "${c.comment}"\n\nIssues and themes (JSON array):`,
            },
          ],
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim() ?? '[]';
      let themes: CommentInsight[] = [];
      try {
        const parsed = JSON.parse(text.replace(/```json?\s*|\s*```/g, ''));
        if (Array.isArray(parsed)) {
          themes = parsed
            .filter((x: unknown) => x && typeof x === 'object' && 'issue' in x && 'theme' in x)
            .map((x: { issue: string; theme: string }) => ({ issue: String(x.issue), theme: String(x.theme) }));
        }
      } catch {
        // ignore parse errors
      }

      return { ...c, themes };
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }

  return results;
}

const RESOLUTION_SYSTEM_PROMPT = `You are a product analyst. Given an NPS comment issue and a list of product initiatives (each with summary and description), determine which initiatives would resolve or address that issue.

For each issue, output the EXACT initiative summary text for any initiative that would resolve it. Only include initiatives whose description clearly addresses the problem. Be conservative: if unsure, omit.

Output ONLY a JSON array of initiative summary strings. Use the exact summary text from the initiatives list. Example: ["Improve search and navigation"] or [] if none apply.`;

/**
 * Maps AI-returned strings to canonical initiative summaries.
 * The AI may return the summary, the description, or a paraphrase—we normalize to the initiative's summary.
 */
function normalizeResolvedBy(
  raw: string[],
  initiatives: Initiative[]
): string[] {
  const canonical = new Set<string>();
  for (const s of raw) {
    const lower = s.toLowerCase().trim();
    if (!lower) continue;
    for (const init of initiatives) {
      const summary = (init.summary ?? '').trim();
      const summaryLower = summary.toLowerCase();
      const desc = (init.description ?? '').trim();
      const descLower = desc.toLowerCase();
      const matches =
        summaryLower === lower ||
        (summaryLower && (lower.includes(summaryLower) || summaryLower.includes(lower))) ||
        descLower === lower ||
        (descLower && lower.length > 20 && (descLower.includes(lower) || lower.includes(descLower.slice(0, 80))));
      if (matches) {
        canonical.add(summary || init.summary);
        break;
      }
    }
  }
  return Array.from(canonical);
}

/**
 * Second-pass analysis: after Generate Insights, check which initiatives would resolve each broken-down issue.
 * Runs automatically when initiatives exist.
 */
export async function checkInitiativeResolution(
  insightComments: InsightComment[],
  initiatives: Initiative[],
  apiKey: string
): Promise<InsightComment[]> {
  if (initiatives.length === 0) return insightComments;

  const initiativeContext = initiatives
    .map((i) => `- "${i.summary}": ${(i.description ?? '').slice(0, 400)}`)
    .join('\n');

  const results: InsightComment[] = [];
  const batchSize = 5;

  for (let i = 0; i < insightComments.length; i += batchSize) {
    const batch = insightComments.slice(i, i + batchSize);
    const promises = batch.map(async (c) => {
      const themesWithResolved: CommentInsight[] = [];

      for (const t of c.themes ?? []) {
        let resolvedBy: string[] = [];
        if (t.issue) {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: RESOLUTION_SYSTEM_PROMPT },
                {
                  role: 'user',
                  content: `Initiatives:\n${initiativeContext}\n\nComment: "${c.comment}"\n\nIssue: "${t.issue}" (theme: ${t.theme})\n\nWhich initiative summaries would resolve this issue? (JSON array):`,
                },
              ],
              max_tokens: 150,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const text = data?.choices?.[0]?.message?.content?.trim() ?? '[]';
            try {
              const parsed = JSON.parse(text.replace(/```json?\s*|\s*```/g, ''));
              const raw = Array.isArray(parsed)
                ? parsed.filter((s: unknown) => typeof s === 'string').map((s: string) => String(s).trim()).filter(Boolean)
                : [];
              resolvedBy = normalizeResolvedBy(raw, initiatives);
            } catch {
              // ignore
            }
          }
        }
        themesWithResolved.push({ ...t, resolvedBy: resolvedBy.length ? resolvedBy : undefined });
      }

      return { ...c, themes: themesWithResolved };
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }

  return results;
}

const LABEL_SYSTEM_PROMPT = `You are a product analyst. Your task is to label NPS survey comments.

Given a comment and a list of initiatives (each with summary and description), assign one or more labels:
1. When the comment mentions a problem that an initiative solves, use that initiative's summary text EXACTLY as the label (e.g. if the initiative summary is "Improve search and navigation", output "Improve search and navigation" - never output "Initiative summary")
2. "Support" - when the comment mentions lack of support, poor support, or support issues
3. "Performance" - when the comment mentions slowness or performance issues
4. "Integrations" - when the comment mentions lack of integrations with other products

Output ONLY a JSON array of label strings. No other text. Example: ["Support"] or ["Improve search and navigation", "Support"]
If no labels apply, output: []`;

export async function labelComments(
  comments: SurveyComment[],
  initiatives: Initiative[],
  apiKey: string
): Promise<LabeledComment[]> {
  const initiativeContext = initiatives
    .map((i) => `- "${i.summary}": ${i.description?.slice(0, 300) ?? ''}...`)
    .join('\n');

  const results: LabeledComment[] = [];
  const batchSize = 5;

  for (let i = 0; i < comments.length; i += batchSize) {
    const batch = comments.slice(i, i + batchSize);
    const promises = batch.map(async (c) => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: LABEL_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Initiatives:\n${initiativeContext || '(none)'}\n\nComment (score ${c.score}): "${c.comment}"\n\nLabels (JSON array):`,
            },
          ],
          max_tokens: 100,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim() ?? '[]';
      let labels: string[] = [];
      try {
        const parsed = JSON.parse(text.replace(/```json?\s*|\s*```/g, ''));
        labels = Array.isArray(parsed) ? parsed.filter((l: unknown) => typeof l === 'string') : [];
      } catch {
        // ignore parse errors
      }

      return { ...c, labels };
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }

  return results;
}
