CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO spaces (
  id,
  name,
  color,
  icon,
  sort_order,
  is_default,
  created_at,
  updated_at
)
VALUES (
  'space_general',
  'General',
  NULL,
  NULL,
  0,
  1,
  datetime('now'),
  datetime('now')
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  is_default = excluded.is_default,
  sort_order = excluded.sort_order,
  updated_at = datetime('now');

ALTER TABLE conversations RENAME TO conversations_old;

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  provider_id TEXT NOT NULL DEFAULT 'openai',
  pinned INTEGER NOT NULL DEFAULT 0,
  space_id TEXT NOT NULL DEFAULT 'space_general',
  pinned_order INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (space_id) REFERENCES spaces(id)
);

WITH ranked_pinned AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY updated_at DESC, created_at DESC, id ASC
    ) AS pinned_rank
  FROM conversations_old
  WHERE pinned = 1
)
INSERT INTO conversations (
  id,
  title,
  model,
  provider_id,
  pinned,
  space_id,
  pinned_order,
  created_at,
  updated_at
)
SELECT
  c.id,
  c.title,
  c.model,
  c.provider_id,
  c.pinned,
  'space_general',
  CASE WHEN c.pinned = 1 THEN r.pinned_rank ELSE NULL END,
  c.created_at,
  c.updated_at
FROM conversations_old c
LEFT JOIN ranked_pinned r ON r.id = c.id;

ALTER TABLE messages RENAME TO messages_old;

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

INSERT INTO messages (
  id,
  conversation_id,
  role,
  content,
  model,
  tokens_used,
  created_at
)
SELECT
  id,
  conversation_id,
  role,
  content,
  model,
  tokens_used,
  created_at
FROM messages_old;

DROP TABLE messages_old;
DROP TABLE conversations_old;

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
  ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_spaces_sort_order
  ON spaces(sort_order);

CREATE INDEX IF NOT EXISTS idx_conversations_space_updated
  ON conversations(space_id, updated_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_space_pinned_order
  ON conversations(space_id, pinned_order);
