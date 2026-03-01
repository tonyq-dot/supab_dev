-- =============================================================================
-- 015_publication_latest_view.sql — View: publication with latest version
-- For gallery display
-- =============================================================================

CREATE OR REPLACE VIEW publication_latest AS
SELECT DISTINCT ON (p.id)
  p.id,
  p.author_id,
  p.project_id,
  p.work_log_id,
  p.title,
  p.source,
  p.external_id,
  p.telegram_chat_id,
  p.is_published,
  p.published_url,
  p.created_at,
  p.updated_at,
  pv.id AS version_id,
  pv.version_number,
  pv.storage_path,
  pv.storage_backend,
  pv.media_type,
  pv.points_config_id,
  pv.points_assigned,
  pv.estimated_hours,
  pv.created_at AS version_created_at,
  pv.created_by
FROM publications p
JOIN publication_versions pv ON pv.publication_id = p.id
ORDER BY p.id, pv.version_number DESC;
