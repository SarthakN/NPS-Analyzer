import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { analyzeNpsCsv, type NpsAnalysisResult } from '@/lib/npsAnalysis';

interface NpsUploadProps {
  onAnalysisComplete: (result: NpsAnalysisResult) => void;
}

export const NpsUpload: React.FC<NpsUploadProps> = ({ onAnalysisComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    const validTypes = ['text/csv', 'text/plain', 'application/vnd.ms-excel'];
    const validExts = ['.csv'];
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(f.type) && !validExts.includes(ext)) {
      toast.error('Please upload a CSV file');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5 MB');
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const handleStartAnalysis = async () => {
    if (!file) return;
    setAnalyzing(true);
    try {
      const text = await file.text();
      const result = analyzeNpsCsv(text, 1);
      onAnalysisComplete(result);
    } catch (e) {
      console.error(e);
      toast.error('Failed to analyze CSV. Please check the file format.');
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.9s', animationFillMode: 'both' }}>
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
          accept=".csv"
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
              onClick={(e) => { e.stopPropagation(); handleStartAnalysis(); }}
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
              <p className="text-xs text-muted-foreground mt-1">CSV — up to 5 MB</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
