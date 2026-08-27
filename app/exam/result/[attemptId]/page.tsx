// app/exam/result/[attemptId]/page.tsx
// Exam result page — shows score, percentage, pass/fail badge, and print button
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface AttemptResult {
  id: string;
  score: number;
  total_questions: number;
  status: string;
  start_time: string;
  end_time: string;
  created_at: string;
  students: { name: string; roll_number: string } | null;
  courses: { name: string; teachers: { name: string } | null } | null;
}

export default function ResultPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passingPct, setPassingPct] = useState(50);
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
    }
    setLoading(false);
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

  const percentage = result.total_questions
    ? Math.round((result.score / result.total_questions) * 100)
    : 0;
  const passed = percentage >= passingPct;

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

      {/* Result Card */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
        }}
      >
        <div
          className="card animate-scale-in"
          style={{
            width: '100%',
            maxWidth: '500px',
            overflow: 'hidden',
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
              <p style={{ fontSize: '3rem', fontWeight: 800, color: passed ? 'var(--accent)' : '#dc2626', lineHeight: 1 }}>
                {result.score} / {result.total_questions}
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {percentage}%
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
              <button className="btn btn-primary" onClick={handlePrint}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                </svg>
                Print Result
              </button>
              <Link href="/" className="btn btn-outline" style={{ textDecoration: 'none' }}>
                Go to Home
              </Link>
            </div>
          </div>
        </div>
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
