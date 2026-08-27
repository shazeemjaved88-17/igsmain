// app/exam/[courseId]/page.tsx
// The exam page — timed MCQ exam with anti-cheating measures
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

interface ExamSession {
  studentId: string;
  studentName: string;
  rollNumber: string;
  courseId: string;
  durationSeconds: number;
  startTime: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'warning' | 'error' | 'success';
}

export default function ExamPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const router = useRouter();
  const supabase = createClient();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<ExamSession | null>(null);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isSubmittingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastCounterRef = useRef(0);

  // Show toast notification
  const showToast = useCallback((message: string, type: 'warning' | 'error' | 'success' = 'warning') => {
    const id = ++toastCounterRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Submit exam function
  const submitExam = useCallback(
    async (currentAnswers: Record<string, string>) => {
      if (isSubmittingRef.current || !session) return;
      isSubmittingRef.current = true;
      setSubmitting(true);

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      try {
        const res = await fetch('/api/submit-exam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: session.studentId,
            courseId: session.courseId,
            answers: currentAnswers,
            startTime: session.startTime,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to submit exam');
        }

        // Clear session
        sessionStorage.removeItem('examSession');

        // Redirect to result page
        router.push(`/exam/result/${data.attemptId}`);
      } catch (err) {
        isSubmittingRef.current = false;
        setSubmitting(false);
        setError(err instanceof Error ? err.message : 'Failed to submit exam. Please try again.');
      }
    },
    [session, router]
  );

  // Initialize exam
  useEffect(() => {
    const sessionData = sessionStorage.getItem('examSession');
    if (!sessionData) {
      setError('No exam session found. Please start your exam from the beginning.');
      setLoading(false);
      return;
    }

    const parsed: ExamSession = JSON.parse(sessionData);
    if (parsed.courseId !== courseId) {
      setError('Course mismatch. Please start your exam again.');
      setLoading(false);
      return;
    }

    setSession(parsed);

    // Calculate remaining time
    const elapsed = Math.floor((Date.now() - new Date(parsed.startTime).getTime()) / 1000);
    const remaining = Math.max(0, parsed.durationSeconds - elapsed);
    setTimeLeft(remaining);

    if (remaining <= 0) {
      setError('Your exam time has expired.');
      setLoading(false);
      return;
    }

    // Fetch questions (using the public view — no correct_option)
    fetchQuestions();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || loading || submitting) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up — auto submit
          if (!isSubmittingRef.current) {
            showToast('Time is up! Auto-submitting your exam...', 'warning');
            // Use the latest answers from the state via a callback
            setAnswers((currentAnswers) => {
              submitExam(currentAnswers);
              return currentAnswers;
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, submitting, showToast, submitExam, timeLeft]);

  // Anti-cheating: Tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !isSubmittingRef.current) {
        setTabWarnings((prev) => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            showToast('Maximum tab switches exceeded. Auto-submitting exam.', 'error');
            setAnswers((currentAnswers) => {
              submitExam(currentAnswers);
              return currentAnswers;
            });
          } else {
            showToast(
              `Warning ${newCount}/3: Switching tabs during the exam is recorded.`,
              'warning'
            );
          }
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [showToast, submitExam]);

  // Anti-cheating: Disable right-click and copy
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showToast('Right-click is disabled during the exam.', 'warning');
    };

    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      showToast('Copy/paste is disabled during the exam.', 'warning');
    };

    const preventKeyShortcuts = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+Shift+I
      if (e.ctrlKey && ['c', 'v', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('paste', preventCopy);
    document.addEventListener('keydown', preventKeyShortcuts);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('paste', preventCopy);
      document.removeEventListener('keydown', preventKeyShortcuts);
    };
  }, [showToast]);

  async function fetchQuestions() {
    // Fetch from questions_public view (no correct_option column)
    const { data, error } = await supabase
      .from('questions_public')
      .select('id, question_text, option_a, option_b, option_c, option_d')
      .eq('course_id', courseId);

    if (error) {
      setError('Failed to load questions. Please contact your teacher.');
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setError('This course has no questions yet. Please contact your teacher.');
      setLoading(false);
      return;
    }

    setQuestions(data);
    setLoading(false);
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function handleOptionSelect(questionId: string, option: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  }

  function handleManualSubmit() {
    setShowConfirmModal(true);
  }

  function confirmSubmit() {
    setShowConfirmModal(false);
    submitExam(answers);
  }

  const answeredCount = Object.keys(answers).length;
  const isTimeCritical = timeLeft <= 60;

  // Error state
  if (error && !submitting) {
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
          <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</p>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', color: '#dc2626' }}>
            Exam Error
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <a href="/exam/start" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Go to Exam Entry
          </a>
        </div>
      </div>
    );
  }

  // Loading state
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
          <p style={{ color: 'var(--text-secondary)' }}>Loading your exam...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-secondary)',
        paddingBottom: '5rem', // Space for sticky footer
      }}
    >
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.type === 'warning' ? '⚠' : toast.type === 'error' ? '✕' : '✓'}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Sticky Timer Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'white',
          borderBottom: '1px solid var(--border)',
          padding: '0.75rem 1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {session?.studentName}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Roll: {session?.rollNumber}
              </span>
              {questions.length > 0 && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.125rem 0.5rem',
                    borderRadius: '12px',
                    background: '#f3e8f9',
                    color: 'var(--primary)',
                  }}
                >
                  {questions.length} MCQs ({questions.length * 2} Marks)
                </span>
              )}
            </div>
          </div>

          <div
            className={isTimeCritical ? 'countdown-critical' : ''}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: isTimeCritical ? '#fef2f2' : 'var(--bg-secondary)',
              border: `1px solid ${isTimeCritical ? '#fecaca' : 'var(--border)'}`,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                fontFamily: 'monospace',
                color: isTimeCritical ? '#dc2626' : 'var(--text-primary)',
              }}
            >
              {formatTime(timeLeft)}
            </span>
          </div>

          {tabWarnings > 0 && (
            <div
              style={{
                fontSize: '0.75rem',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              ⚠ Warnings: {tabWarnings}/3
            </div>
          )}
        </div>
      </header>

      {/* Questions */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={`question-card ${answers[q.id] ? 'answered' : ''}`}
              id={`question-${i + 1}`}
            >
              <p
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  marginBottom: '1rem',
                  lineHeight: 1.6,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: answers[q.id] ? 'var(--accent)' : 'var(--primary)',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginRight: '0.75rem',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                {q.question_text}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                  const key = `option_${opt.toLowerCase()}` as keyof Question;
                  const isSelected = answers[q.id] === opt;
                  return (
                    <label
                      key={opt}
                      className={`radio-option ${isSelected ? 'selected' : ''}`}
                      style={{ userSelect: 'none' }}
                    >
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={opt}
                        checked={isSelected}
                        onChange={() => handleOptionSelect(q.id, opt)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontWeight: 600, color: 'var(--primary)', minWidth: '1.25rem' }}>
                        {opt}.
                      </span>
                      <span>{q[key]}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Sticky Footer Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'white',
          borderTop: '1px solid var(--border)',
          padding: '0.75rem 1.5rem',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 600, color: answeredCount === questions.length ? 'var(--accent)' : 'var(--primary)' }}>
              {answeredCount}
            </span>{' '}
            of {questions.length} answered
          </p>
          <button
            className="btn btn-primary"
            onClick={handleManualSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span
                  className="animate-spin"
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    display: 'inline-block',
                  }}
                />
                Submitting...
              </>
            ) : (
              'Submit Paper'
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfirmModal(false);
          }}
        >
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📝</p>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Submit Your Exam?
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
                Are you sure you want to submit? You cannot change your answers after this.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
                {answeredCount} of {questions.length} questions answered
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Go Back
                </button>
                <button className="btn btn-primary" onClick={confirmSubmit}>
                  Yes, Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
