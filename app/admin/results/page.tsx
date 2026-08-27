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

interface AttemptRow {
  id: string;
  score: number;
  total_questions: number;
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

  function exportCSV() {
    if (attempts.length === 0) {
      showToast('No data to export', 'warning');
      return;
    }

    const headers = ['Student Name', 'Roll Number', 'Course', 'Teacher', 'Score', 'Total', 'Percentage', 'Status', 'Date'];
    const rows = attempts.map((a) => [
      a.students?.name || '',
      a.students?.roll_number || '',
      a.courses?.name || '',
      a.courses?.teachers?.name || '',
      a.score?.toString() || '0',
      a.total_questions?.toString() || '0',
      a.total_questions ? `${Math.round((a.score / a.total_questions) * 100)}%` : '0%',
      a.status,
      new Date(a.created_at).toLocaleString(),
    ]);

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
                </tr>
              </thead>
              <tbody>
                {attempts.map((a, i) => {
                  const pct = a.total_questions ? Math.round((a.score / a.total_questions) * 100) : 0;
                  const passed = pct >= 50;
                  return (
                    <tr key={a.id} className="animate-fade-in">
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{a.students?.name || '—'}</td>
                      <td>{a.students?.roll_number || '—'}</td>
                      <td>{a.courses?.name || '—'}</td>
                      <td>{a.courses?.teachers?.name || '—'}</td>
                      <td style={{ fontWeight: 600 }}>
                        {a.score} / {a.total_questions}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: passed ? 'var(--accent)' : '#dc2626' }}>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
