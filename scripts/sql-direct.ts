import { readFileSync } from 'fs'

// Load environment variables from .env.local
try {
  const envLocal = readFileSync('.env.local', 'utf-8')
  const envVars = envLocal.split('\n').filter(line => line.includes('=') && !line.startsWith('#'))
  
  envVars.forEach(line => {
    const [key, ...valueParts] = line.split('=')
    const value = valueParts.join('=').trim()
    process.env[key.trim()] = value
  })
} catch (error) {
  console.error('❌ Could not load .env.local file')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function executeSQL() {
  console.log('🚀 Executing SQL via Supabase SQL API...')
  
  // Get the project reference from the URL
  const urlParts = supabaseUrl.split('.')
  const projectRef = urlParts[0].split('//')[1]
  
  console.log(`📡 Project: ${projectRef}`)
  
  const migrationSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL CHECK (email ~* '^[^@]+@umn\\.edu$'),
    first_name TEXT,
    last_name TEXT,
    section TEXT,
    role TEXT CHECK (role IN ('student', 'ta', 'admin')) DEFAULT 'student',
    initials TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create labs table
CREATE TABLE IF NOT EXISTS labs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    title TEXT,
    section TEXT,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
    video_path TEXT,
    notes TEXT,
    repo_url TEXT,
    status TEXT CHECK (status IN ('submitted', 'approved', 'rejected', 'needs_changes')) DEFAULT 'submitted',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lab_id)
);

-- Create verifications table
CREATE TABLE IF NOT EXISTS verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    ta_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision TEXT CHECK (decision IN ('approved', 'rejected', 'needs_changes')) NOT NULL,
    points INTEGER,
    initials TEXT NOT NULL,
    comment TEXT,
    verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create gradebook table
CREATE TABLE IF NOT EXISTS gradebook (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0,
    max_points INTEGER NOT NULL DEFAULT 100,
    ta_initials TEXT NOT NULL,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lab_id)
);

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor UUID REFERENCES users(id),
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
`
  
  try {
    // Try using the SQL API directly
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: migrationSQL
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ SQL executed successfully!')
      console.log('📊 Result:', result)
    } else {
      const errorText = await response.text()
      console.log('⚠️  API execution failed:', response.status, errorText)
      
      // Fall back to manual instructions
      console.log('')
      console.log('📋 MANUAL SETUP REQUIRED')
      console.log('========================')
      console.log('Please copy this SQL and run it manually in Supabase:')
      console.log('')
      console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql')
      console.log('2. Paste the SQL below and click "Run":')
      console.log('')
      console.log(migrationSQL)
    }
    
  } catch (error) {
    console.log('❌ Execution failed:', error)
    console.log('')
    console.log('📋 Please run the SQL manually:')
    console.log('1. Go to Supabase Dashboard > SQL Editor')
    console.log('2. Run: npm run show-sql')
    console.log('3. Copy and paste the output')
  }
}

executeSQL()