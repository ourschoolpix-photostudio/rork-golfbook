-- Migration 014: Add offline operations table

CREATE TABLE IF NOT EXISTS offline_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('score_submit', 'registration_create', 'registration_update', 'registration_delete', 'grouping_sync', 'member_update', 'event_update')),
  operation_data JSONB NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_offline_operations_member ON offline_operations(member_id);
CREATE INDEX idx_offline_operations_event ON offline_operations(event_id);
CREATE INDEX idx_offline_operations_status ON offline_operations(status);
CREATE INDEX idx_offline_operations_created_at ON offline_operations(created_at);

-- RLS policies
ALTER TABLE offline_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all users" ON offline_operations FOR SELECT USING (true);
CREATE POLICY "Allow insert for all users" ON offline_operations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all users" ON offline_operations FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all users" ON offline_operations FOR DELETE USING (true);
