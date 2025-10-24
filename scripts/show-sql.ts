import { readFileSync } from 'fs'
import { join } from 'path'

console.log('📋 DATABASE SETUP INSTRUCTIONS')
console.log('============================')
console.log('')
console.log('1. Go to: https://supabase.com/dashboard')
console.log('2. Select your project')
console.log('3. Go to SQL Editor (in the left sidebar)')
console.log('4. Create a new query')
console.log('5. Copy and paste the SQL below:')
console.log('')
console.log('=' .repeat(60))
console.log('SQL TO COPY:')
console.log('=' .repeat(60))

try {
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '001_init.sql')
  const sql = readFileSync(migrationPath, 'utf-8')
  console.log(sql)
} catch (error) {
  console.error('❌ Could not read migration file:', error)
}

console.log('=' .repeat(60))
console.log('')
console.log('6. Click "Run" to execute the SQL')
console.log('7. After successful execution, run: npm run seed')
console.log('')
console.log('✨ This will create all tables, policies, and relationships!')