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
import { Sparkles, ChevronUp, ChevronDown, Map, List } from 'lucide-react';
import type { NpsAnalysisResult, NpsRow } from '@/lib/npsAnalysis';

const PAGE_SIZE = 10;
const NPS_RESULT_KEY = 'nps:analysisResult';

function loadResult(stateResult: NpsAnalysisResult | undefined): NpsAnalysisResult | undefined {
  if (stateResult) return stateResult;
  try {
    const raw = sessionStorage.getItem(NPS_RESULT_KEY);
    if (raw) return JSON.parse(raw) as NpsAnalysisResult;
  } catch {
    // ignore
  }
  return undefined;
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
                    <Map className="w-4 h-4" />
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
        </div>
      </div>
    </div>
  );
};

export default Results;
