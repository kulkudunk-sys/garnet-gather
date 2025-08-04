-- Создаем таблицы для системы друзей и личных сообщений

-- Добавляем номер аккаунта в профиль
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_number INTEGER;

-- Создаем уникальные номера аккаунтов для существующих пользователей
UPDATE profiles SET account_number = (random() * 9999 + 1000)::INTEGER WHERE account_number IS NULL;

-- Устанавливаем ограничение уникальности для номера аккаунта
ALTER TABLE profiles ADD CONSTRAINT profiles_account_number_unique UNIQUE (account_number);

-- Таблица запросов в друзья
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Таблица друзей
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id) -- Обеспечиваем порядок для избежания дублирования
);

-- Таблица личных чатов
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  edited_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN NOT NULL DEFAULT false
);

-- Включаем RLS для всех таблиц
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Политики для friend_requests
CREATE POLICY "Users can view their friend requests" 
ON friend_requests FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests" 
ON friend_requests FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update friend requests they received" 
ON friend_requests FOR UPDATE 
USING (auth.uid() = receiver_id);

-- Политики для friendships
CREATE POLICY "Users can view their friendships" 
ON friendships FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create friendships" 
ON friendships FOR INSERT 
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Политики для direct_messages
CREATE POLICY "Users can view their direct messages" 
ON direct_messages FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send direct messages" 
ON direct_messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their direct messages" 
ON direct_messages FOR UPDATE 
USING (auth.uid() = sender_id);

-- Триггер для обновления updated_at в friend_requests
CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();