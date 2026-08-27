// app/exam/start/page.tsx
// Student exam entry form — strict Roll Number verification against Admin registered students
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Teacher {
  id: string;
  name: string;
  subject: string | null;
}

interface Course {
  id: string;
  name: string;
  teacher_id: string;
  duration_seconds: number;
}

export default function ExamStartPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [form, setForm] = useState({
    name: '',
    roll_number: '',
    teacher_id: '',
    course_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (form.teacher_id) {
      const filtered = courses.filter((c) => c.teacher_id === form.teacher_id);
      setFilteredCourses(filtered);
      // Reset course selection when teacher changes
      if (!filtered.find((c) => c.id === form.course_id)) {
        setForm((prev) => ({ ...prev, course_id: '' }));
      }
    } else {
      setFilteredCourses([]);
      setForm((prev) => ({ ...prev, course_id: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.teacher_id, courses]);

  async function fetchData() {
    const [teachersRes, coursesRes] = await Promise.all([
      supabase.from('teachers').select('*').order('name'),
      supabase.from('courses').select('*').order('name'),
    ]);

    setTeachers(teachersRes.data || []);
    setCourses(coursesRes.data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const inputName = form.name.trim();
    const inputRoll = form.roll_number.trim();

    if (!inputName || !inputRoll || !form.teacher_id || !form.course_id) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      // ======================================================
      // STRICT VERIFICATION: Verify Roll Number issued by Admin
      // ======================================================
      const { data: registeredStudent, error: findError } = await supabase
        .from('students')
        .select('*')
        .ilike('roll_number', inputRoll)
        .maybeSingle();

      if (findError) {
        console.error('Student lookup error:', findError);
      }

      if (!registeredStudent) {
        setError(
          `Invalid Roll Number ("${inputRoll}"). Only pre-registered students issued by the school administration can take exams. Please contact your administrator.`
        );
        setSubmitting(false);
        return;
      }

      // Check course match if student was assigned a specific course by admin
      if (registeredStudent.course_id && registeredStudent.course_id !== form.course_id) {
        const assignedCourse = courses.find((c) => c.id === registeredStudent.course_id);
        setError(
          `This Roll Number is registered for course "${assignedCourse?.name || 'another course'}". Please select the correct course.`
        );
        setSubmitting(false);
        return;
      }

      // ======================================================
      // DUPLICATE ATTEMPT CHECK
      // ======================================================
      const { data: existingAttempts } = await supabase
        .from('exam_attempts')
        .select('id')
        .eq('course_id', form.course_id)
        .eq('student_id', registeredStudent.id)
        .eq('status', 'completed');

      if (existingAttempts && existingAttempts.length > 0) {
        setError(
          'You have already completed this exam for this course. Each student can only take the exam once.'
        );
        setSubmitting(false);
        return;
      }

      // Update student course assignment and name if needed
      await supabase
        .from('students')
        .update({
          course_id: form.course_id,
          name: inputName,
        })
        .eq('id', registeredStudent.id);

      // Get course duration
      const selectedCourse = courses.find((c) => c.id === form.course_id);
      const durationSeconds = selectedCourse?.duration_seconds || 500;

      // Store exam session data
      sessionStorage.setItem(
        'examSession',
        JSON.stringify({
          studentId: registeredStudent.id,
          studentName: inputName,
          rollNumber: registeredStudent.roll_number,
          courseId: form.course_id,
          durationSeconds,
          startTime: new Date().toISOString(),
        })
      );

      router.push(`/exam/${form.course_id}`);
    } catch (err) {
      console.error('Exam start error:', err);
      setError('Failed to start exam. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

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

      {/* Form */}
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
          className="card animate-fade-in"
          style={{
            width: '100%',
            maxWidth: '500px',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '1.5rem 2rem',
              background: 'linear-gradient(135deg, #6B2C91, #4A1D63)',
              color: 'white',
            }}
          >
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Start Your Exam
            </h1>
            <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
              Enter your issued Roll Number to begin the examination
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '1.5rem 2rem' }}>
            {error && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-sm)',
                  color: '#dc2626',
                  fontSize: '0.875rem',
                  marginBottom: '1.25rem',
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label htmlFor="student-name" className="label">Full Name *</label>
                <input
                  id="student-name"
                  className="input"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="roll-number" className="label">Issued Roll Number *</label>
                <input
                  id="roll-number"
                  className="input"
                  placeholder="Enter your issued Roll Number (e.g. 1001)"
                  value={form.roll_number}
                  onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
                  required
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Must be registered by school administration in Students Panel.
                </p>
              </div>

              <div>
                <label htmlFor="teacher-select" className="label">Teacher *</label>
                {loading ? (
                  <div className="skeleton" style={{ height: '2.5rem' }} />
                ) : (
                  <select
                    id="teacher-select"
                    className="select"
                    value={form.teacher_id}
                    onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                    required
                  >
                    <option value="">Select your teacher</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.subject ? `(${t.subject})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label htmlFor="course-select" className="label">Course *</label>
                {loading ? (
                  <div className="skeleton" style={{ height: '2.5rem' }} />
                ) : (
                  <select
                    id="course-select"
                    className="select"
                    value={form.course_id}
                    onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                    required
                    disabled={!form.teacher_id}
                  >
                    <option value="">
                      {!form.teacher_id
                        ? 'Select a teacher first'
                        : filteredCourses.length === 0
                        ? 'No courses available'
                        : 'Select your course'}
                    </option>
                    {filteredCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={submitting || loading}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      className="animate-spin"
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        display: 'inline-block',
                      }}
                    />
                    Verifying & Starting...
                  </span>
                ) : (
                  'Begin Exam →'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
