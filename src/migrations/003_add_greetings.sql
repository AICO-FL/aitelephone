CREATE TABLE greetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  description VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_greetings_is_active ON greetings(is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_greetings_updated_at
    BEFORE UPDATE ON greetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default greetings
INSERT INTO greetings (text, description, is_active) VALUES
('お電話ありがとうございます。AIアシスタントにおつなぎします。', '標準の挨拶', true),
('お待たせいたしました。ご用件をお聞かせください。', '転送後の挨拶', true),
('申し訳ございませんが、ただいま混み合っております。', 'ビジー時の挨拶', true);