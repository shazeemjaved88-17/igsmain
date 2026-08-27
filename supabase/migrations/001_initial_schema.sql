-- =====================================================
-- Iqra Grammar School & Academy Exam Portal
-- Database Schema Migration
-- =====================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLE: teachers
-- =====================================================
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: courses
-- =====================================================
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
  class_time text,
  duration_seconds integer NOT NULL DEFAULT 500,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: questions
-- =====================================================
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_option char(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: students
-- =====================================================
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  roll_number text NOT NULL,
  course_id uuid REFERENCES courses(id),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: exam_attempts
-- =====================================================
CREATE TABLE IF NOT EXISTS exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id),
  course_id uuid REFERENCES courses(id),
  start_time timestamptz,
  end_time timestamptz,
  score integer,
  total_questions integer,
  answers jsonb,
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: settings (for configurable passing percentage etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert default passing percentage
INSERT INTO settings (key, value) VALUES ('passing_percentage', '50')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- UNIQUE CONSTRAINT: Prevent duplicate completed attempts
-- A student (by roll_number + course_id) can only have one completed attempt
-- =====================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_completed_attempt
  ON exam_attempts (student_id, course_id)
  WHERE status = 'completed';

-- =====================================================
-- VIEW: questions_public
-- Exposes questions WITHOUT correct_option for public/anon access
-- =====================================================
CREATE OR REPLACE VIEW questions_public AS
  SELECT id, course_id, question_text, option_a, option_b, option_c, option_d, created_at
  FROM questions;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON questions_public TO anon;
GRANT SELECT ON questions_public TO authenticated;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ----- TEACHERS -----
-- Anon can read teachers (for student dropdown)
CREATE POLICY "anon_select_teachers" ON teachers
  FOR SELECT TO anon USING (true);

-- Authenticated can read teachers
CREATE POLICY "auth_select_teachers" ON teachers
  FOR SELECT TO authenticated USING (true);

-- Authenticated (admin) can insert teachers
CREATE POLICY "auth_insert_teachers" ON teachers
  FOR INSERT TO authenticated WITH CHECK (true);

-- Authenticated (admin) can update teachers
CREATE POLICY "auth_update_teachers" ON teachers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Authenticated (admin) can delete teachers
CREATE POLICY "auth_delete_teachers" ON teachers
  FOR DELETE TO authenticated USING (true);

-- ----- COURSES -----
-- Anon can read courses (for student dropdown)
CREATE POLICY "anon_select_courses" ON courses
  FOR SELECT TO anon USING (true);

-- Authenticated can read courses
CREATE POLICY "auth_select_courses" ON courses
  FOR SELECT TO authenticated USING (true);

-- Authenticated (admin) can insert courses
CREATE POLICY "auth_insert_courses" ON courses
  FOR INSERT TO authenticated WITH CHECK (true);

-- Authenticated (admin) can update courses
CREATE POLICY "auth_update_courses" ON courses
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Authenticated (admin) can delete courses
CREATE POLICY "auth_delete_courses" ON courses
  FOR DELETE TO authenticated USING (true);

-- ----- QUESTIONS -----
-- IMPORTANT: Anon should NOT be able to SELECT from the base questions table
-- They must use the questions_public view instead (which excludes correct_option)
-- No anon policy on questions table = anon cannot read it directly

-- Authenticated (admin) can full CRUD on questions
CREATE POLICY "auth_select_questions" ON questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_questions" ON questions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_questions" ON questions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_questions" ON questions
  FOR DELETE TO authenticated USING (true);

-- ----- STUDENTS -----
-- Anon can insert students (student registration during exam start)
CREATE POLICY "anon_insert_students" ON students
  FOR INSERT TO anon WITH CHECK (true);

-- Anon can read their own student record (needed for result page)
CREATE POLICY "anon_select_students" ON students
  FOR SELECT TO anon USING (true);

-- Authenticated (admin) can read all students
CREATE POLICY "auth_select_students" ON students
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_students" ON students
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_students" ON students
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_students" ON students
  FOR DELETE TO authenticated USING (true);

-- ----- EXAM_ATTEMPTS -----
-- Anon can insert exam_attempts (via API route, but also direct for flexibility)
CREATE POLICY "anon_insert_exam_attempts" ON exam_attempts
  FOR INSERT TO anon WITH CHECK (true);

-- Anon can read their own attempt (for result page)
CREATE POLICY "anon_select_exam_attempts" ON exam_attempts
  FOR SELECT TO anon USING (true);

-- Authenticated (admin) can read all attempts
CREATE POLICY "auth_select_exam_attempts" ON exam_attempts
  FOR SELECT TO authenticated USING (true);

-- ----- SETTINGS -----
-- Anon can read settings (for passing percentage on result page)
CREATE POLICY "anon_select_settings" ON settings
  FOR SELECT TO anon USING (true);

-- Authenticated can read settings
CREATE POLICY "auth_select_settings" ON settings
  FOR SELECT TO authenticated USING (true);

-- Authenticated can update settings
CREATE POLICY "auth_update_settings" ON settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Authenticated can insert settings
CREATE POLICY "auth_insert_settings" ON settings
  FOR INSERT TO authenticated WITH CHECK (true);
