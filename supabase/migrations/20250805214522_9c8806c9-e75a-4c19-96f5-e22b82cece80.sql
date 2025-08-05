-- Добавляем колонку is_public для серверов, чтобы они могли быть найдены в поиске
ALTER TABLE public.servers ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;

-- Обновляем политику для просмотра серверов - разрешаем поиск публичных серверов
DROP POLICY "Users can view servers they own or are members of" ON public.servers;

CREATE POLICY "Users can view public servers or servers they are members of"
ON public.servers
FOR SELECT
USING (
  is_public = true OR 
  auth.uid() = owner_id OR 
  is_server_member(id, auth.uid())
);