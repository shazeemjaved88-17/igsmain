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

    if (questionsError) {
      console.warn('Primary questions query notice:', questionsError);
    }

    // Fallback logic if primary questions query returned empty or failed
    if (!questions || questions.length === 0) {
      const fallbackRes = await supabase
        .from('questions_public')
        .select('id')
        .eq('course_id', courseId);

      if (fallbackRes.data && fallbackRes.data.length > 0) {
        // Questions exist in public view, try fetching questions base table again
        const retryRes = await supabase
          .from('questions')
          .select('id, correct_option')
          .eq('course_id', courseId);
          
        if (retryRes.data && retryRes.data.length > 0) {
          questions = retryRes.data;
        } else {
          console.error(
            `Course ${courseId} has ${fallbackRes.data.length} questions in questions_public, but base questions table query failed or returned 0 rows. Check Supabase RLS policies on 'questions' table or SUPABASE_SERVICE_ROLE_KEY.`
          );
          return NextResponse.json(
            { error: 'Exam submission scoring failed because question answers are restricted by database permission policy. Please notify your administrator.' },
            { status: 500 }
          );
        }
      }
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'This course currently has no questions added. Please ask your course teacher or administrator to add questions.' },
        { status: 400 }
      );
    }

    // ======================================================
    // 3. CALCULATE SCORE (1 MCQ = 2 Marks)
    // ======================================================
    let correctCount = 0;
    const totalQuestions = questions.length;
    const totalMarks = totalQuestions * 2; // Each MCQ carries 2 marks

    for (const question of questions) {
      const studentAnswer = answers[question.id] ? String(answers[question.id]).trim().toUpperCase() : '';
      const correctOption = question.correct_option ? String(question.correct_option).trim().toUpperCase() : '';
      
      if (studentAnswer && studentAnswer === correctOption) {
        correctCount++;
      }
    }

    const score = correctCount * 2; // 2 marks per MCQ
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

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
      total_marks: totalMarks,
      correct_count: correctCount,
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
