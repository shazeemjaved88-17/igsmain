// app/api/submit-exam/route.ts
// Secure server-side scoring endpoint
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

    const supabase = createAdminClient();

    // ======================================================
    // 1. ANTI-CHEAT: Check for existing completed attempt
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
    // 2. SECURE SCORING: Fetch correct answers server-side
    // ======================================================
    let { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, correct_option')
      .eq('course_id', courseId);

    // Fallback: If querying base table was restricted, query questions_public
    if (questionsError || !questions || questions.length === 0) {
      console.warn('Questions query notice:', questionsError);
      const fallbackRes = await supabase
        .from('questions_public')
        .select('id')
        .eq('course_id', courseId);
      
      if (fallbackRes.data && fallbackRes.data.length > 0) {
        // If correct options couldn't be read, try reading base table without filter
        const baseRes = await supabase.from('questions').select('id, correct_option').eq('course_id', courseId);
        questions = baseRes.data || [];
      }
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'This course has no questions to score.' },
        { status: 400 }
      );
    }

    // ======================================================
    // 3. CALCULATE SCORE
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
    // 4. INSERT EXAM ATTEMPT
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
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Duplicate submission detected. You have already completed this exam.' },
          { status: 409 }
        );
      }
      console.error('Insert exam attempt error:', insertError);
      return NextResponse.json(
        { error: `Failed to save exam results: ${insertError.message}` },
        { status: 500 }
      );
    }

    // ======================================================
    // 5. RETURN RESULT
    // ======================================================
    return NextResponse.json({
      attemptId: attempt.id,
      score,
      total_questions: totalQuestions,
      percentage,
    });
  } catch (err: any) {
    console.error('Submit exam error:', err);
    return NextResponse.json(
      { error: err?.message || 'An unexpected error occurred during exam submission.' },
      { status: 500 }
    );
  }
}
