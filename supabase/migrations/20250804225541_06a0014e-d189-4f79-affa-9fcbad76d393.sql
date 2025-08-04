-- Добавляем foreign key связь между messages и profiles
ALTER TABLE messages ADD CONSTRAINT messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;