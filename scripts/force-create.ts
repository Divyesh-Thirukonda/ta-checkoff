import { createClient } from '@supabase/supabase-js'
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

async function createTablesDirectly() {
  console.log('🚀 Creating tables using direct HTTP requests...')
  
  // Get the project reference from URL
  const projectRef = supabaseUrl.split('.')[0].split('//')[1]
  console.log(`📡 Project: ${projectRef}`)
  
  const statements = [
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
    
    `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      auth_user_id UUID UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL CHECK (email ~* '^[^@]+@umn\\\\.edu$'),
      first_name TEXT,
      last_name TEXT,
      section TEXT,
      role TEXT CHECK (role IN ('student', 'ta', 'admin')) DEFAULT 'student',
      initials TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS labs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code TEXT UNIQUE NOT NULL,
      title TEXT,
      section TEXT,
      due_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS submissions (
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
    )`,
    
    `CREATE TABLE IF NOT EXISTS verifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      ta_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      decision TEXT CHECK (decision IN ('approved', 'rejected', 'needs_changes')) NOT NULL,
      points INTEGER,
      initials TEXT NOT NULL,
      comment TEXT,
      verified_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS gradebook (
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
    )`,
    
    `CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      actor UUID REFERENCES users(id),
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id UUID,
      meta JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`
  ]
  
  // Try using PostgreSQL connection endpoint directly
  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i]
    console.log(`⏳ Creating table ${i + 1}/${statements.length}...`)
    
    try {
      // Try using the PostgreSQL REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ sql })
      })
      
      if (response.ok) {
        console.log(`✅ Table ${i + 1} created successfully`)
      } else {
        console.log(`⚠️  Table ${i + 1} creation may have failed: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ Error creating table ${i + 1}:`, error)
    }
  }
  
  console.log('')
  console.log('📋 MANUAL ALTERNATIVE REQUIRED')
  console.log('==============================')
  console.log('')
  console.log('The automated approach has limitations. Please:')
  console.log('')
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef)
  console.log('2. Click on "SQL Editor" in the left sidebar')
  console.log('3. Create a new query')
  console.log('4. Copy and paste this SQL:')
  console.log('')
  console.log('--- START COPY FROM HERE ---')
  console.log(statements.join(';\\n\\n') + ';')
  console.log('--- END COPY ---')
  console.log('')
  console.log('5. Click "Run" to execute')
  console.log('6. Then run: npm run verify')
  console.log('7. Finally run: npm run seed')
}

createTablesDirectly()