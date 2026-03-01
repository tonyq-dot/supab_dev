# Project Review: KPI System / Gallery Module

**Date:** 2025-02-15  
**Scope:** Full codebase review — broken areas, tech debt, improvements

---

## Executive Summary

The project is a KPI/works tracking system for an animation studio with a gallery module for publications and versioning. Core flows work, but there are **silent failures** (no error handling), **inconsistent storage usage**, and **security gaps** that should be addressed before adding new features.

---

## 1. Broken / Problematic Areas

### 1.1 Silent Failures (High Priority)

| Location | Issue | Impact |
|----------|-------|--------|
| `Gallery.tsx` `handleUpload` | No `catch` block; errors not shown | User thinks upload succeeded when it failed |
| `AddWork.tsx` image flow | Storage/`publication_versions` errors ignored | Work saved without image; user not informed |
| `MediaViewer.tsx` `handleSaveTitle` | No error check on update | Title save can fail silently |
| `PublishDialog.tsx` `handlePublish` | No success/error feedback | User unsure if publish worked |
| `VersionHistory.tsx` `handleAddVersion` | Insert/update errors ignored | New version can fail without feedback |
| `TagManager.tsx` | Add/remove/create tags: no error handling | Tag operations can fail silently |

**Fix:** Add `try/catch`, surface errors via `setError` or toast, show success feedback where appropriate.

### 1.2 S3 Storage Provider

- `S3StorageProvider` accepts `accessKeyId` and `secretAccessKey` in config but **never passes them to `S3Client`**.
- S3 only works with IAM role or default env credentials.
- **Fix:** Pass credentials to `S3Client` when provided, or document that only IAM/default is supported.

### 1.3 Supabase Client

- `supabaseUrl` and `supabaseAnonKey` default to `''` if env vars missing.
- App will fail at runtime with unclear errors.
- **Fix:** Add startup check or throw a clear error if env is missing.

---

## 2. Tech Debt

### 2.1 Duplicated Code

- **Points config UI** — Same pattern in `Gallery.tsx` and `VersionHistory.tsx`:
  - Category select, config checkboxes, `toggleConfig`, `calculatePoints`
- **Recommendation:** Extract `PointsConfigSelector` component.

### 2.2 Inconsistent Storage Usage

| File | Uses |
|------|------|
| `Gallery.tsx`, `VersionHistory.tsx` | `getStorageProvider()` ✓ |
| `AddWork.tsx` | `supabase.storage.from('gallery-media')` directly ✗ |
| Edge functions `gallery-ingest`, `gallery-update` | Hardcoded Supabase storage ✗ |

- **Recommendation:** Use `getStorageProvider()` in AddWork; edge functions need server-side storage abstraction or at least `storage_config` lookup.

### 2.3 Error Handling Pattern

- `AddWork`, `Login` use `setError` and show errors.
- Gallery, MediaViewer, PublishDialog, TagManager, VersionHistory do not.
- **Recommendation:** Standardize: add error state + display for all mutation flows.

---

## 3. Architecture Gaps

### 3.1 Storage Abstraction

- **Implemented:** `IStorageProvider`, Supabase/Local/S3 providers, `buildStoragePath`.
- **Gaps:**
  - AddWork bypasses abstraction.
  - Edge functions always use Supabase; no `storage_config` or S3 support.

### 3.2 API Security

- `gallery-ingest` accepts `author_id` in body; any valid API key can create publications for any user.
- **Recommendation:** Validate `author_id` against API key scope or require key to be tied to a user.

### 3.3 Migrations Strategy

- `migrations_manual.sql` overlaps with `migrations/` folder.
- Use manual script when CLI fails (e.g. orioledb).
- **Recommendation:** Document when to use CLI vs manual; avoid running both on same DB.

---

## 4. Security

### 4.1 RLS

- **`media_tags`:** `media_tags_all FOR ALL TO authenticated USING (true)` — any user can add/remove tags on any publication.
- **Recommendation:** Restrict to `author_id = auth.uid()` OR manager role.

### 4.2 S3 Credentials

- S3 config with `VITE_*` vars is client-side; credentials should stay server-side.
- **Recommendation:** Use S3 only from edge functions or backend; client uses signed URLs.

---

## 5. UX Improvements

### 5.1 Missing Feedback

- Gallery upload: no success/error message.
- MediaViewer title edit: no feedback.
- PublishDialog: no confirmation.
- VersionHistory: no feedback when adding version.
- TagManager: no feedback on tag operations.

### 5.2 Gallery Loading

- `if (loading) return <p>Загрузка...</p>` hides filters and upload form until items load.
- **Recommendation:** Show filters and form earlier; load items in background.

### 5.3 Accessibility

- MediaViewer: no Escape key to close.
- MediaCard: Space key not handled for activation.
- Consider descriptive `alt` for gallery thumbnails.

---

## 6. Recommended Action Plan

### Phase 1: Fix Critical Issues (1–2 days)

1. Add error handling to Gallery upload, AddWork image flow.
2. Add error handling to MediaViewer, PublishDialog, VersionHistory, TagManager.
3. Fix or document S3 credentials in `S3StorageProvider`.
4. Tighten `media_tags` RLS.

### Phase 2: Consistency & Cleanup (1 day)

5. Use `getStorageProvider()` in AddWork.
6. Extract `PointsConfigSelector` component.
7. Add env validation for Supabase URL/key.

### Phase 3: Polish (optional)

8. Add success/error toasts or inline messages.
9. Add Escape key to MediaViewer.
10. Document migration strategy (CLI vs manual).

---

## File Reference

| Area | Files |
|------|-------|
| Gallery | `src/pages/Gallery.tsx` |
| AddWork | `src/pages/AddWork.tsx` |
| MediaViewer | `src/components/gallery/MediaViewer.tsx` |
| VersionHistory | `src/components/gallery/VersionHistory.tsx` |
| PublishDialog | `src/components/gallery/PublishDialog.tsx` |
| TagManager | `src/components/gallery/TagManager.tsx` |
| Storage | `src/lib/storage/` |
| Supabase | `src/lib/supabase.ts` |
