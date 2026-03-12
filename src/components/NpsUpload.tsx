import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Loader2, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-nps`;

interface NpsUploadProps {
  activeTab: 'upload' | 'results';
  onActiveTabChange: (tab: 'upload' | 'results') => void;
  onAnalysisStart: () => void;
}

export const NpsUpload: React.FC<NpsUploadProps> = ({ activeTab, onActiveTabChange, onAnalysisStart }) => {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    const validTypes = ['text/csv', 'text/plain', 'application/vnd.ms-excel'];
    const validExts = ['.csv', '.txt', '.tsv'];
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(f.type) && !validExts.includes(ext)) {
      toast.error('Please upload a CSV or text file');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5 MB');
      return;
    }
    setFile(f);
    setResult('');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setResult('');
    onAnalysisStart();

    try {
      const text = await file.text();

      const resp = await fetch(ANALYZE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ fileContent: text }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Analysis failed' }));
        toast.error(err.error || 'Analysis failed');
        setAnalyzing(false);
        onActiveTabChange('upload');
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              full += content;
              setResult(full);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong during analysis');
      onActiveTabChange('upload');
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult('');
    if (inputRef.current) inputRef.current.value = '';
    onActiveTabChange('upload');
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.9s', animationFillMode: 'both' }}>
      <Tabs value={activeTab} onValueChange={(v) => onActiveTabChange(v as 'upload' | 'results')}>
        <TabsList className="w-full mb-6">
          <TabsTrigger value="upload" className="flex-1">Upload</TabsTrigger>
          <TabsTrigger value="results" className="flex-1" disabled={!result && !analyzing}>Results</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 md:p-12 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-foreground bg-accent'
                : file
                ? 'border-foreground/40 bg-accent/50'
                : 'border-border hover:border-foreground/40 hover:bg-accent/30'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt,.tsv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {file ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); reset(); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  onClick={(e) => { e.stopPropagation(); analyze(); }}
                  disabled={analyzing}
                  className="bg-[hsl(300,100%,71%)] hover:bg-[hsl(300,100%,65%)] text-foreground font-medium px-6"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Start Analysis
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Drop your NPS data file here</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV or TXT — up to 5 MB</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="results">
          {(result || analyzing) ? (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Analysis Results
                </h2>
                <Button variant="outline" size="sm" onClick={reset}>
                  New Analysis
                </Button>
              </div>
              <div className="prose prose-sm max-w-none border border-border rounded-xl p-6 bg-card text-card-foreground [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_strong]:text-foreground">
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }} />
                {analyzing && <span className="inline-block w-2 h-4 bg-foreground/60 animate-pulse ml-0.5" />}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <p>No results yet. Upload a file and start analysis.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

/** Minimal markdown → HTML renderer */
function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}
