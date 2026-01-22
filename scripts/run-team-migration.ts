import { supabase } from '../integrations/supabase/client';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const migrationPath = path.join(process.cwd(), 'backend/migrations/add_team_event_fields.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('Running team event fields migration...');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  console.log('✅ Migration completed successfully');
  process.exit(0);
}

runMigration();
