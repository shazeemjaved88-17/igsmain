// app/api/submit-exam/route.ts
// Secure server-side scoring endpoint
// Uses service role key to fetch correct answers — NEVER exposed to client
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, courseId, answers, startTime } = body;

    // Validate required fields
    if (!studentId || !courseId || !answers || !startTime) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, courseId, answers, startTime' },
        { status: 400 }
      );
    }

    // Use the admin client (service role key) to bypass RLS
    const supabase = createAdminClient();

    // ======================================================
    // ANTI-CHEAT: Check for existing completed attempt
    // ======================================================
    const { data: existingAttempt } = await supabase
      .from('exam_attempts')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('status', 'completed')
      .maybeSingle();

    if (existingAttempt) {
      return NextResponse.json(
        { error: 'You have already submitted this exam. Duplicate submissions are not allowed.' },
        { status: 409 }
      );
    }

    // ======================================================
    // SECURE SCORING: Fetch correct answers server-side
    // ======================================================
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, correct_option')
      .eq('course_id', courseId);

    if (questionsError || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to retrieve questions for scoring.' },
        { status: 500 }
      );
    }

    // ======================================================
    // CALCULATE SCORE
    // ======================================================
    let score = 0;
    const totalQuestions = questions.length;

    for (const question of questions) {
      const studentAnswer = answers[question.id];
      if (studentAnswer && studentAnswer === question.correct_option) {
        score++;
      }
    }

    const percentage = Math.round((score / totalQuestions) * 100);

    // ======================================================
    // INSERT EXAM ATTEMPT
    // ======================================================
    const { data: attempt, error: insertError } = await supabase
      .from('exam_attempts')
      .insert({
        student_id: studentId,
        course_id: courseId,
        start_time: startTime,
        end_time: new Date().toISOString(),
        score,
        total_questions: totalQuestions,
        answers, // Store raw answers for admin review
        status: 'completed',
      })
      .select('id')
      .single();

    if (insertError) {
      // Handle unique constraint violation (duplicate attempt)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Duplicate submission detected. You have already completed this exam.' },
          { status: 409 }
        );
      }
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save exam results.' },
        { status: 500 }
      );
    }

    // ======================================================
    // RETURN RESULT (no correct answers exposed)
    // ======================================================
    return NextResponse.json({
      attemptId: attempt.id,
      score,
      total_questions: totalQuestions,
      percentage,
    });
  } catch (err) {
    console.error('Submit exam error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
