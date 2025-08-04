-- Проверяем и исправляем связи между таблицами

-- Сначала удаляем существующую неправильную связь
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

-- Создаем правильную связь с profiles через user_id
ALTER TABLE messages ADD CONSTRAINT messages_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Убеждаемся что в таблице profiles есть правильная связь с auth.users
-- (это должно быть уже настроено, но проверим)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;