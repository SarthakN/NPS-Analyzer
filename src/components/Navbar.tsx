import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Settings2, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  loadBenchmarks,
  saveBenchmarks,
  loadEnabledMetrics,
  saveEnabledMetrics,
  BENCHMARK_DEFAULTS,
  BENCHMARK_LABELS,
  BENCHMARK_KEYS,
  toInputValue,
  fromInputValue,
  type BenchmarkKey,
} from '@/lib/benchmarks';

const BENCHMARK_CATEGORIES = [
  'Classification Quality',
  'Safety',
  'System Performance',
  'Output Similarity',
  'Safety & Reliability',
] as const;
import {
  runEvals,
  saveEvalResult,
  getNpsResultFromStorage,
} from '@/lib/runEvals';

const navLinkClass =
  'relative overflow-hidden h-[34px] px-3 flex items-center text-[11px] font-medium uppercase border border-black leading-none group';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [benchmarks, setBenchmarks] = useState(() => loadBenchmarks());
  const [enabledMetrics, setEnabledMetrics] = useState(() => loadEnabledMetrics());
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (advancedOpen) {
      setBenchmarks(loadBenchmarks());
      setEnabledMetrics(loadEnabledMetrics());
    }
  }, [advancedOpen]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return createPortal(
    <>
    <nav className="fixed top-8 left-4 md:left-8 right-4 md:right-8 z-[2000] flex items-center justify-between gap-4">
      <div className="flex items-center gap-0">
      {/* Logo */}
      <Link
        to="/"
        className="bg-black text-white h-[34px] w-[34px] border border-black flex items-center justify-center shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" className="w-4 h-4">
          <g id="smiley-smirk">
            <path id="Subtract" fill="currentColor" stroke="currentColor" strokeWidth="0.5" fillRule="evenodd" d="M1.83645 1.83645C3.06046 0.612432 4.82797 0 7 0s3.9395 0.612432 5.1636 1.83645C13.3876 3.06046 14 4.82797 14 7s-0.6124 3.9395 -1.8364 5.1636C10.9395 13.3876 9.17203 14 7 14s-3.93954 -0.6124 -5.16355 -1.8364C0.612432 10.9395 0 9.17203 0 7s0.612432 -3.93954 1.83645 -5.16355ZM5.0769 4.98816c0 -0.34518 -0.27982 -0.625 -0.625 -0.625 -0.34517 0 -0.625 0.27982 -0.625 0.625v0.7c0 0.34518 0.27983 0.625 0.625 0.625 0.34518 0 0.625 -0.27982 0.625 -0.625v-0.7Zm5.0962 0c0 -0.34518 -0.27983 -0.625 -0.625 -0.625 -0.34518 0 -0.625 0.27982 -0.625 0.625v0.7c0 0.34518 0.27982 0.625 0.625 0.625 0.34517 0 0.625 -0.27982 0.625 -0.625v-0.7Zm0.1787 2.42929c0.3217 0.12505 0.4812 0.48724 0.3561 0.80897 -0.2805 0.72182 -0.75537 1.29603 -1.40641 1.68306 -0.64416 0.38292 -1.4264 0.56282 -2.30149 0.56282 -0.34518 0 -0.625 -0.2798 -0.625 -0.62501 0 -0.34518 0.27982 -0.625 0.625 -0.625 0.7083 0 1.25628 -0.14564 1.66273 -0.38728 0.39956 -0.23753 0.69571 -0.58697 0.88012 -1.06143 0.12505 -0.32173 0.48725 -0.48117 0.80895 -0.35613Z" clipRule="evenodd"></path>
          </g>
        </svg>
      </Link>

      {/* Tab-like navigation */}
      <div className="flex items-center">
        <Link
          to="/results"
          className={`${navLinkClass} -ml-px ${
            isActive('/results')
              ? 'bg-[hsl(300,100%,71%)] text-black'
              : location.pathname === '/'
              ? 'bg-white text-black opacity-60 cursor-not-allowed pointer-events-none'
              : 'bg-white text-black'
          }`}
        >
          <span className="relative z-10">Results</span>
          {!isActive('/results') && location.pathname !== '/' && (
            <span className="absolute inset-0 bg-[hsl(300,100%,71%)] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          )}
        </Link>
        <Link
          to="/configure"
          className={`${navLinkClass} -ml-px ${isActive('/configure') ? 'bg-[hsl(300,100%,71%)] text-black' : 'bg-white text-black'}`}
        >
          <span className="relative z-10">Configure</span>
          {!isActive('/configure') && (
            <span className="absolute inset-0 bg-[hsl(300,100%,71%)] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          )}
        </Link>
      </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAdvancedOpen(true)}
        className="h-[34px] border-black/30 bg-white/60 hover:bg-[hsl(300,100%,71%)] hover:border-black text-[10px] font-medium uppercase shrink-0 opacity-60 hover:opacity-100 text-muted-foreground hover:text-foreground"
      >
        <Settings2 className="w-3 h-3 mr-1" />
        Dev mode
      </Button>
    </nav>
    <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Dev mode</SheetTitle>
          <SheetDescription>
            Set benchmark thresholds for eval tests (theme generation quality).
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => {
                const allSelected = BENCHMARK_KEYS.every((k) => enabledMetrics[k]);
                const next = Object.fromEntries(
                  BENCHMARK_KEYS.map((k) => [k, !allSelected])
                ) as Record<BenchmarkKey, boolean>;
                setEnabledMetrics(next);
                saveEnabledMetrics(next);
              }}
            >
              {BENCHMARK_KEYS.every((k) => enabledMetrics[k]) ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto pr-2">
            {BENCHMARK_CATEGORIES.map((category) => {
              const keysInCategory = BENCHMARK_KEYS.filter(
                (k) => BENCHMARK_DEFAULTS[k].category === category
              );
              if (keysInCategory.length === 0) return null;
              return (
                <div key={category}>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 mt-4 first:mt-0">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {keysInCategory.map((key) => {
              const spec = benchmarks[key];
              const label = BENCHMARK_LABELS[key];
              const displayValue = toInputValue(spec);
              const isPercent = spec.unit === 'percent';
              const isRaw = spec.unit === 'raw';
              const min = spec.scale?.[0] ?? (isPercent ? 0 : 0);
              const max = spec.scale?.[1] ?? (isPercent ? 100 : isRaw ? 10000 : 5);
              const enabled = enabledMetrics[key];
              return (
                <div key={key} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <Checkbox
                    id={`metric-${key}`}
                    checked={enabled}
                    onCheckedChange={(checked) => {
                      const next = { ...enabledMetrics, [key]: !!checked };
                      setEnabledMetrics(next);
                      saveEnabledMetrics(next);
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <label htmlFor={`metric-${key}`} className="text-sm font-medium block mb-1.5 cursor-pointer">
                      {label}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={min}
                        max={max}
                        step={isPercent ? 1 : isRaw ? (spec.target < 0.1 ? 0.001 : 1) : 0.5}
                        value={displayValue}
                        disabled={!enabled}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) {
                            const next = {
                              ...benchmarks,
                              [key]: {
                                ...spec,
                                target: fromInputValue(spec, val),
                              },
                            };
                            setBenchmarks(next);
                            saveBenchmarks(next);
                          }
                        }}
                        className="border-border w-24"
                      />
                      {isPercent && <span className="text-sm text-muted-foreground">%</span>}
                      {spec.unit === 'score' && spec.scale && (
                        <span className="text-sm text-muted-foreground">/ {max}</span>
                      )}
                      {isRaw && spec.description?.includes('ms') && (
                        <span className="text-sm text-muted-foreground">ms</span>
                      )}
                    </div>
                    {spec.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{spec.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={running || BENCHMARK_KEYS.every((k) => !enabledMetrics[k])}
            onClick={async () => {
              const npsResult = getNpsResultFromStorage();
              if (!npsResult?.surveyComments?.length) {
                toast.error('No NPS data found. Upload a file and run analysis first.');
                return;
              }
              setRunning(true);
              try {
                const enabled = BENCHMARK_KEYS.filter((k) => enabledMetrics[k]);
                const apiKey = sessionStorage.getItem('nps:openaiKey');
                const result = await runEvals(npsResult, enabled, apiKey ?? undefined);
                saveEvalResult(result);
                setAdvancedOpen(false);
                navigate('/evaluation', { state: { result } });
                toast.success('Evaluation complete');
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Evaluation failed');
              } finally {
                setRunning(false);
              }
            }}
          >
            {running ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run evaluation
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setBenchmarks(BENCHMARK_DEFAULTS);
              saveBenchmarks(BENCHMARK_DEFAULTS);
              toast.success('Benchmarks reset to defaults');
            }}
          >
            Reset to defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
    </>,
    document.body
  );
};
