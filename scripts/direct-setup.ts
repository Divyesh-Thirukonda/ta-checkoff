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

async function createTables() {
  console.log('🚀 Creating database tables directly...')
  
  try {
    // The most reliable way is to show the user the SQL to run manually
    console.log('📋 MANUAL SETUP REQUIRED')
    console.log('========================')
    console.log('')
    console.log('The automated migration requires manual SQL execution.')
    console.log('Please follow these steps:')
    console.log('')
    console.log('1. Open: https://supabase.com/dashboard/project/zzjqxniikxonlriyzpco/sql')
    console.log('2. Create a new query')
    console.log('3. Copy the SQL from: npm run show-sql')
    console.log('4. Paste and click "Run"')
    console.log('5. Then run: npm run seed')
    console.log('')
    console.log('This is the most reliable method for database setup.')
    
    // Test if we can at least connect
    const { data, error } = await supabase.storage.listBuckets()
    if (error) {
      console.log('❌ Connection test failed:', error)
    } else {
      console.log('✅ Supabase connection working')
      console.log(`📦 Found ${data?.length || 0} storage buckets`)
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

createTables()