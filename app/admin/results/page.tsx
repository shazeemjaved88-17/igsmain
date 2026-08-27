// app/admin/results/page.tsx
// Admin results page — exam attempts table with filters and CSV export
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { SkeletonTable } from '@/components/ui/LoadingSpinner';

interface Course {
  id: string;
  name: string;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
}

interface AttemptRow {
  id: string;
  course_id: string;
  score: number;
  total_questions: number;
  answers: Record<string, string> | null;
  status: string;
  created_at: string;
  start_time: string;
  end_time: string;
  students: { name: string; roll_number: string } | null;
  courses: { name: string; teachers: { name: string } | null } | null;
}

export default function ResultsPage() {
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Paper review modal state
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptRow | null>(null);
  const [paperQuestions, setPaperQuestions] = useState<Question[]>([]);
  const [paperLoading, setPaperLoading] = useState(false);
  const [paperModalOpen, setPaperModalOpen] = useState(false);
  const [paperFilter, setPaperFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');

  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCourse, filterDateFrom, filterDateTo]);

  async function fetchCourses() {
    const { data } = await supabase.from('courses').select('id, name').order('name');
    setCourses(data || []);
  }

  async function fetchAttempts() {
    setLoading(true);
    let query = supabase
      .from('exam_attempts')
      .select('*, students(name, roll_number), courses(name, teachers(name))')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (filterCourse) {
      query = query.eq('course_id', filterCourse);
    }
    if (filterDateFrom) {
      query = query.gte('created_at', new Date(filterDateFrom).toISOString());
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      query = query.lte('created_at', to.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      showToast('Failed to load results', 'error');
    } else {
      setAttempts(data || []);
    }
    setLoading(false);
  }

  async function handleViewPaper(attempt: AttemptRow) {
    setSelectedAttempt(attempt);
    setPaperModalOpen(true);
    setPaperLoading(true);

    let { data: qs, error } = await supabase
      .from('questions')
      .select('*')
      .eq('course_id', attempt.course_id)
      .order('created_at', { ascending: true });

    if (error || !qs || qs.length === 0) {
      const fallback = await supabase
        .from('questions_public')
        .select('*')
        .eq('course_id', attempt.course_id);
      qs = fallback.data || [];
    }

    setPaperQuestions(qs || []);
    setPaperLoading(false);
  }

  function exportCSV() {
    if (attempts.length === 0) {
      showToast('No data to export', 'warning');
      return;
    }

    const headers = ['Student Name', 'Roll Number', 'Course', 'Teacher', 'Obtained Marks', 'Total Marks', 'Questions', 'Percentage', 'Status', 'Date'];
    const rows = attempts.map((a) => {
      const totalMarks = (a.total_questions || 0) * 2;
      const pct = totalMarks ? Math.round(((a.score || 0) / totalMarks) * 100) : 0;
      return [
        a.students?.name || '',
        a.students?.roll_number || '',
        a.courses?.name || '',
        a.courses?.teachers?.name || '',
        a.score?.toString() || '0',
        totalMarks.toString(),
        a.total_questions?.toString() || '0',
        `${pct}%`,
        pct >= 50 ? 'PASS' : 'FAIL',
        new Date(a.created_at).toLocaleString(),
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully');
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Exam Results</h1>
        <button className="btn btn-accent" onClick={exportCSV}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export to CSV
        </button>
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: '1 1 200px' }}>
          <label htmlFor="filter-course" className="label">Filter by Course</label>
          <select
            id="filter-course"
            className="select"
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label htmlFor="filter-from" className="label">From Date</label>
          <input
            id="filter-from"
            type="date"
            className="input"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
          />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label htmlFor="filter-to" className="label">To Date</label>
          <input
            id="filter-to"
            type="date"
            className="input"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
          />
        </div>
        {(filterCourse || filterDateFrom || filterDateTo) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setFilterCourse('');
              setFilterDateFrom('');
              setFilterDateTo('');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonTable rows={8} />
      ) : attempts.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</p>
          <p style={{ color: 'var(--text-secondary)' }}>
            {filterCourse || filterDateFrom || filterDateTo
              ? 'No results match your filters.'
              : 'No exam attempts yet. Results will appear here once students complete their exams.'}
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Showing {attempts.length} result{attempts.length !== 1 ? 's' : ''}
          </p>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Roll #</th>
                  <th>Course</th>
                  <th>Teacher</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Result</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a, i) => {
                  const totalMarks = (a.total_questions || 0) * 2;
                  const pct = totalMarks ? Math.round(((a.score || 0) / totalMarks) * 100) : 0;
                  const passed = pct >= 50;
                  return (
                    <tr
                      key={a.id}
                      className="animate-fade-in"
                      onClick={() => handleViewPaper(a)}
                      style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                      title="Click row to view full student attempted paper & selected options"
                    >
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{a.students?.name || '—'}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, padding: '0.125rem 0.375rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                          {a.students?.roll_number || '—'}
                        </span>
                      </td>
                      <td>{a.courses?.name || '—'}</td>
                      <td>{a.courses?.teachers?.name || '—'}</td>
                      <td style={{ fontWeight: 700 }}>
                        {a.score} / {totalMarks}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: passed ? 'var(--accent)' : '#dc2626' }}>
                          {pct}%
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${passed ? 'badge-pass' : 'badge-fail'}`}>
                          {passed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(a.created_at).toLocaleDateString()}{' '}
                        {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPaper(a);
                            }}
                            style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            title="View student attempted paper with all questions and selected answers"
                          >
                            👁 View Paper
                          </button>
                          <a
                            href={`/exam/result/${a.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', padding: '0.25rem 0.5rem', textDecoration: 'none' }}
                            title="Open student result card in new tab"
                            onClick={(e) => e.stopPropagation()}
                          >
                            📜 Result Card ↗
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Student Attempt Paper Review Modal */}
      {paperModalOpen && selectedAttempt && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPaperModalOpen(false);
          }}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #6B2C91, #4A1D63)',
                color: 'white',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                  Answer Sheet — {selectedAttempt.students?.name || 'Student'} (Roll: {selectedAttempt.students?.roll_number})
                </h2>
                <p style={{ fontSize: '0.8125rem', opacity: 0.85, marginTop: '0.125rem' }}>
                  Course: {selectedAttempt.courses?.name || '—'} • Teacher: {selectedAttempt.courses?.teachers?.name || '—'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="btn btn-sm"
                  onClick={() => window.print()}
                  style={{ background: 'white', color: 'var(--primary)', fontWeight: 600 }}
                >
                  🖨 Print Paper
                </button>
                <button
                  onClick={() => setPaperModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    lineHeight: 1,
                  }}
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {/* Stats Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Score Obtained
                  </p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {selectedAttempt.score} / {(selectedAttempt.total_questions || 0) * 2}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Percentage
                  </p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>
                    {selectedAttempt.total_questions
                      ? Math.round((selectedAttempt.score / (selectedAttempt.total_questions * 2)) * 100)
                      : 0}%
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Result Status
                  </p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: (selectedAttempt.score / ((selectedAttempt.total_questions || 1) * 2)) >= 0.5 ? '#1B7A3D' : '#dc2626' }}>
                    {(selectedAttempt.score / ((selectedAttempt.total_questions || 1) * 2)) >= 0.5 ? 'PASS' : 'FAIL'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Submitted At
                  </p>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {new Date(selectedAttempt.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Questions Breakdown Header & Filter Tabs */}
              {!paperLoading && paperQuestions.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Attempted Questions ({paperQuestions.length})
                  </h3>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {(['all', 'correct', 'incorrect', 'unanswered'] as const).map((filter) => {
                      const isActive = paperFilter === filter;
                      const count = paperQuestions.filter((q) => {
                        const studentSelected = selectedAttempt.answers ? selectedAttempt.answers[q.id] : undefined;
                        const selectedNorm = studentSelected ? String(studentSelected).trim().toUpperCase() : '';
                        const correctNorm = q.correct_option ? String(q.correct_option).trim().toUpperCase() : '';
                        const isCorrect = selectedNorm !== '' && selectedNorm === correctNorm;
                        const isAttempted = selectedNorm !== '';

                        if (filter === 'correct') return isCorrect;
                        if (filter === 'incorrect') return isAttempted && !isCorrect;
                        if (filter === 'unanswered') return !isAttempted;
                        return true;
                      }).length;

                      return (
                        <button
                          key={filter}
                          onClick={() => setPaperFilter(filter)}
                          className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '20px',
                            textTransform: 'capitalize',
                          }}
                        >
                          {filter} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Questions Breakdown */}
              {paperLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div
                    className="animate-spin"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '3px solid var(--border)',
                      borderTopColor: 'var(--primary)',
                      borderRadius: '50%',
                      margin: '0 auto 1rem',
                    }}
                  />
                  <p style={{ color: 'var(--text-secondary)' }}>Loading attempted questions & answers...</p>
                </div>
              ) : paperQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No questions found for this course.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {paperQuestions
                    .filter((q) => {
                      const studentSelected = selectedAttempt.answers ? selectedAttempt.answers[q.id] : undefined;
                      const selectedNorm = studentSelected ? String(studentSelected).trim().toUpperCase() : '';
                      const correctNorm = q.correct_option ? String(q.correct_option).trim().toUpperCase() : '';
                      const isCorrect = selectedNorm !== '' && selectedNorm === correctNorm;
                      const isAttempted = selectedNorm !== '';

                      if (paperFilter === 'correct') return isCorrect;
                      if (paperFilter === 'incorrect') return isAttempted && !isCorrect;
                      if (paperFilter === 'unanswered') return !isAttempted;
                      return true;
                    })
                    .map((q, idx) => {
                      const studentSelected = selectedAttempt.answers ? selectedAttempt.answers[q.id] : undefined;
                      const selectedNorm = studentSelected ? String(studentSelected).trim().toUpperCase() : '';
                      const correctNorm = q.correct_option ? String(q.correct_option).trim().toUpperCase() : '';

                      const isCorrect = selectedNorm !== '' && selectedNorm === correctNorm;
                      const isAttempted = selectedNorm !== '';

                    return (
                      <div
                        key={q.id}
                        style={{
                          padding: '1.25rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          borderLeft: `4px solid ${
                            isCorrect ? '#2d9e55' : isAttempted ? '#dc2626' : '#9ca3af'
                          }`,
                          background: 'white',
                        }}
                      >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)' }}>
                            Question {idx + 1} of {paperQuestions.length}
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.25rem 0.625rem',
                              borderRadius: '12px',
                              background: isCorrect ? '#e8f5ed' : isAttempted ? '#fef2f2' : '#f3f4f6',
                              color: isCorrect ? '#1B7A3D' : isAttempted ? '#dc2626' : '#6b7280',
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
                        <p style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                          {q.question_text}
                        </p>

                        {/* Options */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                          {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                            const key = `option_${opt.toLowerCase()}` as keyof Question;
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
                              badgeText = '✓ Student Selected & Correct';
                              badgeBg = '#2d9e55';
                              badgeColor = 'white';
                            } else if (isStudentChoice && !isCorrectOption) {
                              bg = '#fef2f2';
                              borderColor = '#ef4444';
                              badgeText = '✕ Student Selected (Wrong)';
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
                                  <span>{optText}</span>
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
          </div>
        </div>
      )}
    </div>
  );
}
