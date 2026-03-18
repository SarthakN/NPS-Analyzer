import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { loadEvalResult } from '@/lib/runEvals';

const Evaluation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const result = (location.state as { result?: ReturnType<typeof loadEvalResult> })?.result ?? loadEvalResult();

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="Evaluation — NPS Analyzer" description="Eval results" />
        <Navbar />
        <div className="pt-32 pb-24 px-4 md:px-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-medium mb-4">Evaluation Results</h1>
            <p className="text-muted-foreground mb-6">
              No evaluation results found. Run an evaluation from Dev mode first (upload NPS data, generate insights, then run evaluation).
            </p>
            <Button variant="outline" onClick={() => navigate('/results')}>
              Go to Results
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const withValue = result.results.filter((r) => r.passed !== null);
  const passedCount = withValue.filter((r) => r.passed).length;
  const totalCount = withValue.length;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Evaluation — NPS Analyzer" description="Eval results" />
      <Navbar />
      <div className="pt-32 pb-24 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-medium mb-2">Evaluation Results</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Ran at {new Date(result.ranAt).toLocaleString()}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="border border-border rounded-lg p-4 bg-card">
              <p className="text-xs text-muted-foreground uppercase">Total comments</p>
              <p className="text-2xl font-medium">{result.totalComments}</p>
            </div>
            <div className="border border-border rounded-lg p-4 bg-card">
              <p className="text-xs text-muted-foreground uppercase">With themes</p>
              <p className="text-2xl font-medium">{result.commentsWithThemes}</p>
            </div>
            <div className="border border-border rounded-lg p-4 bg-card">
              <p className="text-xs text-muted-foreground uppercase">Unique themes</p>
              <p className="text-2xl font-medium">{result.uniqueThemes}</p>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium">Metric</th>
                  <th className="text-right py-3 px-4 font-medium">Value</th>
                  <th className="text-right py-3 px-4 font-medium">Target</th>
                  <th className="text-center py-3 px-4 font-medium w-16">Pass</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r) => (
                  <tr key={r.key} className="border-b border-border/50">
                    <td className="py-3 px-4">{r.label}</td>
                    <td className="text-right py-3 px-4">
                      {r.value !== null
                        ? r.unit === 'percent'
                          ? `${(r.value * 100).toFixed(1)}%`
                          : r.unit === 'raw' && r.value < 1
                          ? r.value.toFixed(3)
                          : r.value.toFixed(1)
                        : 'N/A'}
                    </td>
                    <td className="text-right py-3 px-4 text-muted-foreground">{r.target}</td>
                    <td className="text-center py-3 px-4">
                      {r.passed === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : r.passed ? (
                        <Check className="w-5 h-5 text-green-600 inline" />
                      ) : (
                        <X className="w-5 h-5 text-red-500 inline" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {passedCount} of {totalCount} metrics passed
            </p>
            <Button variant="outline" onClick={() => navigate('/results')}>
              Back to Results
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Evaluation;
