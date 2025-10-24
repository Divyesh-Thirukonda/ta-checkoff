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

const BASE_URL = supabaseUrl.replace('/rest/v1', '')

async function executeSQLStatements() {
  console.log('🚀 Creating database schema...')
  
  const statements = [
    // Enable UUID extension
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
    
    // Create users table
    `CREATE TABLE IF NOT EXISTS users (
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
    )`,
    
    // Create labs table  
    `CREATE TABLE IF NOT EXISTS labs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code TEXT UNIQUE NOT NULL,
      title TEXT,
      section TEXT,
      due_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    
    // Create submissions table
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
    
    // Create verifications table
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
    
    // Create gradebook table
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
    
    // Create audit_log table
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
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    console.log(`⏳ Creating table ${i + 1}/${statements.length}...`)
    
    try {
      const response = await fetch(`${BASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: statement })
      })
      
      if (response.ok) {
        console.log(`✅ Table ${i + 1} created successfully`)
      } else {
        const error = await response.text()
        console.log(`⚠️  Table ${i + 1} may already exist or failed:`, error.substring(0, 100))
      }
    } catch (error) {
      console.log(`⚠️  Error creating table ${i + 1}:`, error)
    }
  }
  
  console.log('')
  console.log('🎉 Schema creation completed!')
  console.log('📝 Next step: npm run seed')
}

executeSQLStatements()