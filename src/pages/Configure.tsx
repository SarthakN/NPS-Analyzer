import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { INITIATIVE_DESCRIPTION_SYSTEM_PROMPT } from '@/INITIATIVE_DESCRIPTION';
import { supabase } from '@/integrations/supabase/client';

const INITIATIVES_KEY = 'nps-initiatives';
const OPENAI_KEY_STORAGE = 'nps:openaiKey';

const PRODUCT_OPTIONS = [
  'PowerSchool Applicant Tracking',
  'PowerSchool Sourcing',
  'PowerSchool Records',
  'PowerSchool Smart Find Express',
] as const;

interface Initiative {
  id: string;
  summary: string;
  product: string;
  description: string;
}

const Configure = () => {
  const location = useLocation();
  const [openaiApiKey, setOpenaiApiKey] = useState(() => {
    try {
      return sessionStorage.getItem(OPENAI_KEY_STORAGE) ?? '';
    } catch {
      return '';
    }
  });
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [summary, setSummary] = useState('');
  const [product, setProduct] = useState<string>(PRODUCT_OPTIONS[0]);
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loadingInitiatives, setLoadingInitiatives] = useState(true);

  const loadInitiativesFromDb = useCallback(async () => {
    setLoadingInitiatives(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const { data, error } = await supabase
        .from('nps_initiatives')
        .select('id, summary, product, description')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        setInitiatives(data.map((r) => ({
          id: r.id,
          summary: r.summary ?? '',
          product: r.product ?? '',
          description: r.description ?? '',
        })));
      } else {
        try {
          const stored = sessionStorage.getItem(INITIATIVES_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as { id: string; title?: string; summary?: string; product: string; description: string }[];
            const toMigrate = parsed.map((i) => ({
              summary: i.summary ?? i.title ?? '',
              product: i.product ?? '',
              description: i.description ?? '',
            }));
            if (toMigrate.length > 0) {
              const inserted: Initiative[] = [];
              for (const item of toMigrate) {
                const { data: insertedRow, error: insertErr } = await supabase
                  .from('nps_initiatives')
                  .insert({
                    user_id: session.user.id,
                    summary: item.summary,
                    product: item.product,
                    description: item.description,
                  })
                  .select('id, summary, product, description')
                  .single();
                if (!insertErr && insertedRow) {
                  inserted.push({
                    id: insertedRow.id,
                    summary: insertedRow.summary,
                    product: insertedRow.product,
                    description: insertedRow.description,
                  });
                }
              }
              setInitiatives(inserted.length > 0 ? inserted : parsed.map((i) => ({
                id: i.id,
                summary: i.summary ?? i.title ?? '',
                product: i.product ?? '',
                description: i.description ?? '',
              })));
            } else {
              setInitiatives([]);
            }
          } else {
            setInitiatives([]);
          }
        } catch {
          setInitiatives([]);
        }
      }
    } else {
      try {
        const stored = sessionStorage.getItem(INITIATIVES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { id: string; title?: string; summary?: string; product: string; description: string }[];
          setInitiatives(
            parsed.map((i) => ({
              id: i.id,
              summary: i.summary ?? i.title ?? '',
              product: i.product ?? '',
              description: i.description ?? '',
            }))
          );
        } else {
          setInitiatives([]);
        }
      } catch {
        setInitiatives([]);
      }
    }
    setLoadingInitiatives(false);
  }, []);

  useEffect(() => {
    loadInitiativesFromDb();
  }, [location.pathname, loadInitiativesFromDb]);

  useEffect(() => {
    if (!loadingInitiatives) {
      sessionStorage.setItem(INITIATIVES_KEY, JSON.stringify(initiatives));
    }
  }, [initiatives, loadingInitiatives]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSummary = summary.trim();
    const trimmedDesc = description.trim();

    if (!trimmedSummary) {
      toast.error('Summary is required');
      return;
    }

    const newInitiative = {
      id: crypto.randomUUID(),
      summary: trimmedSummary,
      product: product ?? '',
      description: trimmedDesc,
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const { data, error } = await supabase
        .from('nps_initiatives')
        .insert({
          user_id: session.user.id,
          summary: trimmedSummary,
          product: product ?? '',
          description: trimmedDesc,
        })
        .select('id, summary, product, description')
        .single();
      if (!error && data) {
        setInitiatives((prev) => [...prev, { id: data.id, summary: data.summary, product: data.product, description: data.description }]);
        toast.success('Initiative added');
      } else {
        setInitiatives((prev) => [...prev, newInitiative]);
        toast.warning('Saved locally. Run the Supabase migration to persist across sessions.');
      }
    } else {
      setInitiatives((prev) => [...prev, newInitiative]);
      toast.success('Initiative added');
    }
    setSummary('');
    setProduct(PRODUCT_OPTIONS[0]);
    setDescription('');
  };

  const handleRemove = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const { error } = await supabase.from('nps_initiatives').delete().eq('id', id).eq('user_id', session.user.id);
      if (error) {
        toast.error(error.message ?? 'Failed to remove initiative');
        return;
      }
    }
    setInitiatives((prev) => prev.filter((i) => i.id !== id));
    toast.success('Initiative removed');
  };

  const handleGenerateDescription = async () => {
    const trimmedSummary = summary.trim();
    if (!trimmedSummary) {
      toast.error('Enter a summary first');
      return;
    }
    if (!openaiApiKey.trim()) {
      toast.error('Enter your OpenAI API key');
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: INITIATIVE_DESCRIPTION_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: [
                product ? `Product: ${product}` : null,
                `Summary: ${trimmedSummary}`,
                description.trim() ? `Description: ${description.trim()}` : 'Description:',
              ]
                .filter(Boolean)
                .join('\n'),
            },
          ],
          max_tokens: 4096,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `API error: ${response.status}`);
      }
      const data = await response.json();
      const generated = data?.choices?.[0]?.message?.content?.trim();
      if (generated) {
        setDescription(generated);
        toast.success('Description generated');
      } else {
        throw new Error('No content in response');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate description');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Configure — NPS Analyzer"
        description="Add and manage initiatives for your NPS analysis"
      />
      <Navbar />
      <div className="pt-32 pb-24 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-medium mb-8">Configure</h1>

          <div className="mb-12">
            <label className="text-sm font-medium block mb-2">OpenAI API Key</label>
            <Input
              type="password"
              value={openaiApiKey}
              onChange={(e) => {
                const v = e.target.value;
                setOpenaiApiKey(v);
                try {
                  if (v) sessionStorage.setItem(OPENAI_KEY_STORAGE, v);
                  else sessionStorage.removeItem(OPENAI_KEY_STORAGE);
                } catch {
                  // ignore
                }
              }}
              placeholder="sk-..."
              className="border-border font-mono"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Not stored. Enter each session as needed.
            </p>
          </div>

          <h2 className="text-lg font-medium mb-2">Initiatives</h2>
          <p className="text-muted-foreground mb-6">
            Add initiatives one by one. Each initiative has a summary and description.
          </p>

          <form onSubmit={handleAdd} className="space-y-4 mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Summary</label>
                <Input
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Enter initiative summary"
                  className="border-border"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Product</label>
                <Select value={product} onValueChange={setProduct}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter initiative description with details about problems and solutions"
                rows={16}
                className="border-border min-h-[320px]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateDescription}
                disabled={generating || !summary.trim()}
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1.5" />
                )}
                Generate
              </Button>
              <Button type="submit" className="bg-[hsl(300,100%,71%)] hover:bg-[hsl(300,100%,65%)] text-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Initiative
              </Button>
            </div>
          </form>

          {loadingInitiatives ? (
            <p className="text-muted-foreground">Loading initiatives…</p>
          ) : initiatives.length > 0 ? (
            <div>
              <h2 className="text-lg font-medium mb-4">Your Initiatives ({initiatives.length})</h2>
              <ul className="space-y-4">
                {initiatives.map((init) => (
                  <li
                    key={init.id}
                    className="border border-border rounded-lg p-4 bg-card flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-medium">{init.summary}</h3>
                        {init.product && (
                          <p className="text-xs text-muted-foreground mt-0.5">{init.product}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(init.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0 p-1"
                        aria-label="Remove initiative"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {init.description && (
                      <p className="text-sm text-muted-foreground">{init.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No initiatives yet. Add your first one above. Initiatives are saved permanently to your account.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Configure;
