-- ═══════════════════════════════════════════════════
-- СЦЕНА ADMIN PANEL — SQL МИГРАЦИЯ
-- Запустить в Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════

-- 1. Таблица филиалов
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  latitude numeric,
  longitude numeric,
  checkin_radius int4 DEFAULT 500,
  working_hours_start text DEFAULT '09:00',
  working_hours_end text DEFAULT '21:00',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Вставляем существующие филиалы
INSERT INTO branches (name, address, latitude, longitude) VALUES
  ('Ганди 44', 'ул. Ганди 44, Ташкент', 41.31547, 69.29919),
  ('Ганди 29', 'ул. Ганди 29, Ташкент', 41.31529, 69.29772)
ON CONFLICT DO NOTHING;

-- 2. Таблица админ-пользователей (для ролей в панели)
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid uuid UNIQUE,  -- связь с Supabase Auth
  email text UNIQUE NOT NULL,
  full_name text,
  role text CHECK (role IN ('director', 'branch_admin', 'accountant', 'manager')) DEFAULT 'branch_admin',
  branch_id uuid REFERENCES branches(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. Расширение student_cards (CRM)
CREATE TABLE IF NOT EXISTS student_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  parent_name text,
  parent_phone text,
  birth_date date,
  branch_id uuid REFERENCES branches(id),
  status text CHECK (status IN ('active', 'paused', 'left')) DEFAULT 'active',
  balance int4 DEFAULT 0,
  subscription_type text,
  subscription_end date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 4. Шаблоны рассылок
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  text text NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 5. История рассылок
CREATE TABLE IF NOT EXISTS message_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES message_templates(id),
  sent_by uuid,
  target_role text,
  target_branch uuid REFERENCES branches(id),
  recipients_count int4,
  message_text text,
  sent_at timestamptz DEFAULT now()
);

-- 6. RLS политики — полный доступ (как в Mini App)
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_history ENABLE ROW LEVEL SECURITY;

-- Политики для всех новых таблиц
DO $$ 
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['branches','admin_users','student_cards','message_templates','message_history'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_all" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_all" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════
-- ГОТОВО! Теперь создай пользователя:
-- Dashboard → Authentication → Add User
-- Email: aziz@scena.uz (или свой)
-- Password: придумай пароль
-- ═══════════════════════════════════════════════════
