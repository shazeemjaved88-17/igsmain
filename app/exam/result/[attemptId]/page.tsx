// app/exam/result/[attemptId]/page.tsx
// Exam result page — shows score, percentage, pass/fail badge, and print button
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateAttemptedPaperPDF } from '@/lib/utils/pdfGenerator';
import Link from 'next/link';

interface AttemptResult {
  id: string;
  course_id: string;
  score: number;
  total_questions: number;
  answers: Record<string, string> | null;
  status: string;
  start_time: string;
  end_time: string;
  created_at: string;
  students: { name: string; roll_number: string } | null;
  courses: { name: string; teachers: { name: string } | null } | null;
}

interface QuestionReview {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option?: string;
}

export default function ResultPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [questions, setQuestions] = useState<QuestionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passingPct, setPassingPct] = useState(50);
  const [showPaperReview, setShowPaperReview] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchResult();
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  async function fetchResult() {
    const { data, error: fetchError } = await supabase
      .from('exam_attempts')
      .select('*, students(name, roll_number), courses(name, teachers(name))')
      .eq('id', attemptId)
      .single();

    if (fetchError || !data) {
      setError('Result not found. The exam attempt could not be located.');
    } else {
      setResult(data);
      if (data.course_id) {
        fetchQuestions(data.course_id);
      }
    }
    setLoading(false);
  }

  async function fetchQuestions(courseId: string) {
    let { data: qs } = await supabase
      .from('questions')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });

    if (!qs || qs.length === 0) {
      const fallback = await supabase
        .from('questions_public')
        .select('*')
        .eq('course_id', courseId);
      qs = fallback.data || [];
    }
    setQuestions(qs || []);
  }

  async function fetchSettings() {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'passing_percentage')
      .single();

    if (data) {
      setPassingPct(parseInt(data.value) || 50);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPDF() {
    if (!result) return;
    setExportingPdf(true);
    try {
      const filename = `${result.students?.name || 'Student'}_${result.students?.roll_number || ''}_Attempted_Paper.pdf`.replace(/\s+/g, '_');
      await generateAttemptedPaperPDF({
        elementId: 'attempted-paper-pdf-content',
        filename,
        studentName: result.students?.name || 'Student',
        rollNumber: result.students?.roll_number || 'N/A',
        courseName: result.courses?.name || 'Exam',
        teacherName: result.courses?.teachers?.name || 'N/A',
        score: result.score,
        totalQuestions: result.total_questions,
        createdAt: result.created_at,
        questions,
        answers: result.answers,
      });
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExportingPdf(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-secondary)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            className="animate-spin"
            style={{
              width: '48px',
              height: '48px',
              border: '3px solid var(--border)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ color: 'var(--text-secondary)' }}>Loading your result...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: 'var(--bg-secondary)',
        }}
      >
        <div className="card" style={{ padding: '2rem', maxWidth: '500px', textAlign: 'center' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>❌</p>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Result Not Found
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <Link href="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const totalMarks = result.total_questions ? result.total_questions * 2 : 0;
  const percentage = totalMarks
    ? Math.round((result.score / totalMarks) * 100)
    : 0;
  const passed = percentage >= passingPct;
  const correctCount = Math.round(result.score / 2);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f3e8f9 0%, #ffffff 50%, #e8f5ed 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        className="no-print"
        style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(255,255,255,0.9)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6B2C91, #8B4CAF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.875rem',
            }}
          >
            IA
          </div>
          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--primary)' }}>
            Iqra Grammar School
          </span>
        </Link>
      </header>

      {/* Result Main Content */}
      <main
        id="attempted-paper-pdf-content"
        style={{
          flex: 1,
          maxWidth: '750px',
          width: '100%',
          margin: '0 auto',
          padding: '2rem 1rem',
          background: '#ffffff',
        }}
      >
        {/* Result Summary Card */}
        <div
          className="card animate-scale-in"
          style={{
            width: '100%',
            overflow: 'hidden',
            marginBottom: '2rem',
          }}
        >
          {/* Result Header */}
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              background: passed
                ? 'linear-gradient(135deg, #1B7A3D, #2d9e55)'
                : 'linear-gradient(135deg, #dc2626, #ef4444)',
              color: 'white',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
              {passed ? '🎉' : '📋'}
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Exam Result
            </h1>
            <span
              className={`badge ${passed ? 'badge-pass' : 'badge-fail'}`}
              style={{
                fontSize: '1rem',
                padding: '0.375rem 1.25rem',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
              }}
            >
              {passed ? '✓ PASS' : '✕ FAIL'}
            </span>
          </div>

          {/* Score Display */}
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            {/* Big Score */}
            <div style={{ marginBottom: '2rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Obtained Marks
              </p>
              <p style={{ fontSize: '3rem', fontWeight: 800, color: passed ? 'var(--accent)' : '#dc2626', lineHeight: 1 }}>
                {result.score} / {totalMarks}
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                {percentage}%
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                ({correctCount} of {result.total_questions} Questions Correct • 2 Marks each)
              </p>
            </div>

            {/* Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                textAlign: 'left',
                marginBottom: '2rem',
              }}
            >
              <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Student Name
                </p>
                <p style={{ fontWeight: 500, fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {result.students?.name || '—'}
                </p>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Roll Number
                </p>
                <p style={{ fontWeight: 500, fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {result.students?.roll_number || '—'}
                </p>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Course
                </p>
                <p style={{ fontWeight: 500, fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {result.courses?.name || '—'}
                </p>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Teacher
                </p>
                <p style={{ fontWeight: 500, fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {result.courses?.teachers?.name || '—'}
                </p>
              </div>
            </div>

            {/* Date */}
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                marginBottom: '1.5rem',
              }}
            >
              Submitted on {new Date(result.end_time || result.created_at).toLocaleString()}
            </p>

            {/* Actions */}
            <div className="no-print" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-accent"
                onClick={handleDownloadPDF}
                disabled={exportingPdf}
                style={{ background: '#10b981', borderColor: '#10b981', color: 'white' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {exportingPdf ? 'Generating PDF...' : 'Download PDF'}
              </button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                </svg>
                Print Result & Paper Sheet
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setShowPaperReview(!showPaperReview)}
              >
                {showPaperReview ? '🙈 Hide Paper Review' : '📝 View Paper Review'}
              </button>
              <Link href="/" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                Go to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Detailed Attempted Paper Review */}
        {showPaperReview && (
          <div className="animate-fade-in" style={{ marginTop: '2rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Complete Attempted Paper Review
              </h2>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {questions.length} Questions
              </span>
            </div>

            {questions.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No question details available for this attempt.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {questions.map((q, idx) => {
                  const studentSelected = result.answers ? result.answers[q.id] : undefined;
                  const selectedNorm = studentSelected ? String(studentSelected).trim().toUpperCase() : '';
                  const correctNorm = q.correct_option ? String(q.correct_option).trim().toUpperCase() : '';

                  const isCorrect = selectedNorm !== '' && selectedNorm === correctNorm;
                  const isAttempted = selectedNorm !== '';

                  return (
                    <div
                      key={q.id}
                      className="card"
                      style={{
                        padding: '1.25rem',
                        borderLeft: `4px solid ${
                          isCorrect
                            ? '#2d9e55'
                            : isAttempted
                            ? '#dc2626'
                            : '#9ca3af'
                        }`,
                      }}
                    >
                      {/* Question Header & Status */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)' }}>
                          Question {idx + 1} of {questions.length}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.625rem',
                            borderRadius: '12px',
                            background: isCorrect
                              ? '#e8f5ed'
                              : isAttempted
                              ? '#fef2f2'
                              : '#f3f4f6',
                            color: isCorrect
                              ? '#1B7A3D'
                              : isAttempted
                              ? '#dc2626'
                              : '#6b7280',
                          }}
                        >
                          {isCorrect
                            ? '✓ Correct (+2 Marks)'
                            : isAttempted
                            ? '✕ Incorrect (0 Marks)'
                            : '⚪ Unanswered (0 Marks)'}
                        </span>
                      </div>

                      {/* Question Text */}
                      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                        {q.question_text}
                      </p>

                      {/* Options Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                          const key = `option_${opt.toLowerCase()}` as keyof QuestionReview;
                          const optText = q[key] || '';
                          const isStudentChoice = selectedNorm === opt;
                          const isCorrectOption = correctNorm === opt;

                          let bg = 'var(--bg-secondary)';
                          let borderColor = 'var(--border)';
                          let badgeText = '';
                          let badgeBg = '';
                          let badgeColor = '';

                          if (isStudentChoice && isCorrectOption) {
                            bg = '#e8f5ed';
                            borderColor = '#2d9e55';
                            badgeText = '✓ Selected (Correct)';
                            badgeBg = '#2d9e55';
                            badgeColor = 'white';
                          } else if (isStudentChoice && !isCorrectOption) {
                            bg = '#fef2f2';
                            borderColor = '#ef4444';
                            badgeText = '✕ Selected (Wrong)';
                            badgeBg = '#ef4444';
                            badgeColor = 'white';
                          } else if (isCorrectOption && (!isStudentChoice || !isAttempted)) {
                            bg = '#e8f5ed';
                            borderColor = '#2d9e55';
                            badgeText = '✓ Correct Answer';
                            badgeBg = '#1B7A3D';
                            badgeColor = 'white';
                          }

                          return (
                            <div
                              key={opt}
                              style={{
                                padding: '0.625rem 0.875rem',
                                borderRadius: 'var(--radius-sm)',
                                background: bg,
                                border: `1.5px solid ${borderColor}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.875rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: '1.25rem' }}>
                                  {opt}.
                                </span>
                                <span style={{ color: 'var(--text-primary)' }}>{optText}</span>
                              </div>

                              {badgeText && (
                                <span
                                  style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    padding: '0.125rem 0.5rem',
                                    borderRadius: '4px',
                                    background: badgeBg,
                                    color: badgeColor,
                                    whiteSpace: 'nowrap',
                                    marginLeft: '0.5rem',
                                  }}
                                >
                                  {badgeText}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '1.5rem',
          color: 'var(--text-muted)',
          fontSize: '0.8125rem',
        }}
      >
        © {new Date().getFullYear()} Iqra Grammar School & Academy
      </footer>
    </div>
  );
}
