-- Fix RLS policy on questions table to allow exam submission scoring
-- Copy & Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)

DROP POLICY IF EXISTS "anon_select_questions" ON questions;

CREATE POLICY "anon_select_questions" ON questions
  FOR SELECT TO anon USING (true);
