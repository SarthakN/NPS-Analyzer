import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { NpsScoreCell } from '@/components/NpsScoreCell';
import { NpsStateMap } from '@/components/NpsStateMap';
import { Sparkles, ChevronUp, ChevronDown, Map as MapIcon, List, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { NpsAnalysisResult, NpsRow, InsightComment } from '@/lib/npsAnalysis';
import { generateCommentInsights, checkInitiativeResolution } from '@/lib/commentLabels';
import { saveInsightComments } from '@/lib/runEvals';
import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZE = 10;
const NPS_RESULT_KEY = 'nps:analysisResult';
const INITIATIVES_KEY = 'nps-initiatives';
const OPENAI_KEY_STORAGE = 'nps:openaiKey';

function loadResult(stateResult: NpsAnalysisResult | undefined): NpsAnalysisResult | undefined {
  const r = stateResult ?? (() => {
    try {
      const raw = sessionStorage.getItem(NPS_RESULT_KEY);
      return raw ? (JSON.parse(raw) as NpsAnalysisResult) : undefined;
    } catch {
      return undefined;
    }
  })();
  if (r && !Array.isArray(r.surveyComments)) {
    return { ...r, surveyComments: [] };
  }
  return r;
}

function NpsTable({
  data,
  sortOrder,
  onSortToggle,
  minResponses,
  onMinResponsesChange,
  page,
  onPageChange,
  title,
}: {
  data: NpsRow[];
  sortOrder: 'asc' | 'desc';
  onSortToggle: () => void;
  minResponses: number;
  onMinResponsesChange: (v: number) => void;
  page: number;
  onPageChange: (p: number) => void;
  title: string;
}) {
  const sorted = useMemo(() => {
    const copy = [...(data ?? [])];
    copy.sort((a, b) => (sortOrder === 'desc' ? b.nps - a.nps : a.nps - b.nps));
    return copy;
  }, [data, sortOrder]);

  const filtered = useMemo(
    () => sorted.filter((r) => (r?.responses ?? 0) >= minResponses),
    [sorted, minResponses]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="border border-border rounded-xl p-6 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-medium">{title}</h2>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Min responses:</label>
          <Input
            type="number"
            min={1}
            value={minResponses}
            onChange={(e) => onMinResponsesChange(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20"
          />
          <Button variant="outline" size="sm" onClick={onSortToggle}>
            {sortOrder === 'desc' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
            {sortOrder === 'desc' ? 'Desc' : 'Asc'}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 font-medium">Name</th>
              <th className="text-right py-2 font-medium">NPS</th>
              <th className="text-right py-2 font-medium">Responses</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, idx) => (
              <tr key={row?.name ? `${row.name}-${idx}` : `row-${idx}`} className="border-b border-border/50">
                <td className="py-2">{row?.name ?? '—'}</td>
                <td className="text-right py-2">
                  <NpsScoreCell
                    score={row?.nps ?? 0}
                    promoters={row?.promoters ?? 0}
                    passives={row?.passives ?? 0}
                    detractors={row?.detractors ?? 0}
                  />
                </td>
                <td className="text-right py-2 text-muted-foreground">{row?.responses ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > PAGE_SIZE && (
        <div className="flex justify-between mt-4 pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground">
            Showing {start + 1}-{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = loadResult((location.state as { result?: NpsAnalysisResult })?.result);

  const [districtFilter, setDistrictFilter] = useState<string>('__all__');
  const [accountSort, setAccountSort] = useState<'asc' | 'desc'>('desc');
  const [roleSort, setRoleSort] = useState<'asc' | 'desc'>('desc');
  const [stateSort, setStateSort] = useState<'asc' | 'desc'>('desc');
  const [accountMinResp, setAccountMinResp] = useState(1);
  const [roleMinResp, setRoleMinResp] = useState(1);
  const [stateMinResp, setStateMinResp] = useState(1);
  const [accountPage, setAccountPage] = useState(1);
  const [rolePage, setRolePage] = useState(1);
  const [statePage, setStatePage] = useState(1);
  const [stateViewMode, setStateViewMode] = useState<'map' | 'table'>('map');
  const [insightComments, setInsightComments] = useState<InsightComment[] | null>(null);
  const [insightsInProgress, setInsightsInProgress] = useState(false);
  const [commentThemeFilter, setCommentThemeFilter] = useState<string>('__all__');
  const [commentInitiativeFilter, setCommentInitiativeFilter] = useState<string>('__all__');
  const [commentViewMode, setCommentViewMode] = useState<'theme' | 'comments' | 'initiatives'>('comments');

  const filteredOverallNps = useMemo(() => {
    if (!result || districtFilter === '__all__') return result?.overallNps ?? null;
    const acc = (result.byAccount ?? []).find((a) => a.name === districtFilter);
    return acc?.nps ?? null;
  }, [result, districtFilter]);

  const filteredResponses = useMemo(() => {
    if (!result || districtFilter === '__all__') return result?.totalResponses ?? 0;
    const acc = (result.byAccount ?? []).find((a) => a.name === districtFilter);
    return acc?.responses ?? 0;
  }, [result, districtFilter]);

  const filteredDrilldown = useMemo(() => {
    if (!result || districtFilter === '__all__') {
      return {
        promoters: result?.overallPromoters ?? 0,
        passives: result?.overallPassives ?? 0,
        detractors: result?.overallDetractors ?? 0,
      };
    }
    const acc = (result.byAccount ?? []).find((a) => a.name === districtFilter);
    return {
      promoters: acc?.promoters ?? 0,
      passives: acc?.passives ?? 0,
      detractors: acc?.detractors ?? 0,
    };
  }, [result, districtFilter]);

  const commentsToShow: InsightComment[] =
    insightComments ??
    (result?.surveyComments ?? []).map((c) => ({ ...c, themes: [] })) ??
    [];
  const allThemes = useMemo(() => {
    const set = new Set<string>();
    commentsToShow.forEach((c) => c.themes?.forEach((t) => set.add(t.theme)));
    return Array.from(set).sort();
  }, [commentsToShow]);

  const filteredComments = useMemo(() => {
    let out = commentsToShow;
    if (commentThemeFilter !== '__all__') {
      out = out.filter((c) => c.themes?.some((t) => t.theme === commentThemeFilter));
    }
    if (commentViewMode === 'initiatives' && commentInitiativeFilter !== '__all__') {
      out = out.filter((c) =>
        c.themes?.some((t) => t.resolvedBy?.includes(commentInitiativeFilter))
      );
    }
    return out;
  }, [commentsToShow, commentThemeFilter, commentViewMode, commentInitiativeFilter]);

  const commentsByTheme = useMemo(() => {
    const byTheme: Record<string, InsightComment[]> = {};
    const uncategorized: InsightComment[] = [];
    for (const c of filteredComments) {
      if (c.themes?.length) {
        for (const t of c.themes) {
          if (!byTheme[t.theme]) byTheme[t.theme] = [];
          if (!byTheme[t.theme].includes(c)) byTheme[t.theme].push(c);
        }
      } else {
        uncategorized.push(c);
      }
    }
    if (uncategorized.length) byTheme['Other'] = uncategorized;
    return byTheme;
  }, [filteredComments]);

  const allInitiatives = useMemo(() => {
    const set = new Set<string>();
    commentsToShow.forEach((c) =>
      c.themes?.forEach((t) => t.resolvedBy?.forEach((init) => set.add(init)))
    );
    return Array.from(set).sort();
  }, [commentsToShow]);

  const commentsByInitiative = useMemo(() => {
    const byInitiative: Record<string, InsightComment[]> = {};
    const unresolved: InsightComment[] = [];
    for (const c of filteredComments) {
      let hasResolution = false;
      if (c.themes?.length) {
        for (const t of c.themes) {
          for (const init of t.resolvedBy ?? []) {
            hasResolution = true;
            if (!byInitiative[init]) byInitiative[init] = [];
            if (!byInitiative[init].includes(c)) byInitiative[init].push(c);
          }
        }
      }
      if (!hasResolution) unresolved.push(c);
    }
    if (unresolved.length) byInitiative['Unresolved'] = unresolved;
    return byInitiative;
  }, [filteredComments]);

  const handleGenerateInsights = async () => {
    const comments = result?.surveyComments ?? [];
    if (!comments.length) {
      toast.error('No comments to analyze');
      return;
    }
    let productContext = 'PowerSchool Applicant Tracking';
    let initiatives: { id: string; summary: string; product: string; description: string }[] = [];
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const { data } = await supabase
        .from('nps_initiatives')
        .select('id, summary, product, description')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      if (data?.length) {
        initiatives = data;
      }
    }
    if (initiatives.length === 0) {
      try {
        const stored = sessionStorage.getItem(INITIATIVES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { id: string; title?: string; summary?: string; product: string; description: string }[];
          initiatives = parsed.map((i) => ({
            ...i,
            summary: i.summary ?? i.title ?? '',
          }));
        }
      } catch {
        // ignore
      }
    }
    if (initiatives.length > 0) {
      const products = [...new Set(initiatives.map((i) => i.product).filter(Boolean))];
      productContext = products.length > 0 ? products.join(', ') : productContext;
    }
    const apiKey = sessionStorage.getItem(OPENAI_KEY_STORAGE);
    if (!apiKey?.trim()) {
      toast.error('Enter your OpenAI API key on the Configure page first');
      return;
    }
    setInsightsInProgress(true);
    try {
      const insights = await generateCommentInsights(comments, productContext, apiKey.trim());
      setInsightComments(insights);
      saveInsightComments(insights);
      toast.success(`Generated insights for ${insights.length} comments`);

      if (initiatives.length > 0) {
        toast.info('Checking which initiatives resolve these issues…');
        const withResolution = await checkInitiativeResolution(insights, initiatives, apiKey.trim());
        setInsightComments(withResolution);
        saveInsightComments(withResolution);
        const resolvedCount = withResolution.reduce(
          (sum, c) => sum + (c.themes?.filter((t) => t.resolvedBy?.length).length ?? 0),
          0
        );
        toast.success(`Resolution check complete. ${resolvedCount} issue(s) matched to initiatives.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate insights');
    } finally {
      setInsightsInProgress(false);
    }
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="Results — NPS Analyzer" description="View your NPS analysis results" />
        <Navbar />
        <div className="pt-32 px-4 md:px-8">
          <div className="max-w-2xl mx-auto text-center py-16">
            <p className="text-muted-foreground mb-6">No results yet. Upload a CSV and start analysis.</p>
            <Button onClick={() => navigate('/')} className="bg-[hsl(300,100%,71%)] hover:bg-[hsl(300,100%,65%)] text-foreground">
              Back to Upload
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Analysis Results — NPS Analyzer" description="Your NPS analysis insights" />
      <Navbar />
      <div className="pt-32 pb-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-medium flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Analysis Results
            </h1>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              New Analysis
            </Button>
          </div>

          <div className="border border-border rounded-xl p-6 bg-card">
            <h2 className="text-lg font-medium mb-4">Overall NPS Score</h2>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <label className="text-sm text-muted-foreground">District (Account Name):</label>
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="All / Select district" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {(result.districtFilter ?? []).map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-3xl font-bold">
              {filteredOverallNps != null ? (
                <NpsScoreCell
                  score={filteredOverallNps}
                  promoters={filteredDrilldown.promoters}
                  passives={filteredDrilldown.passives}
                  detractors={filteredDrilldown.detractors}
                  className="text-3xl"
                />
              ) : (
                '—'
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {districtFilter === '__all__' ? `${result.totalResponses ?? 0} total responses` : `${filteredResponses} responses`}
            </p>
          </div>

          <NpsTable
            data={result.byAccount ?? []}
            sortOrder={accountSort}
            onSortToggle={() => setAccountSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
            minResponses={accountMinResp}
            onMinResponsesChange={(v) => {
              setAccountMinResp(v);
              setAccountPage(1);
            }}
            page={accountPage}
            onPageChange={setAccountPage}
            title="NPS by Account Name"
          />

          <NpsTable
            data={result.byRole ?? []}
            sortOrder={roleSort}
            onSortToggle={() => setRoleSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
            minResponses={roleMinResp}
            onMinResponsesChange={(v) => {
              setRoleMinResp(v);
              setRolePage(1);
            }}
            page={rolePage}
            onPageChange={setRolePage}
            title="NPS by Roles"
          />

          <div className="border border-border rounded-xl p-6 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-medium">NPS by Inferred State Name</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Min responses:</label>
                <Input
                  type="number"
                  min={1}
                  value={stateMinResp}
                  onChange={(e) => {
                    setStateMinResp(Math.max(1, parseInt(e.target.value) || 1));
                    setStatePage(1);
                  }}
                  className="w-20"
                />
                <div className="flex border border-border rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setStateViewMode('map')}
                    className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${stateViewMode === 'map' ? 'bg-accent font-medium' : 'bg-background hover:bg-muted/50'}`}
                  >
                    <MapIcon className="w-4 h-4" />
                    Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setStateViewMode('table')}
                    className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${stateViewMode === 'table' ? 'bg-accent font-medium' : 'bg-background hover:bg-muted/50'}`}
                  >
                    <List className="w-4 h-4" />
                    Table
                  </button>
                </div>
              </div>
            </div>
            {stateViewMode === 'map' ? (
              <NpsStateMap data={result.byState ?? []} minResponses={stateMinResp} />
            ) : (
              <NpsTable
                data={result.byState ?? []}
                sortOrder={stateSort}
                onSortToggle={() => setStateSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
                minResponses={stateMinResp}
                onMinResponsesChange={(v) => {
                  setStateMinResp(v);
                  setStatePage(1);
                }}
                page={statePage}
                onPageChange={setStatePage}
                title="Table view"
              />
            )}
          </div>

          <div className="border border-border rounded-xl p-6 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Survey Comments
              </h2>
              {(result.surveyComments?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-4">
                  {insightComments && (
                    <div className="flex border border-border rounded-md overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setCommentViewMode('comments')}
                        className={`px-3 py-1.5 text-sm ${commentViewMode === 'comments' ? 'bg-accent font-medium' : 'bg-background hover:bg-muted/50'}`}
                      >
                        View by comments
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommentViewMode('theme')}
                        className={`px-3 py-1.5 text-sm ${commentViewMode === 'theme' ? 'bg-accent font-medium' : 'bg-background hover:bg-muted/50'}`}
                      >
                        View by theme
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommentViewMode('initiatives')}
                        className={`px-3 py-1.5 text-sm ${commentViewMode === 'initiatives' ? 'bg-accent font-medium' : 'bg-background hover:bg-muted/50'}`}
                      >
                        View by initiatives
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {insightComments && commentViewMode !== 'initiatives' && (
                      <>
                        <label className="text-sm text-muted-foreground">Filter by theme:</label>
                        <Select value={commentThemeFilter} onValueChange={setCommentThemeFilter}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All themes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">All</SelectItem>
                            {allThemes.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                    {insightComments && commentViewMode === 'initiatives' && (
                      <>
                        <label className="text-sm text-muted-foreground">Filter by initiative:</label>
                        <Select value={commentInitiativeFilter} onValueChange={setCommentInitiativeFilter}>
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="All initiatives" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">All</SelectItem>
                            {allInitiatives.map((init) => (
                              <SelectItem key={init} value={init}>
                                {init.length > 45 ? init.slice(0, 45) + '…' : init}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                    {insightComments ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setInsightComments(null);
                          setCommentViewMode('comments' as const);
                        setCommentInitiativeFilter('__all__');
                        }}
                      title="Clear insights from comments only. Does not affect Configure."
                    >
                      Reset insights
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateInsights}
                      disabled={insightsInProgress}
                    >
                      {insightsInProgress ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-1.5" />
                      )}
                      Generate Insights
                    </Button>
                  )}
                </div>
                </div>
              )}
            </div>
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {(result.surveyComments?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No survey comments found. Ensure your CSV has a column named &quot;Survey Comments&quot; (or &quot;Comments&quot;) with comment text, then run a new analysis.
                </p>
              ) : filteredComments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  {commentThemeFilter === '__all__' && commentInitiativeFilter === '__all__'
                    ? 'No comments.'
                    : commentViewMode === 'initiatives'
                    ? 'No comments match this initiative.'
                    : 'No comments match this theme.'}
                </p>
              ) : insightComments && commentViewMode === 'initiatives' ? (
                Object.entries(commentsByInitiative)
                  .sort(([a], [b]) => (a === 'Unresolved' ? 1 : b === 'Unresolved' ? -1 : a.localeCompare(b)))
                  .map(([initiative, comments]) => (
                    <div key={initiative} className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground sticky top-0 bg-background py-2 border-b border-border flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            initiative === 'Unresolved'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-violet-500/20 text-violet-700 dark:bg-violet-500/30 dark:text-violet-300 border border-violet-500/40'
                          }`}
                        >
                          {initiative}
                        </span>
                        ({comments.length})
                      </h3>
                      <div className="space-y-2 pl-2">
                        {comments.map((c, idx) => (
                          <div
                            key={idx}
                            className="border border-border rounded-lg p-3 text-sm bg-muted/30"
                          >
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              {c.accountName && (
                                <span className="text-xs font-medium text-muted-foreground">
                                  {c.accountName}
                                </span>
                              )}
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded ${
                                  c.sentiment === 'positive'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : c.sentiment === 'negative'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {c.sentiment === 'positive' ? 'Positive' : c.sentiment === 'negative' ? 'Negative' : 'Neutral'} (score {c.score})
                              </span>
                              {(c.themes?.filter((t) => t.resolvedBy?.includes(initiative)) ?? []).map((t, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary"
                                  title={`${t.theme}: ${t.issue}`}
                                >
                                  {t.issue.length > 40 ? t.issue.slice(0, 40) + '…' : t.issue}
                                </span>
                              ))}
                            </div>
                            <p className="text-foreground">{c.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              ) : insightComments && commentViewMode === 'theme' ? (
                Object.entries(commentsByTheme)
                  .sort(([a], [b]) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))
                  .map(([theme, comments]) => (
                    <div key={theme} className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground sticky top-0 bg-background py-2 border-b border-border">
                        {theme} ({comments.length})
                      </h3>
                      <div className="space-y-2 pl-2">
                        {comments.map((c, idx) => (
                          <div
                            key={idx}
                            className="border border-border rounded-lg p-3 text-sm bg-muted/30"
                          >
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              {c.accountName && (
                                <span className="text-xs font-medium text-muted-foreground">
                                  {c.accountName}
                                </span>
                              )}
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded ${
                                  c.sentiment === 'positive'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : c.sentiment === 'negative'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {c.sentiment === 'positive' ? 'Positive' : c.sentiment === 'negative' ? 'Negative' : 'Neutral'} (score {c.score})
                              </span>
                              {(c.themes?.filter((t) => t.theme === theme) ?? []).map((t, i) => (
                                <span key={i} className="flex flex-wrap items-center gap-1">
                                  <span
                                    className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary"
                                    title={`${t.theme}: ${t.issue}`}
                                  >
                                    {t.issue.length > 40 ? t.issue.slice(0, 40) + '…' : t.issue}
                                  </span>
                                  {t.resolvedBy?.map((init, j) => (
                                    <span
                                      key={j}
                                      className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-700 dark:bg-violet-500/30 dark:text-violet-300 border border-violet-500/40"
                                      title={`Resolved by: ${init}`}
                                    >
                                      ✓ {init.length > 35 ? init.slice(0, 35) + '…' : init}
                                    </span>
                                  ))}
                                </span>
                              ))}
                            </div>
                            <p className="text-foreground">{c.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              ) : (
                  filteredComments.map((c, idx) => (
                    <div
                      key={idx}
                      className="border border-border rounded-lg p-3 text-sm bg-muted/30"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {c.accountName && (
                          <span className="text-xs font-medium text-muted-foreground">
                            {c.accountName}
                          </span>
                        )}
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            c.sentiment === 'positive'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : c.sentiment === 'negative'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {c.sentiment === 'positive' ? 'Positive' : c.sentiment === 'negative' ? 'Negative' : 'Neutral'} (score {c.score})
                        </span>
                        {c.themes?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {c.themes.map((t, i) => (
                              <span key={i} className="flex flex-wrap items-center gap-1">
                                <span
                                  className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary"
                                  title={`${t.theme}: ${t.issue}`}
                                >
                                  {t.theme} — {t.issue.length > 40 ? t.issue.slice(0, 40) + '…' : t.issue}
                                </span>
                                {t.resolvedBy?.map((init, j) => (
                                  <span
                                    key={j}
                                    className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-700 dark:bg-violet-500/30 dark:text-violet-300 border border-violet-500/40"
                                    title={`Resolved by: ${init}`}
                                  >
                                    ✓ {init.length > 35 ? init.slice(0, 35) + '…' : init}
                                  </span>
                                ))}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-foreground">{c.comment}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
