-- Исправляем предупреждения безопасности: добавляем search_path для функций

-- Исправляем функцию is_server_member
CREATE OR REPLACE FUNCTION public.is_server_member(server_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM server_members 
    WHERE server_id = server_id_param AND user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Исправляем функцию get_user_server_role
CREATE OR REPLACE FUNCTION public.get_user_server_role(server_id_param UUID, user_id_param UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM server_members 
    WHERE server_id = server_id_param AND user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Исправляем функцию is_server_owner
CREATE OR REPLACE FUNCTION public.is_server_owner(server_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM servers 
    WHERE id = server_id_param AND owner_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;