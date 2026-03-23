/**
 * AI-powered analysis of survey comments.
 * - Generate Insights: breaks down comments into issues, assigns themes using product context.
 * - Resolution check: after insights, determines which Roadmap items would resolve each issue.
 */

import type { SurveyComment, InsightComment, CommentInsight } from './npsAnalysis';

export interface Roadmap {
  id: string;
  summary: string;
  product: string;
  description: string;
}

const INSIGHTS_SYSTEM_PROMPT = `You are a product analyst. Your task is to analyze NPS survey comments.

For each comment:
1. Break it down into distinct issues or product areas mentioned (e.g. "slow performance", "confusing navigation", "missing feature").
2. Assign a product feature to each issue (e.g. Application manager, workflow, reference, etc.).
3. Assign a theme to each issue using the predefined high-level themes below.
4. Use the detailed guidance under each theme to determine the correct classification.
5. Use concise, consistent theme names and normalized issue phrasing.

Output ONLY a JSON array of objects. Each object must have:
- "issue": short, normalized description of the issue
- "feature": product feature area (e.g. Application manager, Reference)
- "theme": one of the predefined high-level themes below

Example:
[
  {"issue": "slow performance", "feature": "Reference", "theme": "Performance & Stability"},
  {"issue": "confusing navigation structure", "feature": "Application manager", "theme": "Product Experience"}
]

Write issues in a normalized, reusable format:
- Use short noun phrases (not sentences)
- Avoid synonyms when possible
- Prefer standard terms (e.g., "slow performance" instead of "takes too long")
- Avoid combining multiple issues into one

Use ONLY the following themes (no new themes allowed):

1. UI Experience (User Interface, Navigation & Information Architecture, Ease of Use / Usability)
   
2. Product Features (Features & Functionality)

3. Performance (Speed, Reliability & Uptime)
   
4. Reporting & Analytics (dashboards, metrics, exports)

5. Adoption & Enablement (Onboarding & Setup, Documentation & Learning Resources, In-product Guidance)

6. Support & Service (Customer Support, Account Management / Success)
   
7. Commercial & Value (Pricing & Packaging, Perceived Value / ROI)

8. Trust & Compliance (Security & Privacy, Compliance & Governance)
   
9. Integrations & APIs (External Systems, APIs)

10. Bugs & Errors (defects, incorrect behavior)

11. Other (only if nothing fits)

Rules:
- Assign ONLY the high-level theme (e.g., "UI Experience", NOT "User Interface")
- Do not create new themes
- Do not assign multiple themes to the same issue
- If the comment has no clear issues, output: []`;

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
              content: `Product context: ${productContext}\n\nComment (score ${c.score}): "${c.comment}"\n\nIssues, features, and themes (JSON array):`,
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
            .map((x: { issue: string; feature?: string; theme: string }) => ({
              issue: String(x.issue),
              feature: x.feature != null ? String(x.feature) : undefined,
              theme: String(x.theme),
            }));
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

const RESOLUTION_SYSTEM_PROMPT = `You are a product analyst. Given an NPS comment issue and a list of product Roadmap items (each with summary and description), determine which Roadmap items would resolve or address that issue.

For each issue, output the EXACT Roadmap summary text for any Roadmap item that would resolve it. Only include items whose description clearly addresses the problem. Be conservative: if unsure, omit.

Output ONLY a JSON array of Roadmap summary strings. Use the exact summary text from the Roadmap list. Example: ["Improve search and navigation"] or [] if none apply.`;

/**
 * Maps AI-returned strings to canonical Roadmap summaries.
 * The AI may return the summary, the description, or a paraphrase—we normalize to the Roadmap item's summary.
 */
function normalizeResolvedBy(
  raw: string[],
  roadmaps: Roadmap[]
): string[] {
  const canonical = new Set<string>();
  for (const s of raw) {
    const lower = s.toLowerCase().trim();
    if (!lower) continue;
    for (const item of roadmaps) {
      const summary = (item.summary ?? '').trim();
      const summaryLower = summary.toLowerCase();
      const desc = (item.description ?? '').trim();
      const descLower = desc.toLowerCase();
      const matches =
        summaryLower === lower ||
        (summaryLower && (lower.includes(summaryLower) || summaryLower.includes(lower))) ||
        descLower === lower ||
        (descLower && lower.length > 20 && (descLower.includes(lower) || lower.includes(descLower.slice(0, 80))));
      if (matches) {
        canonical.add(summary);
        break;
      }
    }
  }
  return Array.from(canonical);
}

/**
 * Second-pass analysis: after Generate Insights, check which Roadmap items would resolve each broken-down issue.
 * Runs automatically when Roadmap items exist.
 */
export async function checkRoadmapResolution(
  insightComments: InsightComment[],
  roadmaps: Roadmap[],
  apiKey: string
): Promise<InsightComment[]> {
  if (roadmaps.length === 0) return insightComments;

  const roadmapContext = roadmaps
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
                  content: `Roadmap:\n${roadmapContext}\n\nComment: "${c.comment}"\n\nIssue: "${t.issue}"${t.feature ? ` (feature: ${t.feature})` : ''} (theme: ${t.theme})\n\nWhich Roadmap summaries would resolve this issue? (JSON array):`,
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
              resolvedBy = normalizeResolvedBy(raw, roadmaps);
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

