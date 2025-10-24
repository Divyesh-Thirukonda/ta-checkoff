# UMN Lab Checkoff System

A complete web application for student lab submission and TA verification, built with Next.js and Supabase.

## Features

- **Student Features:**
  - Sign in with @umn.edu email addresses only
  - Upload video proof of lab completion
  - Add notes and repository links
  - View submission status and history
  - QR code support for easy access

- **TA Features:**
  - Dashboard with filtering by lab, section, and status
  - Video playback with signed URLs
  - Approve/reject submissions with points and comments
  - Built-in gradebook with automatic score tracking
  - CSV export in summary or detailed formats
  - Keyboard shortcuts for efficiency

- **Security:**
  - Row Level Security (RLS) on all tables
  - UMN email enforcement
  - Secure video storage with signed URLs
  - Role-based access control

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Supabase (Auth, Database, Storage)
- **Database:** PostgreSQL (via Supabase)
- **Export:** CSV download functionality
- **Deployment:** Vercel-ready

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project

## Setup Instructions

### 1. Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App Configuration
ALLOWED_EMAIL_SUFFIX=@umn.edu
MAX_VIDEO_MB=200
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

#### Apply Database Migrations

```bash
# Push SQL migrations to Supabase
npm run db:push
```

Or manually run the SQL files in Supabase SQL Editor:
1. Run `supabase/migrations/001_init.sql`
2. Run `supabase/policies/storage.sql`

#### Create Storage Bucket

In your Supabase dashboard:
1. Go to Storage
2. Create a new bucket named `videos`
3. Make it private (not public)

### 4. Run the Application

```bash
npx tsx scripts/seed.ts
```

This creates:
- Sample labs (lab-07 through lab-10)
- Admin user (admin@umn.edu)
- TA users (ta1@umn.edu, ta2@umn.edu)
- Sample student (student@umn.edu)

```bash
npx tsx scripts/seed.ts
```

This creates:
- Sample labs (lab-07 through lab-10)
- Admin user (admin@umn.edu)
- TA users (ta1@umn.edu, ta2@umn.edu)
- Sample student (student@umn.edu)

### 5. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000`

## Usage

### For Students

1. Access the submit page via QR code or direct URL:
   ```
   https://your-domain.com/submit?lab=7&section=001
   ```

2. Sign in with @umn.edu email
3. Upload video proof of lab completion
4. Add notes and repository link (optional)
5. Submit for TA review

### For TAs

1. Go to `/dashboard`
2. Sign in with TA account
3. Filter submissions by lab, section, or status
4. Click "Load Video" to watch student submissions
5. Use Approve/Reject/Needs Changes buttons
6. Add points and comments as needed
7. Visit `/gradebook` to view all completed labs
8. Export gradebook data as CSV in summary or detailed format

### QR Code Generation

Generate QR codes for each lab and section combination:
```
https://your-domain.com/submit?lab=7&section=001
https://your-domain.com/submit?lab=8&section=002
```

## API Routes

- `POST /api/auth/enforce-umn` - Validate UMN email addresses
- `POST /api/signed-url` - Generate signed URLs for video playback (TA only)
- `POST /api/approve` - Process TA approval decisions
- `GET /api/gradebook` - Fetch gradebook entries (TA only)
- `GET /api/gradebook/export` - Export gradebook as CSV (TA only)
- `GET /api/sheets/health` - Test database connection

## Database Schema

### Tables

- **users**: User profiles with UMN email enforcement
- **labs**: Lab definitions with codes and titles
- **submissions**: Student lab submissions with video paths
- **verifications**: TA approval/rejection records
- **gradebook**: Completed lab scores and grades
- **audit_log**: Action tracking and error logging

### Row Level Security

- Students can only access their own data
- TAs can view all submissions but only in their assigned role
- All write operations are properly secured

## File Structure

```
/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # TA dashboard
│   │   ├── gradebook/         # Gradebook view and export
│   │   ├── submit/           # Student submission
│   │   └── layout.tsx        # Root layout
│   ├── components/           # Reusable components
│   └── lib/                  # Utilities and configurations
├── supabase/                 # Database migrations and policies
├── scripts/                  # Database seeding
└── README.md
```

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

Set all the same environment variables in your Vercel dashboard or deployment platform.

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Run `npm install`
2. **Database connection issues**: Check Supabase URL and keys
3. **Video upload fails**: Check storage bucket exists and is named `videos`
4. **Email validation fails**: Ensure `ALLOWED_EMAIL_SUFFIX` is set
5. **Gradebook not updating**: Check RLS policies and TA role assignment

### Health Checks

- Test database connection: `GET /api/sheets/health`
- Check Supabase connection in the browser console
- Verify storage bucket permissions in Supabase dashboard
- Test CSV export functionality from the gradebook page

### Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript check
npm run db:push      # Push database migrations
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Verify all environment variables are set correctly
3. Check Supabase and Google Cloud Console for service issues
4. Review browser console and server logs for error details

## License

MIT License - see LICENSE file for details