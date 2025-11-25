# Course Source Separation - Implementation Complete

## Overview
Successfully implemented separation between admin-created courses and personal game courses to prevent database clutter from duplicate courses created by members.

## Changes Made

### 1. Database Migration (`backend/migrations/030_add_course_source_type.sql`)
- Added `source` column to `courses` table with values: `'admin'` or `'personal'`
- Updated existing courses to `'admin'` source (backward compatibility)
- Created new RLS policies to handle course visibility:
  - Admin courses (`source = 'admin'`) are visible to all users
  - Personal courses (`source = 'personal'`) are only visible to their creator
  - Users can create, update, and delete their own courses
  - Backend service can manage all courses

### 2. Backend tRPC Route Updates (`backend/trpc/routes/courses/crud/route.ts`)
- Updated `getAllProcedure` to accept optional `source` parameter:
  - `source: 'admin'` - Returns only admin courses
  - `source: 'personal'` - Returns only user's personal courses
  - `source: 'all'` or undefined - Returns admin courses + user's personal courses
- Updated `createProcedure` to accept `source` parameter (defaults to `'personal'`)
- All responses now include the `source` field

### 3. Admin Courses Management (`components/CoursesManagementModal.tsx`)
- Updated to fetch only admin courses: `source: 'admin'`
- When creating courses in admin settings, they're marked as `source: 'admin'`
- These admin courses are available to all members for personal games

### 4. Personal Games Course Selection (`components/CreateGameModal.tsx`)
- Updated to fetch only admin courses: `source: 'admin'`
- Users can select from admin-created courses when creating personal games
- Users can also manually enter course details (not saved as courses)

## How It Works

### Admin Workflow:
1. Admin opens Admin Settings → Courses Management
2. Creates courses with stroke indices and hole pars
3. These courses are saved with `source: 'admin'`
4. **All members can see and use these admin courses in personal games**

### Member Workflow (Personal Games):
1. Member opens Games tab → Create New Game
2. Can select from admin-created courses (shows in dropdown)
3. Can also manually enter course details
4. Manual course details are **not saved as courses**, preventing database clutter
5. In the future, if we want to add a "Save for later" feature for personal courses, they would be saved with `source: 'personal'` and only visible to that member

## Benefits

✅ **No Database Clutter**: Personal games don't automatically create course records
✅ **Centralized Course Library**: Admin manages official courses for the organization
✅ **Flexible for Users**: Members can still use custom course details without saving
✅ **Clean Separation**: Admin courses vs. personal courses are clearly distinguished
✅ **Future-Proof**: Easy to add "Save personal course" feature later if needed

## Database Schema

```sql
courses
├── id (UUID)
├── name (TEXT)
├── par (INTEGER)
├── hole_pars (INTEGER[])
├── stroke_indices (INTEGER[])
├── member_id (UUID) - Creator
├── source (TEXT) - 'admin' or 'personal'
├── is_public (BOOLEAN) - Legacy, kept for compatibility
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

## Notes

- Existing courses are automatically marked as `'admin'` during migration
- The `is_public` field is kept for backward compatibility but effectively replaced by `source`
- Personal games currently don't save courses, but the infrastructure is ready if needed
- All course queries should specify the `source` parameter for clarity
