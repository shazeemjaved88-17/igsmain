// app/admin/questions/page.tsx
// Admin questions CRUD page — course selector + MCQ management + CSV bulk import
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

interface Question {
  id: string;
  course_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  created_at: string;
}

const emptyForm = {
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
};

export default function QuestionsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchQuestions(selectedCourseId);
    } else {
      setQuestions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  async function fetchCourses() {
    const { data } = await supabase.from('courses').select('id, name').order('name');
    setCourses(data || []);
    setLoading(false);
  }

  async function fetchQuestions(courseId: string) {
    setQuestionsLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });

    if (error) {
      showToast('Failed to load questions', 'error');
    } else {
      setQuestions(data || []);
    }
    setQuestionsLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setForm({
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.question_text.trim() || !form.option_a.trim() || !form.option_b.trim() || !form.option_c.trim() || !form.option_d.trim()) {
      showToast('All fields are required', 'error');
      return;
    }

    setSaving(true);
    try {
      const data = {
        course_id: selectedCourseId,
        question_text: form.question_text.trim(),
        option_a: form.option_a.trim(),
        option_b: form.option_b.trim(),
        option_c: form.option_c.trim(),
        option_d: form.option_d.trim(),
        correct_option: form.correct_option,
      };

      if (editing) {
        const { error } = await supabase.from('questions').update(data).eq('id', editing.id);
        if (error) throw error;
        showToast('Question updated successfully');
      } else {
        const { error } = await supabase.from('questions').insert(data);
        if (error) throw error;
        showToast('Question added successfully');
      }

      setModalOpen(false);
      fetchQuestions(selectedCourseId);
    } catch {
      showToast('Failed to save question', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(q: Question) {
    if (!confirm('Are you sure you want to delete this question?')) return;

    const { error } = await supabase.from('questions').delete().eq('id', q.id);
    if (error) {
      showToast('Failed to delete question', 'error');
    } else {
      showToast('Question deleted');
      fetchQuestions(selectedCourseId);
    }
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedCourseId) {
      showToast('Please select a course first', 'error');
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim());

      // Skip header if it looks like column names
      let startIdx = 0;
      if (lines[0]?.toLowerCase().includes('question_text')) {
        startIdx = 1;
      }

      const rows = [];
      for (let i = startIdx; i < lines.length; i++) {
        // Parse CSV with potential commas in values (simple approach)
        const parts = parseCSVLine(lines[i]);
        if (parts.length < 6) continue;

        const correctOption = parts[5].trim().toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
          showToast(`Row ${i + 1}: Invalid correct option "${parts[5]}"`, 'warning');
          continue;
        }

        rows.push({
          course_id: selectedCourseId,
          question_text: parts[0].trim(),
          option_a: parts[1].trim(),
          option_b: parts[2].trim(),
          option_c: parts[3].trim(),
          option_d: parts[4].trim(),
          correct_option: correctOption,
        });
      }

      if (rows.length === 0) {
        showToast('No valid questions found in CSV', 'error');
        return;
      }

      const { error } = await supabase.from('questions').insert(rows);
      if (error) throw error;

      showToast(`Successfully imported ${rows.length} questions`);
      fetchQuestions(selectedCourseId);
    } catch {
      showToast('Failed to import CSV', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Questions</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleCSVImport}
          />
          <button
            className="btn btn-outline btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedCourseId || importing}
          >
            {importing ? 'Importing...' : '📄 Bulk Import CSV'}
          </button>
          <button
            className="btn btn-primary"
            onClick={openAdd}
            disabled={!selectedCourseId}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Question
          </button>
        </div>
      </div>

      {/* Course Selector */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <label htmlFor="course-select" className="label">Select Course</label>
        <select
          id="course-select"
          className="select"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          style={{ maxWidth: '400px' }}
        >
          <option value="">Choose a course...</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {!selectedCourseId ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❓</p>
          <p style={{ color: 'var(--text-secondary)' }}>
            Select a course above to view and manage its questions.
          </p>
        </div>
      ) : loading || questionsLoading ? (
        <SkeletonTable rows={5} />
      ) : questions.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            No questions for this course yet. Add questions manually or import from CSV.
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            CSV format: question_text, option_a, option_b, option_c, option_d, correct_option
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={openAdd}>Add Question</button>
            <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
              Import CSV
            </button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {questions.length} question{questions.length !== 1 ? 's' : ''} in this course
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {questions.map((q, i) => (
              <div key={q.id} className="card animate-fade-in" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                  <p style={{ fontWeight: 500, flex: 1 }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Q{i + 1}.</span>{' '}
                    {q.question_text}
                  </p>
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(q)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(q)}>Delete</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const key = `option_${opt.toLowerCase()}` as keyof Question;
                    const isCorrect = q.correct_option === opt;
                    return (
                      <div
                        key={opt}
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8125rem',
                          background: isCorrect ? 'var(--accent-50)' : 'var(--bg-secondary)',
                          border: isCorrect ? '1px solid var(--accent)' : '1px solid var(--border)',
                          color: isCorrect ? 'var(--accent)' : 'var(--text-primary)',
                          fontWeight: isCorrect ? 600 : 400,
                        }}
                      >
                        <strong>{opt}.</strong> {q[key] as string}
                        {isCorrect && ' ✓'}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Question' : 'Add Question'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Question'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="q-text" className="label">Question Text *</label>
            <textarea
              id="q-text"
              className="input"
              rows={3}
              placeholder="Enter the question..."
              value={form.question_text}
              onChange={(e) => setForm({ ...form, question_text: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </div>
          {(['A', 'B', 'C', 'D'] as const).map((opt) => {
            const key = `option_${opt.toLowerCase()}` as keyof typeof form;
            return (
              <div key={opt}>
                <label htmlFor={`opt-${opt}`} className="label">Option {opt} *</label>
                <input
                  id={`opt-${opt}`}
                  className="input"
                  placeholder={`Option ${opt}`}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            );
          })}
          <div>
            <label htmlFor="correct-opt" className="label">Correct Answer *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['A', 'B', 'C', 'D'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm({ ...form, correct_option: opt })}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: form.correct_option === opt ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: form.correct_option === opt ? 'var(--accent-50)' : 'white',
                    color: form.correct_option === opt ? 'var(--accent)' : 'var(--text-primary)',
                    fontWeight: form.correct_option === opt ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
