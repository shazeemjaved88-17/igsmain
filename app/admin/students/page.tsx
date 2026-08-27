// app/admin/students/page.tsx
// Admin Students Management Panel — manage student roll numbers and course assignments
'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/admin/Modal';
import { useToast } from '@/components/ui/Toast';
import { SkeletonTable } from '@/components/ui/LoadingSpinner';

interface Course {
  id: string;
  name: string;
}

interface StudentRow {
  id: string;
  name: string;
  roll_number: string;
  course_id: string | null;
  created_at: string;
  courses: { name: string; teachers: { name: string } | null } | null;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('');

  // Add/Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [form, setForm] = useState({
    name: '',
    roll_number: '',
    course_id: '',
  });
  const [saving, setSaving] = useState(false);

  // Bulk CSV Import
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    fetchCourses();
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCourses() {
    const { data } = await supabase.from('courses').select('id, name').order('name');
    setCourses(data || []);
  }

  async function fetchStudents() {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*, courses(name, teachers(name))')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('Failed to load students', 'error');
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: '', roll_number: '', course_id: courses[0]?.id || '' });
    setModalOpen(true);
  }

  function openEdit(s: StudentRow) {
    setEditing(s);
    setForm({
      name: s.name,
      roll_number: s.roll_number,
      course_id: s.course_id || '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.roll_number.trim()) {
      showToast('Name and Roll Number are required', 'error');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        roll_number: form.roll_number.trim(),
        course_id: form.course_id || null,
      };

      if (editing) {
        const { error } = await supabase.from('students').update(data).eq('id', editing.id);
        if (error) throw error;
        showToast('Student updated successfully');
      } else {
        const { error } = await supabase.from('students').insert(data);
        if (error) throw error;
        showToast('Student registered successfully');
      }

      setModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      console.error('Save student error:', err);
      showToast(err?.message || 'Failed to save student record', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: StudentRow) {
    if (!confirm(`Are you sure you want to delete student "${s.name}" (Roll: ${s.roll_number})?`)) return;

    const { error } = await supabase.from('students').delete().eq('id', s.id);
    if (error) {
      showToast('Failed to delete student', 'error');
    } else {
      showToast('Student deleted');
      fetchStudents();
    }
  }

  // Bulk CSV Import
  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim());
      
      let startIdx = 0;
      if (lines[0]?.toLowerCase().includes('name') || lines[0]?.toLowerCase().includes('roll')) {
        startIdx = 1;
      }

      const rows = [];
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.replace(/^"|"$/g, '').trim());
        if (parts.length < 2) continue;

        const name = parts[0];
        const roll_number = parts[1];
        const courseName = parts[2] || '';

        // Match course by name if provided
        const matchedCourse = courses.find(
          (c) => c.name.toLowerCase() === courseName.toLowerCase()
        );

        if (name && roll_number) {
          rows.push({
            name,
            roll_number,
            course_id: matchedCourse ? matchedCourse.id : null,
          });
        }
      }

      if (rows.length === 0) {
        showToast('No valid student rows found in CSV', 'error');
        return;
      }

      const { error } = await supabase.from('students').insert(rows);
      if (error) throw error;

      showToast(`Successfully imported ${rows.length} students!`);
      fetchStudents();
    } catch {
      showToast('Failed to import students CSV', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Filter students by search query and course
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = filterCourse ? s.course_id === filterCourse : true;
    return matchesSearch && matchesCourse;
  });

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
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Students & Roll Numbers</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Manage student roll numbers and course assignments
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVImport}
            style={{ display: 'none' }}
          />
          <button
            className="btn btn-outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? 'Importing...' : '📄 Bulk Import Students CSV'}
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Student
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: '1 1 250px' }}>
          <label htmlFor="student-search" className="label">Search Student Name or Roll Number</label>
          <input
            id="student-search"
            className="input"
            placeholder="Search by name or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label htmlFor="student-course-filter" className="label">Filter by Course</label>
          <select
            id="student-course-filter"
            className="select"
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {(searchQuery || filterCourse) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSearchQuery('');
              setFilterCourse('');
            }}
            style={{ marginTop: '1.25rem' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonTable rows={8} />
      ) : filteredStudents.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎓</p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {searchQuery || filterCourse
              ? 'No students match your search filters.'
              : 'No students registered yet. Add students manually or import from CSV.'}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={openAdd}>
              Add Student
            </button>
            <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
              Import CSV
            </button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
          </p>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Roll Number</th>
                  <th>Assigned Course</th>
                  <th>Teacher</th>
                  <th>Date Registered</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, i) => (
                  <tr key={s.id} className="animate-fade-in">
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          color: 'var(--primary)',
                          background: 'var(--primary-50)',
                          padding: '0.25rem 0.625rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {s.roll_number}
                      </span>
                    </td>
                    <td>{s.courses?.name || 'Unassigned'}</td>
                    <td>{s.courses?.teachers?.name || '—'}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Student' : 'Add New Student'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Student' : 'Add Student'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="student-name" className="label">Student Full Name *</label>
            <input
              id="student-name"
              className="input"
              placeholder="e.g., Ali Ahmed"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="student-roll" className="label">Roll Number *</label>
            <input
              id="student-roll"
              className="input"
              placeholder="e.g., 1001 or REG-2024-05"
              value={form.roll_number}
              onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="student-course" className="label">Assign Course</label>
            <select
              id="student-course"
              className="select"
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
            >
              <option value="">-- Optional: Select Course --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
