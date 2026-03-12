import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const INITIATIVES_KEY = 'nps-initiatives';

interface Initiative {
  id: string;
  title: string;
  description: string;
}

const Configure = () => {
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(INITIATIVES_KEY);
      if (stored) {
        setInitiatives(JSON.parse(stored));
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
        description: trimmedDesc,
      },
    ]);
    setTitle('');
    setDescription('');
    toast.success('Initiative added');
  };

  const handleRemove = (id: string) => {
    setInitiatives((prev) => prev.filter((i) => i.id !== id));
    toast.success('Initiative removed');
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
              <label className="text-sm font-medium block mb-2">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter initiative description"
                rows={4}
                className="border-border resize-none"
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
                      <h3 className="font-medium">{init.title}</h3>
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
