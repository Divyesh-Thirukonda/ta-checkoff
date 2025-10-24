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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifySetup() {
  console.log('🔍 Verifying database setup...')
  
  const tables = ['users', 'labs', 'submissions', 'verifications', 'gradebook', 'audit_log']
  const results: { [key: string]: boolean } = {}
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        results[table] = false
        console.log(`❌ Table '${table}' not found or not accessible`)
      } else {
        results[table] = true
        console.log(`✅ Table '${table}' exists and accessible`)
      }
    } catch (err) {
      results[table] = false
      console.log(`❌ Error checking table '${table}':`, err)
    }
  }
  
  console.log('')
  console.log('📊 Verification Summary:')
  const allTablesExist = Object.values(results).every(exists => exists)
  
  if (allTablesExist) {
    console.log('🎉 All tables exist! Database setup is complete.')
    console.log('📝 Next step: npm run seed')
  } else {
    console.log('⚠️  Some tables are missing. Please run the SQL in Supabase dashboard.')
    console.log('📋 See SETUP.md for instructions')
  }
  
  // Check storage bucket
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    if (error) {
      console.log('❌ Storage check failed:', error)
    } else {
      const videoBucket = buckets?.find(b => b.name === 'videos')
      if (videoBucket) {
        console.log('✅ Storage bucket "videos" exists')
      } else {
        console.log('⚠️  Storage bucket "videos" not found')
      }
    }
  } catch (err) {
    console.log('❌ Storage verification failed:', err)
  }
}

verifySetup()