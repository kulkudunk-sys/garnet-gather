-- Исправляем политику SELECT для servers
-- Владелец должен видеть свой сервер сразу после создания

DROP POLICY IF EXISTS "Users can view servers they are members of" ON servers;

-- Пользователи могут просматривать серверы где они владельцы ИЛИ участники
CREATE POLICY "Users can view servers they own or are members of" 
ON servers 
FOR SELECT 
USING (
  auth.uid() = owner_id OR 
  public.is_server_member(id, auth.uid())
);