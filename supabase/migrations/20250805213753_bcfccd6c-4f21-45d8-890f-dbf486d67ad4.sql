-- Создаем таблицу для приглашений на серверы
CREATE TABLE public.server_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited uses
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Включаем RLS
ALTER TABLE public.server_invites ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Users can view invites for servers they are members of"
ON public.server_invites
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.server_members 
    WHERE server_id = server_invites.server_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Server members can create invites"
ON public.server_invites
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.server_members 
    WHERE server_id = server_invites.server_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Invite creators can update their invites"
ON public.server_invites
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Invite creators can delete their invites"
ON public.server_invites
FOR DELETE
USING (auth.uid() = created_by);

-- Функция для генерации уникального кода приглашения
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Индекс для быстрого поиска по коду
CREATE INDEX idx_server_invites_code ON public.server_invites(code);
CREATE INDEX idx_server_invites_server_id ON public.server_invites(server_id);