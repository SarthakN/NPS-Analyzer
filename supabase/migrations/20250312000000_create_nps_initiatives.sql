-- NPS initiatives table for permanent storage
CREATE TABLE public.nps_initiatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  product TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nps_initiatives ENABLE ROW LEVEL SECURITY;

-- Users can view their own initiatives
CREATE POLICY "Users can view own initiatives"
ON public.nps_initiatives
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own initiatives
CREATE POLICY "Users can insert own initiatives"
ON public.nps_initiatives
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own initiatives
CREATE POLICY "Users can update own initiatives"
ON public.nps_initiatives
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own initiatives
CREATE POLICY "Users can delete own initiatives"
ON public.nps_initiatives
FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookups by user
CREATE INDEX idx_nps_initiatives_user_id ON public.nps_initiatives(user_id);
