// app/admin/teachers/page.tsx
// Admin teachers CRUD page — table + modal form to add/edit/delete teachers
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/admin/Modal';
import { useToast } from '@/components/ui/Toast';
import { SkeletonTable } from '@/components/ui/LoadingSpinner';

interface Teacher {
  id: string;
  name: string;
  subject: string | null;
  created_at: string;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ name: '', subject: '' });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    fetchTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTeachers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('Failed to load teachers', 'error');
    } else {
      setTeachers(data || []);
    }
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: '', subject: '' });
    setModalOpen(true);
  }

  function openEdit(teacher: Teacher) {
    setEditing(teacher);
    setForm({ name: teacher.name, subject: teacher.subject || '' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast('Teacher name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('teachers')
          .update({ name: form.name.trim(), subject: form.subject.trim() || null })
          .eq('id', editing.id);

        if (error) throw error;
        showToast('Teacher updated successfully');
      } else {
        const { error } = await supabase
          .from('teachers')
          .insert({ name: form.name.trim(), subject: form.subject.trim() || null });

        if (error) throw error;
        showToast('Teacher added successfully');
      }

      setModalOpen(false);
      fetchTeachers();
    } catch {
      showToast('Failed to save teacher', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(teacher: Teacher) {
    if (!confirm(`Are you sure you want to delete "${teacher.name}"? This will also delete all associated courses and questions.`)) {
      return;
    }

    const { error } = await supabase.from('teachers').delete().eq('id', teacher.id);
    if (error) {
      showToast('Failed to delete teacher', 'error');
    } else {
      showToast('Teacher deleted successfully');
      fetchTeachers();
    }
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Teachers</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Teacher
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={5} />
      ) : teachers.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👨‍🏫</p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            No teachers added yet. Add your first teacher to get started.
          </p>
          <button className="btn btn-primary" onClick={openAdd}>
            Add Teacher
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Subject</th>
                <th>Added</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher, i) => (
                <tr key={teacher.id} className="animate-fade-in">
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{teacher.name}</td>
                  <td>{teacher.subject || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {new Date(teacher.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(teacher)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(teacher)}
                      >
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
        title={editing ? 'Edit Teacher' : 'Add Teacher'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Teacher'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="teacher-name" className="label">Name *</label>
            <input
              id="teacher-name"
              className="input"
              placeholder="Enter teacher name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="teacher-subject" className="label">Subject</label>
            <input
              id="teacher-subject"
              className="input"
              placeholder="e.g., Mathematics, English"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
