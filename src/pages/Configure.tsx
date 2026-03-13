import React, { useState, useEffect } from 'react';
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

const INITIATIVES_KEY = 'nps-initiatives';

const PRODUCT_OPTIONS = [
  'PowerSchool Applicant Tracking',
  'PowerSchool Sourcing',
  'PowerSchool Records',
  'PowerSchool Smart Find Express',
] as const;

interface Initiative {
  id: string;
  title: string;
  product: string;
  description: string;
}

const Configure = () => {
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [title, setTitle] = useState('');
  const [product, setProduct] = useState('');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(INITIATIVES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Initiative[];
        setInitiatives(parsed.map((i) => ({ ...i, product: i.product ?? '' })));
      }
    } catch {
      setInitiatives([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(INITIATIVES_KEY, JSON.stringify(initiatives));
  }, [initiatives]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedTitle) {
      toast.error('Title is required');
      return;
    }

    setInitiatives((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: trimmedTitle,
        product: product ?? '',
        description: trimmedDesc,
      },
    ]);
    setTitle('');
    setProduct('');
    setDescription('');
    toast.success('Initiative added');
  };

  const handleRemove = (id: string) => {
    setInitiatives((prev) => prev.filter((i) => i.id !== id));
    toast.success('Initiative removed');
  };

  const handleGenerateDescription = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('Enter a title first');
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
                `Title: ${trimmedTitle}`,
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
              onChange={(e) => setOpenaiApiKey(e.target.value)}
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
            Add initiatives one by one. Each initiative has a title and description.
          </p>

          <form onSubmit={handleAdd} className="space-y-4 mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter initiative title"
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
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-sm font-medium">Description</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={generating || !title.trim()}
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1.5" />
                  )}
                  Generate
                </Button>
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter initiative description or click Generate to create one with AI"
                rows={16}
                className="border-border min-h-[320px]"
              />
            </div>
            <Button type="submit" className="bg-[hsl(300,100%,71%)] hover:bg-[hsl(300,100%,65%)] text-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add Initiative
            </Button>
          </form>

          {initiatives.length > 0 ? (
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
                        <h3 className="font-medium">{init.title}</h3>
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
            <p className="text-muted-foreground">No initiatives yet. Add your first one above.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Configure;
