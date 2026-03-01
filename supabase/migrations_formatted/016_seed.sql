-- =============================================================================
-- 016_seed.sql — Initial dictionary data
-- Run after migrations. Idempotent (ON CONFLICT).
-- =============================================================================

-- project_types
INSERT INTO project_types (name, value, description) VALUES
  ('ШОУ', 2.0, 'Коммерческий проект, прибыль'),
  ('РАЗРАБОТКА', 1.5, 'Превью для клиента/концепт'),
  ('ПРЕВЬЮ', 1.5, 'Создание инструментов и оптимизация'),
  ('НАСТАВНИЧЕСТВО', 1.0, 'Обучение коллег'),
  ('ИННОВАЦИИ', 1.5, 'Технические инновации'),
  ('ПРОМО', 1.0, 'Некоммерческий проект')
ON CONFLICT (name) DO NOTHING;

-- drone_ranges
INSERT INTO drone_ranges (min_drones, max_drones, coefficient) VALUES
  (200, 499, 1.00),
  (500, 999, 1.15),
  (1000, 2999, 1.30),
  (3000, 4999, 1.50),
  (5000, 7999, 1.75),
  (10000, 15000, 2.00)
ON CONFLICT (min_drones, max_drones) DO NOTHING;

-- work_types
INSERT INTO work_types (name, base_value) VALUES
  ('2Д Сцена', 4.5),
  ('3Д Сцена', 7.5),
  ('Полет группами', 14.5),
  ('Симуляция', 10.0),
  ('Рендер', 8.0),
  ('Композитинг', 6.0)
ON CONFLICT (name) DO NOTHING;

-- rework_coefs
INSERT INTO rework_coefs (status, value) VALUES
  ('ДА', 1.5),
  ('НЕТ', 1.0)
ON CONFLICT (status) DO NOTHING;

-- period_configs
INSERT INTO period_configs (period_name, norm_points, company_profit_coef_q1) VALUES
  ('Q1 2026', 500, 0.3)
ON CONFLICT (period_name) DO NOTHING;
