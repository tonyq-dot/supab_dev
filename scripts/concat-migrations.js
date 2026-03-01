#!/usr/bin/env node
/**
 * Concatenates migrations_formatted/*.sql into a single file.
 * Usage: node scripts/concat-migrations.js
 * Output: supabase/migrations_formatted/run_all_combined.sql
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '..', 'supabase', 'migrations_formatted')

const order = [
  '001_schema.sql',
  '002_views_detailed_scores.sql',
  '003_rls_policies.sql',
  '004_storage_work_previews.sql',
  '005_user_scores_aggregate.sql',
  '006_trigger_new_user.sql',
  '007_animator_projects.sql',
  '008_user_profiles.sql',
  '009_gallery_media.sql',
  '010_gallery_storage_bucket.sql',
  '011_gallery_points_config.sql',
  '012_storage_config.sql',
  '013_publications_versioning.sql',
  '014_api_keys.sql',
  '015_publication_latest_view.sql',
  '016_seed.sql',
  '017_project_management.sql',
]

const parts = order.map((name) => {
  const path = join(migrationsDir, name)
  const content = readFileSync(path, 'utf8')
  return `-- ========== ${name} ==========\n${content}\n`
})

const combined = parts.join('\n')
const outPath = join(migrationsDir, 'run_all_combined.sql')
writeFileSync(outPath, combined, 'utf8')
console.log(`Written: ${outPath}`)
