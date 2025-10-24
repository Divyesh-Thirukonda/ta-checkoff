## 🚀 QUICK DATABASE SETUP

Since the API automation has limitations, here's the simple manual setup:

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/zzjqxniikxonlriyzpco/sql
2. Click "New query"

### Step 2: Copy and Paste This SQL
Copy EVERYTHING below and paste it into the SQL editor, then click "Run":

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL CHECK (email ~* '^[^@]+@umn\.edu$'),
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

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view and update their own profile" ON users
    FOR ALL USING (auth_user_id = auth.uid());

-- RLS Policies for submissions table
CREATE POLICY "Students can view their own submissions" ON submissions
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Students can insert their own submissions" ON submissions
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Students can update their own submissions" ON submissions
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "TAs and admins can view all submissions" ON submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE auth_user_id = auth.uid()
            AND role IN ('ta', 'admin')
        )
    );

-- RLS Policies for verifications table
CREATE POLICY "Anyone can view verifications" ON verifications
    FOR SELECT USING (true);

CREATE POLICY "Only TAs and admins can insert verifications" ON verifications
    FOR INSERT WITH CHECK (
        ta_user_id IN (
            SELECT id FROM users
            WHERE auth_user_id = auth.uid()
            AND role IN ('ta', 'admin')
        )
    );

-- RLS Policies for gradebook table
CREATE POLICY "Students can view their own gradebook entries" ON gradebook
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "TAs and admins can view all gradebook entries" ON gradebook
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE auth_user_id = auth.uid()
            AND role IN ('ta', 'admin')
        )
    );

CREATE POLICY "TAs and admins can insert gradebook entries" ON gradebook
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE auth_user_id = auth.uid()
            AND role IN ('ta', 'admin')
        )
    );

CREATE POLICY "TAs and admins can update gradebook entries" ON gradebook
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE auth_user_id = auth.uid()
            AND role IN ('ta', 'admin')
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_lab_id ON submissions(lab_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_verifications_submission_id ON verifications(submission_id);
CREATE INDEX IF NOT EXISTS idx_verifications_ta_user_id ON verifications(ta_user_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_user_id ON gradebook(user_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_lab_id ON gradebook(lab_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_verified_at ON gradebook(verified_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labs_updated_at BEFORE UPDATE ON labs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gradebook_updated_at BEFORE UPDATE ON gradebook
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 3: Run the Seed Command
After the SQL executes successfully, come back to terminal and run:
```bash
npm run seed
```

That's it! Your database will be fully set up with sample data.