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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database...')
    console.log(`📡 Connecting to: ${supabaseUrl}`)
    
    // Create storage bucket for videos
    console.log('🪣 Setting up storage bucket...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Connection failed:', listError)
      process.exit(1)
    }
    
    console.log('✅ Connection successful!')
    
    const videoBucketExists = buckets?.some(bucket => bucket.name === 'videos')
    
    if (!videoBucketExists) {
      const { error: bucketError } = await supabase.storage.createBucket('videos', {
        public: false
      })
      
      if (bucketError) {
        console.log('⚠️  Could not create storage bucket:', bucketError.message)
        console.log('📝 Please create it manually:')
        console.log('   1. Go to Storage in your Supabase dashboard')
        console.log('   2. Create a new bucket named "videos"')
        console.log('   3. Make it private (not public)')
      } else {
        console.log('✅ Storage bucket created!')
      }
    } else {
      console.log('✅ Storage bucket already exists!')
    }
    
    console.log('')
    console.log('🎉 Setup completed!')
    console.log('')
    console.log('📝 Next steps:')
    console.log('1. Go to your Supabase project dashboard: https://supabase.com/dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the contents of supabase/migrations/001_init.sql')
    console.log('4. Click "Run" to execute the SQL and create all tables and policies')
    console.log('5. Run: npm run seed (to add sample data)')
    console.log('')
    console.log('💡 The SQL file contains all the database schema and security policies.')
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  }
}

setupDatabase()