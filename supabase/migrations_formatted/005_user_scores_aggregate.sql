-- =============================================================================
-- 005_user_scores_aggregate.sql — Functions and views for user points
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Function: get user total points for a date range
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_points(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(score), 0)::NUMERIC(12,2)
  FROM detailed_scores
  WHERE user_id = p_user_id
    AND date >= p_start_date
    AND date <= p_end_date;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- View: user_scores_summary (manager dashboard)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW user_scores_summary AS
SELECT
  ds.user_id,
  date_trunc('quarter', ds.date)::date AS quarter_start,
  SUM(ds.score)::NUMERIC(12,2) AS total_points,
  COUNT(*) AS work_count
FROM detailed_scores ds
GROUP BY ds.user_id, date_trunc('quarter', ds.date)::date;
