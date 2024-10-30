CREATE TABLE call_sessions (
  id UUID PRIMARY KEY,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  status VARCHAR(20) NOT NULL
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES call_sessions(id),
  timestamp TIMESTAMP NOT NULL,
  user_input TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  audio_url TEXT,
  CONSTRAINT fk_session
    FOREIGN KEY(session_id)
    REFERENCES call_sessions(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_timestamp ON conversations(timestamp);