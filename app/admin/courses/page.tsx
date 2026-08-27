// app/admin/courses/page.tsx
// Admin courses CRUD page — table + modal form to add/edit/delete courses
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/admin/Modal';
import { useToast } from '@/components/ui/Toast';
import { SkeletonTable } from '@/components/ui/LoadingSpinner';

interface Teacher {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
  teacher_id: string;
  class_time: string | null;
  duration_seconds: number;
  created_at: string;
  teachers: { name: string } | null;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState({
    name: '',
    teacher_id: '',
    class_time: '',
    duration_seconds: 500,
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    setLoading(true);
    const [coursesRes, teachersRes] = await Promise.all([
      supabase
        .from('courses')
        .select('*, teachers(name)')
        .order('created_at', { ascending: false }),
      supabase.from('teachers').select('id, name').order('name'),
    ]);

    if (coursesRes.error) {
      showToast('Failed to load courses', 'error');
    } else {
      setCourses(coursesRes.data || []);
    }
    setTeachers(teachersRes.data || []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: '', teacher_id: '', class_time: '', duration_seconds: 500 });
    setModalOpen(true);
  }

  function openEdit(course: Course) {
    setEditing(course);
    setForm({
      name: course.name,
      teacher_id: course.teacher_id,
      class_time: course.class_time || '',
      duration_seconds: course.duration_seconds,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast('Course name is required', 'error');
      return;
    }
    if (!form.teacher_id) {
      showToast('Please select a teacher', 'error');
      return;
    }
    if (form.duration_seconds < 30) {
      showToast('Duration must be at least 30 seconds', 'error');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        teacher_id: form.teacher_id,
        class_time: form.class_time.trim() || null,
        duration_seconds: form.duration_seconds,
      };

      if (editing) {
        const { error } = await supabase.from('courses').update(data).eq('id', editing.id);
        if (error) throw error;
        showToast('Course updated successfully');
      } else {
        const { error } = await supabase.from('courses').insert(data);
        if (error) throw error;
        showToast('Course added successfully');
      }

      setModalOpen(false);
      fetchData();
    } catch {
      showToast('Failed to save course', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(course: Course) {
    if (!confirm(`Are you sure you want to delete "${course.name}"? This will also delete all associated questions.`)) {
      return;
    }

    const { error } = await supabase.from('courses').delete().eq('id', course.id);
    if (error) {
      showToast('Failed to delete course', 'error');
    } else {
      showToast('Course deleted successfully');
      fetchData();
    }
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Courses</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Course
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={5} />
      ) : courses.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📚</p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            No courses added yet.{' '}
            {teachers.length === 0 ? 'Add teachers first, then create courses.' : 'Create your first course.'}
          </p>
          <button className="btn btn-primary" onClick={openAdd} disabled={teachers.length === 0}>
            Add Course
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Course Name</th>
                <th>Teacher</th>
                <th>Class Time</th>
                <th>Exam Duration</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course, i) => (
                <tr key={course.id} className="animate-fade-in">
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{course.name}</td>
                  <td>
                    <span className="badge badge-purple">
                      {course.teachers?.name || '—'}
                    </span>
                  </td>
                  <td>{course.class_time || '—'}</td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{formatDuration(course.duration_seconds)}</span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginLeft: '0.5rem',
                      }}
                    >
                      ({course.duration_seconds}s)
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(course)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(course)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Course' : 'Add Course'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Course'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="course-name" className="label">Course Name *</label>
            <input
              id="course-name"
              className="input"
              placeholder="e.g., Mathematics Grade 10"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="course-teacher" className="label">Teacher *</label>
            <select
              id="course-teacher"
              className="select"
              value={form.teacher_id}
              onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
            >
              <option value="">Select a teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="course-time" className="label">Class Time</label>
            <input
              id="course-time"
              className="input"
              placeholder="e.g., Mon/Wed 9:00 AM"
              value={form.class_time}
              onChange={(e) => setForm({ ...form, class_time: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="course-duration" className="label">Exam Duration (seconds) *</label>
            <input
              id="course-duration"
              type="number"
              className="input"
              min={30}
              value={form.duration_seconds}
              onChange={(e) => setForm({ ...form, duration_seconds: parseInt(e.target.value) || 0 })}
            />
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginTop: '0.375rem',
              }}
            >
              ≈ {Math.floor(form.duration_seconds / 60)} minutes{' '}
              {form.duration_seconds % 60 > 0 ? `${form.duration_seconds % 60} seconds` : ''}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
