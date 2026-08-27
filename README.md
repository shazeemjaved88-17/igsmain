# Iqra Grammar School & Academy — Online Exam Portal

A production-ready MCQ (Multiple Choice Questions) online examination system built with **Next.js 14+**, **Supabase**, and **Tailwind CSS**.

## Features

### Student Side
- 📝 Enter name and roll number to start an exam
- 🎓 Select teacher and course from dynamic dropdowns
- ⏱️ Timed exam with countdown timer (auto-submits when time expires)
- 📊 Instant results with score, percentage, and pass/fail status
- 🖨️ Print-friendly result page
- 🔒 Anti-cheating: tab-switch detection, right-click disabled, duplicate attempt prevention

### Admin Side
- 🔐 Secure email/password authentication
- 📊 Dashboard with overview statistics
- 👨‍🏫 Teachers management (CRUD)
- 📚 Courses management (CRUD with exam duration configuration)
- ❓ Questions management (CRUD + bulk CSV import)
- 📈 Results viewer with filters and CSV export

### Security
- ✅ `correct_option` is NEVER sent to the browser
- ✅ Scoring happens server-side using Supabase service role key
- ✅ Row Level Security (RLS) on all database tables
- ✅ Duplicate submission prevention (DB constraint + API check)

---

## Tech Stack

| Technology | Usage |
|-----------|-------|
| **Next.js 14+** | App Router, Server Components, API Routes |
| **Supabase** | PostgreSQL database, Authentication, Row Level Security |
| **Tailwind CSS** | Utility-first CSS styling |
| **TypeScript** | Type safety throughout |
| **Vercel** | Deployment platform |

---

## Environment Variables

You need **3 environment variables** from your Supabase project:

| Variable | Where to Find | Client/Server |
|----------|--------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → `anon` `public` key | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → `service_role` key | **Server-only** |

> ⚠️ **IMPORTANT**: The `SUPABASE_SERVICE_ROLE_KEY` is only used in `/api/submit-exam/route.ts` (server-side). It is NEVER bundled into client-side code.

---

## Setup Instructions

### 1. Clone and Install

```bash
cd iqra-exam-portal
npm install
```

### 2. Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **Settings → API** and copy your:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configure Environment Variables

Edit `.env.local` with your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

### 4. Run Database Migration

Go to your Supabase project → **SQL Editor** → **New Query** and paste the contents of:

```
supabase/migrations/001_initial_schema.sql
```

Click **Run** to create all tables, views, RLS policies, and indexes.

### 5. Create Admin Account

In the Supabase Dashboard:
1. Go to **Authentication → Users**
2. Click **Add User → Create New User**
3. Enter an email and password (e.g., `admin@iqraschool.com` / `your-secure-password`)
4. Check **Auto Confirm User**

This will be your admin login for the `/admin` panel.

### 6. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000` to see the app.

---

## Database Schema

### Tables
- **teachers** — Teacher name and subject
- **courses** — Course name, assigned teacher, class time, exam duration
- **questions** — MCQ questions with 4 options and correct answer
- **students** — Student name and roll number (created during exam start)
- **exam_attempts** — Exam results with score, answers, and timestamps
- **settings** — Key-value pairs (e.g., `passing_percentage`)

### Views
- **questions_public** — Same as `questions` but WITHOUT `correct_option` column (used by students)

### Row Level Security
- **Anon** (students): Can read teachers, courses, questions_public. Can insert students and exam_attempts.
- **Authenticated** (admin): Full CRUD on all tables.
- **Service Role**: Bypasses RLS (used server-side for scoring).

---

## CSV Import Format

For bulk question import, use this CSV format:

```csv
question_text,option_a,option_b,option_c,option_d,correct_option
"What is 2+2?","3","4","5","6","B"
"Capital of Pakistan?","Lahore","Karachi","Islamabad","Peshawar","C"
```

---

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/iqra-exam-portal.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and click **New Project**
2. Import your GitHub repository
3. Add the 3 environment variables in **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Click **Deploy**

Vercel will automatically build and deploy your Next.js app.

---

## Configuration

| Setting | Default | How to Change |
|---------|---------|---------------|
| Passing percentage | 50% | Update `settings` table in Supabase (`key: passing_percentage`) |
| Exam duration | 500 seconds | Set per course in Admin → Courses |
| Tab switch warnings | 3 before auto-submit | Modify in `app/exam/[courseId]/page.tsx` |

---

## Project Structure

```
iqra-exam-portal/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Global styles + design system
│   ├── admin/
│   │   ├── layout.tsx          # Admin sidebar layout
│   │   ├── page.tsx            # Redirect to dashboard
│   │   ├── login/page.tsx      # Admin login
│   │   ├── dashboard/page.tsx  # Dashboard stats
│   │   ├── teachers/page.tsx   # Teachers CRUD
│   │   ├── courses/page.tsx    # Courses CRUD
│   │   ├── questions/page.tsx  # Questions CRUD + CSV import
│   │   └── results/page.tsx    # Results + CSV export
│   ├── exam/
│   │   ├── start/page.tsx      # Student entry form
│   │   ├── [courseId]/page.tsx  # Timed exam page
│   │   └── result/
│   │       └── [attemptId]/page.tsx  # Result page
│   └── api/
│       └── submit-exam/route.ts     # Secure scoring API
├── components/
│   ├── admin/Modal.tsx         # Reusable modal
│   └── ui/
│       ├── Toast.tsx           # Toast notifications
│       └── LoadingSpinner.tsx  # Loading states
├── lib/supabase/
│   ├── client.ts               # Browser Supabase client
│   ├── server.ts               # Server Supabase client
│   └── admin.ts                # Service role client
├── middleware.ts                # Auth route protection
├── supabase/migrations/
│   └── 001_initial_schema.sql  # Database schema
├── .env.local                  # Environment variables
└── tailwind.config.ts          # Custom theme
```

---

## License

This project is proprietary to Iqra Grammar School & Academy.
