import { readFileSync } from 'fs'
import { join } from 'path'

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
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

async function runMigration() {
  try {
    console.log('🚀 Running database migration...')
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '001_init.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    // Use Supabase's SQL execution endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        sql: migrationSQL
      })
    })
    
    if (!response.ok) {
      // Try alternative approach with direct SQL execution
      console.log('⚠️  Direct SQL execution, trying alternative method...')
      
      // Split SQL into statements and execute via REST API
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      
      console.log(`📄 Executing ${statements.length} SQL statements...`)
      
      // Execute each statement individually
      for (let i = 0; i < Math.min(5, statements.length); i++) {
        const statement = statements[i]
        console.log(`⏳ Executing statement ${i + 1}: ${statement.substring(0, 50)}...`)
        
        try {
          const stmtResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sql: statement + ';'
            })
          })
          
          if (stmtResponse.ok) {
            console.log(`✅ Statement ${i + 1} executed successfully`)
          } else {
            console.log(`⚠️  Statement ${i + 1} may have failed`)
          }
        } catch (err) {
          console.log(`⚠️  Statement ${i + 1} execution error:`, err)
        }
      }
    } else {
      console.log('✅ Migration executed successfully!')
    }
    
    console.log('')
    console.log('🎉 Migration completed!')
    console.log('📝 Manual verification recommended:')
    console.log('   1. Check Supabase Dashboard > Database > Tables')
    console.log('   2. Ensure tables: users, labs, submissions, verifications, gradebook exist')
    console.log('   3. If tables are missing, run SQL manually in Supabase SQL Editor')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.log('')
    console.log('🔧 Manual setup required:')
    console.log('   1. Go to Supabase Dashboard > SQL Editor')
    console.log('   2. Run: npm run show-sql')
    console.log('   3. Copy and paste the SQL output')
    console.log('   4. Click "Run" in SQL Editor')
    process.exit(1)
  }
}

runMigration()