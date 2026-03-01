-- View: detailed_scores
-- Joins work_logs with projects, work_types, project_types, drone_ranges
-- Computes Score = Base × Qty × K_type × K_drones × K_rework for each row

CREATE OR REPLACE VIEW detailed_scores AS
SELECT
  wl.id,
  wl.user_id,
  wl.project_id,
  wl.work_type_id,
  wl.quantity,
  wl.date,
  wl.image_url,
  wl.created_at,
  p.name AS project_name,
  p.drone_count,
  p.is_rework,
  pt.name AS project_type_name,
  pt.value AS k_type,
  wt.name AS work_type_name,
  wt.base_value AS base,
  dr.coefficient AS k_drones,
  CASE WHEN p.is_rework THEN 1.5 ELSE 1.0 END AS k_rework,
  -- Score = Base × Qty × K_type × K_drones × K_rework
  (wt.base_value * wl.quantity * pt.value * dr.coefficient * 
   (CASE WHEN p.is_rework THEN 1.5 ELSE 1.0 END))::NUMERIC(12,2) AS score
FROM work_logs wl
JOIN projects p ON wl.project_id = p.id
JOIN project_types pt ON p.type_id = pt.id
JOIN work_types wt ON wl.work_type_id = wt.id
JOIN LATERAL (
  SELECT coefficient FROM drone_ranges dr
  WHERE p.drone_count >= dr.min_drones AND p.drone_count <= dr.max_drones
  ORDER BY dr.min_drones DESC
  LIMIT 1
) dr ON true;
