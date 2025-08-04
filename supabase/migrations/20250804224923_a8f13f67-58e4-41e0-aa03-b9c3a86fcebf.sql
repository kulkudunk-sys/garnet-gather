-- Исправляем RLS политики для servers чтобы все пользователи могли создавать серверы

-- Удаляем существующие политики для servers
DROP POLICY IF EXISTS "Users can create servers" ON servers;
DROP POLICY IF EXISTS "Server owners can update their servers" ON servers;
DROP POLICY IF EXISTS "Users can view servers they are members of" ON servers;

-- Создаем новые политики для servers
-- Любой аутентифицированный пользователь может создать сервер
CREATE POLICY "Authenticated users can create servers" 
ON servers 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Владельцы серверов могут обновлять свои серверы
CREATE POLICY "Server owners can update their servers" 
ON servers 
FOR UPDATE 
USING (auth.uid() = owner_id);

-- Пользователи могут просматривать серверы, в которых они состоят
CREATE POLICY "Users can view servers they are members of" 
ON servers 
FOR SELECT 
USING (public.is_server_member(id, auth.uid()));