-- Удаляем все существующие политики для пересоздания
DROP POLICY IF EXISTS "Users can join servers" ON server_members;
DROP POLICY IF EXISTS "Server owners and admins can manage members" ON server_members;
DROP POLICY IF EXISTS "Users can view members of servers they belong to" ON server_members;
DROP POLICY IF EXISTS "Server owners and admins can manage channels" ON channels;
DROP POLICY IF EXISTS "Users can view channels of servers they are members of" ON channels;

-- Создаем security definer функции для избежания рекурсии
CREATE OR REPLACE FUNCTION public.is_server_member(server_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM server_members 
    WHERE server_id = server_id_param AND user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_server_role(server_id_param UUID, user_id_param UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM server_members 
    WHERE server_id = server_id_param AND user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_server_owner(server_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM servers 
    WHERE id = server_id_param AND owner_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Создаем новые политики с использованием функций
CREATE POLICY "Users can view members of servers they belong to" 
ON server_members 
FOR SELECT 
USING (public.is_server_member(server_id, auth.uid()));

CREATE POLICY "Users can join servers" 
ON server_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Server owners and admins can manage members" 
ON server_members 
FOR ALL 
USING (
  public.is_server_owner(server_id, auth.uid()) OR 
  public.get_user_server_role(server_id, auth.uid()) IN ('admin', 'moderator')
);

CREATE POLICY "Users can view channels of servers they are members of" 
ON channels 
FOR SELECT 
USING (public.is_server_member(server_id, auth.uid()));

CREATE POLICY "Server owners and admins can manage channels" 
ON channels 
FOR ALL 
USING (
  public.is_server_owner(server_id, auth.uid()) OR 
  public.get_user_server_role(server_id, auth.uid()) IN ('admin', 'moderator')
);