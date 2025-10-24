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

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function seedDatabase() {
  console.log('🌱 Starting database seeding...')

  try {
    // Seed labs
    console.log('📚 Creating labs...')
    const labs = [
      { code: 'lab-07', title: 'Lab 7: Data Structures', section: null },
      { code: 'lab-08', title: 'Lab 8: Algorithms', section: null },
      { code: 'lab-09', title: 'Lab 9: Recursion', section: null },
      { code: 'lab-10', title: 'Lab 10: Final Project', section: null }
    ]

    for (const lab of labs) {
      const { error } = await supabaseAdmin
        .from('labs')
        .upsert(lab, { onConflict: 'code' })
      
      if (error) {
        console.error(`Error creating lab ${lab.code}:`, error)
      } else {
        console.log(`✅ Created lab: ${lab.code}`)
      }
    }

    // Seed admin user
    console.log('👤 Creating admin user...')
    const adminUser = {
      auth_user_id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@umn.edu',
      first_name: 'Admin',
      last_name: 'User',
      section: null,
      role: 'admin',
      initials: 'AU'
    }

    const { error: adminError } = await supabaseAdmin
      .from('users')
      .upsert(adminUser, { onConflict: 'email' })

    if (adminError) {
      console.error('Error creating admin user:', adminError)
    } else {
      console.log('✅ Created admin user: admin@umn.edu')
    }

    // Seed TA users
    console.log('👨‍🏫 Creating TA users...')
    const tas = [
      {
        auth_user_id: '00000000-0000-0000-0000-000000000002',
        email: 'ta1@umn.edu',
        first_name: 'John',
        last_name: 'Smith',
        section: '001',
        role: 'ta',
        initials: 'JS'
      },
      {
        auth_user_id: '00000000-0000-0000-0000-000000000003',
        email: 'ta2@umn.edu',
        first_name: 'Jane',
        last_name: 'Doe',
        section: '002',
        role: 'ta',
        initials: 'JD'
      }
    ]

    for (const ta of tas) {
      const { error } = await supabaseAdmin
        .from('users')
        .upsert(ta, { onConflict: 'email' })
      
      if (error) {
        console.error(`Error creating TA ${ta.email}:`, error)
      } else {
        console.log(`✅ Created TA: ${ta.email}`)
      }
    }

    // Seed sample student
    console.log('🎓 Creating sample student...')
    const student = {
      auth_user_id: '00000000-0000-0000-0000-000000000004',
      email: 'student@umn.edu',
      first_name: 'Test',
      last_name: 'Student',
      section: '001',
      role: 'student',
      initials: null
    }

    const { error: studentError } = await supabaseAdmin
      .from('users')
      .upsert(student, { onConflict: 'email' })

    if (studentError) {
      console.error('Error creating student:', studentError)
    } else {
      console.log('✅ Created student: student@umn.edu')
    }

    console.log('🎉 Database seeding completed successfully!')
    
    // Print summary
    console.log('\n📊 Seeding Summary:')
    console.log('- 4 labs created (lab-07 through lab-10)')
    console.log('- 1 admin user created (admin@umn.edu)')
    console.log('- 2 TA users created (ta1@umn.edu, ta2@umn.edu)')
    console.log('- 1 student user created (student@umn.edu)')
    console.log('\n💡 Note: You will need to create actual auth users in Supabase Auth for these to work')
    console.log('💡 Gradebook entries will be created automatically when TAs approve submissions')
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  }
}

// Run the seeder
seedDatabase()