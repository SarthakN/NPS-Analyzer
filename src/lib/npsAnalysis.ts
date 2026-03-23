/**
 * NPS Analysis - Analyzes CSV with Survey Score, Account Name, Roles, Inferred State Name
 *
 * Classification is based strictly on the Survey Score value in the file:
 * - Promoter: score is 9 or 10
 * - Passive: score is 7 or 8
 * - Detractor: score is 0, 1, 2, 3, 4, 5, or 6 (<=6)
 * Breakdown is always computed from the actual data in the file.
 */

import Papa from 'papaparse';

const SCORE_COLUMN_CANDIDATES = ['Survey Score', 'SurveyScore', 'Score', 'survey_score', 'survey score'];
const COMMENT_COLUMN_CANDIDATES = ['Survey Comment', 'Survey Comments', 'SurveyComments', 'Comments', 'Comment', 'survey comment', 'survey comments'];

/** Promoter: 9 or 10. Passive: 7 or 8. Detractor: <=6 */
function getCounts(scores: number[]) {
  const promoters = scores.filter((s) => s === 9 || s === 10).length;
  const passives = scores.filter((s) => s === 7 || s === 8).length;
  const detractors = scores.filter((s) => s <= 6 && s >= 0).length;
  return { promoters, passives, detractors };
}

export interface NpsRow {
  name: string;
  nps: number;
  responses: number;
  promoters: number;
  passives: number;
  detractors: number;
}

export interface SurveyComment {
  comment: string;
  score: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  accountName?: string;
}

export interface LabeledComment extends SurveyComment {
  labels: string[];
}

export interface CommentInsight {
  issue: string;
  /** Product feature area (e.g. Application manager, Reference) */
  feature?: string;
  theme: string;
  /** Roadmap summaries that would resolve this issue (from second-pass resolution check) */
  resolvedBy?: string[];
}

export interface InsightComment extends SurveyComment {
  themes: CommentInsight[];
}

export interface NpsAnalysisResult {
  overallNps: number | null;
  totalResponses: number;
  overallPromoters: number;
  overallPassives: number;
  overallDetractors: number;
  districtFilter: string[];
  byAccount: NpsRow[];
  byRole: NpsRow[];
  byState: NpsRow[];
  surveyComments: SurveyComment[];
}

function parseScore(val: string): number | null {
  try {
    const s = parseFloat(String(val).trim());
    if (!isNaN(s) && s >= 0 && s <= 10) {
      return Math.round(s);
    }
  } catch {
    // ignore
  }
  return null;
}

function calculateNps(scores: number[]): number | null {
  if (!scores.length) return null;
  const { promoters, detractors } = getCounts(scores);
  const total = scores.length;
  return Math.round(((promoters - detractors) / total) * 1000) / 10;
}

function parseCsv(text: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data || [];
}

function getCol(row: Record<string, string>, candidates: string[]): string {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const key = keys.find((k) => String(k).replace(/\uFEFF/g, '').trim().toLowerCase() === c.toLowerCase());
    const val = key != null ? row[key] : undefined;
    if (val != null && String(val).trim()) return String(val).trim();
  }
  return '';
}

function getScore(row: Record<string, string>): number | null {
  const keys = Object.keys(row);
  const key = keys.find((k) => {
    const normalized = String(k).replace(/\uFEFF/g, '').trim().toLowerCase();
    return SCORE_COLUMN_CANDIDATES.some((c) => normalized === c.toLowerCase());
  });
  if (!key) return null;
  return parseScore(row[key] ?? '');
}

function getComment(row: Record<string, string>): string {
  const keys = Object.keys(row);
  const key = keys.find((k) => {
    const normalized = String(k).replace(/\uFEFF/g, '').trim().toLowerCase();
    return COMMENT_COLUMN_CANDIDATES.some((c) => normalized === c.toLowerCase());
  });
  if (!key) return '';
  return String(row[key] ?? '').trim();
}

function getSentiment(score: number): 'positive' | 'neutral' | 'negative' {
  if (score >= 9) return 'positive';
  if (score >= 7) return 'neutral';
  return 'negative';
}

export function analyzeNpsCsv(
  csvText: string,
  minResponses: number = 1
): NpsAnalysisResult {
  const rows = parseCsv(csvText);
  const surveyScores: number[] = [];
  const surveyComments: SurveyComment[] = [];
  const byAccount = new Map<string, number[]>();
  const byRole = new Map<string, number[]>();
  const byState = new Map<string, number[]>();

  for (const row of rows) {
    const score = getScore(row);
    if (score === null) continue;
    surveyScores.push(score);

    const comment = getComment(row);
    const account = getCol(row, ['Account Name', 'AccountName']);
    if (comment) {
      surveyComments.push({
        comment,
        score,
        sentiment: getSentiment(score),
        accountName: account || undefined,
      });
    }

    if (account) {
      if (!byAccount.has(account)) byAccount.set(account, []);
      byAccount.get(account)!.push(score);
    }

    const role = getCol(row, ['Roles', 'Role']);
    if (role) {
      if (!byRole.has(role)) byRole.set(role, []);
      byRole.get(role)!.push(score);
    }

    const state = getCol(row, ['Inferred State Name', 'Inferred State', 'State']);
    if (state && !['N/A', 'NA', ''].includes(state.toUpperCase())) {
      if (!byState.has(state)) byState.set(state, []);
      byState.get(state)!.push(score);
    }
  }

  const overallNps = calculateNps(surveyScores);
  const overallCounts = getCounts(surveyScores);
  const districtFilter = Array.from(byAccount.keys()).sort();

  const toList = (
    map: Map<string, number[]>,
    minResp: number
  ): NpsRow[] => {
    const list: NpsRow[] = [];
    map.forEach((scores, name) => {
      if (scores.length >= minResp) {
        const nps = calculateNps(scores);
        if (nps !== null) {
          const { promoters, passives, detractors } = getCounts(scores);
          list.push({
            name,
            nps,
            responses: scores.length,
            promoters,
            passives,
            detractors,
          });
        }
      }
    });
    return list.sort((a, b) => b.nps - a.nps);
  };

  return {
    overallNps,
    totalResponses: surveyScores.length,
    overallPromoters: overallCounts.promoters,
    overallPassives: overallCounts.passives,
    overallDetractors: overallCounts.detractors,
    districtFilter,
    byAccount: toList(byAccount, minResponses),
    byRole: toList(byRole, minResponses),
    byState: toList(byState, minResponses),
    surveyComments,
  };
}
