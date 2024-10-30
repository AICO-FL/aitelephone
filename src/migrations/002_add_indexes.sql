-- Add indexes for better query performance
CREATE INDEX idx_call_sessions_status ON call_sessions(status);
CREATE INDEX idx_call_sessions_end_time ON call_sessions(end_time);

-- Add metrics table for call analytics
CREATE TABLE call_metrics (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES call_sessions(id),
  timestamp TIMESTAMP NOT NULL,
  latency INTEGER,
  packet_loss FLOAT,
  audio_quality INTEGER,
  CONSTRAINT fk_session
    FOREIGN KEY(session_id)
    REFERENCES call_sessions(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_call_metrics_session_id ON call_metrics(session_id);
CREATE INDEX idx_call_metrics_timestamp ON call_metrics(timestamp);

-- Add conversation metrics
ALTER TABLE conversations
ADD COLUMN response_time INTEGER,
ADD COLUMN sentiment_score FLOAT,
ADD COLUMN confidence_score FLOAT;

-- Add function to calculate response times
CREATE OR REPLACE FUNCTION update_response_times()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET response_time = EXTRACT(EPOCH FROM (NEW.timestamp - OLD.timestamp))
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calc_response_time
AFTER INSERT ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_response_times();