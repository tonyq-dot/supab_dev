# Gallery Edge Functions

## gallery-ingest

POST `/functions/v1/gallery-ingest`

Creates a new publication with an initial version.

**Headers:** `X-API-Key: <your-api-key>`

**Body:**
```json
{
  "author_id": "uuid",
  "project_id": "uuid (optional)",
  "work_log_id": "uuid (optional)",
  "file_base64": "base64 string (optional)",
  "file_url": "https://... (optional)",
  "file_ext": "jpg (optional)",
  "source": "telegram|api|houdini (optional, default: api)",
  "points_config_id": "uuid (optional)",
  "points_assigned": 5.5 (optional),
  "external_id": "string (optional)",
  "telegram_chat_id": "string (optional)"
}
```

**Response:** `{ publication_id, version_id, version_number, points }`

## gallery-update

PATCH `/functions/v1/gallery-update`

Adds a new version to an existing publication.

**Headers:** `X-API-Key: <your-api-key>`

**Body:**
```json
{
  "publication_id": "uuid",
  "version_description": "string (optional)",
  "file_base64": "base64 string (optional)",
  "file_url": "https://... (optional)",
  "file_ext": "jpg (optional)"
}
```

**Response:** `{ publication_id, new_version_number, version_id }`

## API Keys

Create an API key and store its SHA-256 hash in `api_keys`:

```sql
-- Generate hash (use a tool or: echo -n "your-secret-key" | sha256sum)
INSERT INTO api_keys (key_hash, name, scope) VALUES
  ('<sha256-hex-of-your-key>', 'Telegram Bot', 'gallery:write');
```
