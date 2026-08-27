// app/admin/questions/page.tsx
// Admin questions CRUD page — MCQ management + Bulk Import from CSV and PDF + Answer Key PDF upload
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

interface ParsedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
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
  
  // Single question modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [formCourseId, setFormCourseId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Bulk import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importCourseId, setImportCourseId] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parsingAnswers, setParsingAnswers] = useState(false);
  const [importing, setImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const answerKeyInputRef = useRef<HTMLInputElement>(null);

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
    const courseList = data || [];
    setCourses(courseList);
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
    setFormCourseId(selectedCourseId || (courses[0]?.id || ''));
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
    setFormCourseId(q.course_id);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formCourseId) {
      showToast('Please select a course for this question', 'error');
      return;
    }
    if (!form.question_text.trim() || !form.option_a.trim() || !form.option_b.trim() || !form.option_c.trim() || !form.option_d.trim()) {
      showToast('All question text and options fields are required', 'error');
      return;
    }

    setSaving(true);
    try {
      const data = {
        course_id: formCourseId,
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
      setSelectedCourseId(formCourseId);
      fetchQuestions(formCourseId);
    } catch (err) {
      console.error('Save error:', err);
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
      if (selectedCourseId) {
        fetchQuestions(selectedCourseId);
      }
    }
  }

  // Open Bulk Import Modal
  function openImportModal() {
    setImportCourseId(selectedCourseId || (courses[0]?.id || ''));
    setParsedQuestions([]);
    setImportModalOpen(true);
  }

  // Handle Questions File Selection (CSV, PDF, TXT)
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'csv') {
        const text = await file.text();
        const parsed = parseCSVText(text);
        setParsedQuestions(parsed);
        showToast(`Parsed ${parsed.length} questions from CSV`);
      } else if (extension === 'pdf') {
        const text = await extractTextFromPDF(file);
        const parsed = parseTextToQuestions(text);
        setParsedQuestions(parsed);
        showToast(`Parsed ${parsed.length} questions from PDF`);
      } else if (extension === 'txt') {
        const text = await file.text();
        const parsed = parseTextToQuestions(text);
        setParsedQuestions(parsed);
        showToast(`Parsed ${parsed.length} questions from TXT`);
      } else {
        showToast('Unsupported file format. Please upload CSV, PDF, or TXT.', 'error');
      }
    } catch (err) {
      console.error('Parsing error:', err);
      showToast('Failed to parse file. Please check format.', 'error');
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Handle Answer Key File Selection (PDF, TXT, CSV)
  async function handleAnswerKeySelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingAnswers(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let text = '';

      if (extension === 'pdf') {
        text = await extractTextFromPDF(file);
      } else {
        text = await file.text();
      }

      const answerMap = parseAnswerKeyText(text);
      const answerCount = Object.keys(answerMap).length;

      if (answerCount === 0) {
        showToast('No answer key patterns found in file', 'warning');
      } else {
        // Apply answer key to parsed questions
        setParsedQuestions((prev) =>
          prev.map((q, idx) => {
            const qNum = idx + 1;
            const foundAns = answerMap[qNum];
            return foundAns ? { ...q, correct_option: foundAns } : q;
          })
        );
        showToast(`Applied ${answerCount} answers from Answer Key PDF/file!`);
      }
    } catch (err) {
      console.error('Answer key parsing error:', err);
      showToast('Failed to parse answer key file', 'error');
    } finally {
      setParsingAnswers(false);
      if (answerKeyInputRef.current) answerKeyInputRef.current.value = '';
    }
  }

  // PDF Text Extractor using pdfjs-dist
  async function extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  }

  // CSV Parser
  function parseCSVText(text: string): ParsedQuestion[] {
    const lines = text.split('\n').filter((l) => l.trim());
    let startIdx = 0;
    if (lines[0]?.toLowerCase().includes('question_text')) {
      startIdx = 1;
    }

    const result: ParsedQuestion[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      const parts = parseCSVLine(lines[i]);
      if (parts.length < 5) continue;

      const correct = (parts[5] || 'A').trim().toUpperCase();
      result.push({
        question_text: parts[0].trim(),
        option_a: parts[1].trim(),
        option_b: (parts[2] || '').trim(),
        option_c: (parts[3] || '').trim(),
        option_d: (parts[4] || '').trim(),
        correct_option: ['A', 'B', 'C', 'D'].includes(correct) ? correct : 'A',
      });
    }
    return result;
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

  // Text/PDF MCQ Parser Regex
  function parseTextToQuestions(text: string): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];
    const blocks = text.split(/(?=(?:\d+[\.\)]|Q\d+[\.\)]|Question\s*\d+[\.\)]))/i);

    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;

      const qMatch = trimmed.match(/^(?:\d+[\.\)]|Q\d+[\.\)]|Question\s*\d+[\.\)]|\s*)*([\s\S]+?)(?=\s*[A][\.\)]|\s*Ans|\s*Answer)/i);
      if (!qMatch) continue;

      const qText = qMatch[1].trim();

      const optAMatch = trimmed.match(/A[\.\)]\s*([\s\S]+?)(?=\s*B[\.\)]|\s*Ans|\s*Answer|$)/i);
      const optBMatch = trimmed.match(/B[\.\)]\s*([\s\S]+?)(?=\s*C[\.\)]|\s*Ans|\s*Answer|$)/i);
      const optCMatch = trimmed.match(/C[\.\)]\s*([\s\S]+?)(?=\s*D[\.\)]|\s*Ans|\s*Answer|$)/i);
      const optDMatch = trimmed.match(/D[\.\)]\s*([\s\S]+?)(?=\s*Ans|\s*Answer|$)/i);

      const ansMatch = trimmed.match(/(?:Ans|Answer|Correct)[:\s]*([A-D])/i);
      const correctOption = ansMatch ? ansMatch[1].toUpperCase() : 'A';

      if (qText && optAMatch && optBMatch) {
        questions.push({
          question_text: qText,
          option_a: optAMatch[1].trim(),
          option_b: optBMatch[1].trim(),
          option_c: optCMatch ? optCMatch[1].trim() : 'None',
          option_d: optDMatch ? optDMatch[1].trim() : 'None',
          correct_option: correctOption,
        });
      }
    }

    return questions;
  }

  // Parse Answer Key Text (e.g., "1. A", "2: B", "Q3 - C")
  function parseAnswerKeyText(text: string): Record<number, string> {
    const answers: Record<number, string> = {};
    const matches = text.matchAll(/(?:Q|Question\s*)?(\d+)[\.\:\-\)\s]+([A-D])/gi);
    for (const match of matches) {
      const qNum = parseInt(match[1], 10);
      const ans = match[2].toUpperCase();
      answers[qNum] = ans;
    }
    return answers;
  }

  // Set all parsed questions to a specific answer
  function setAllAnswers(option: string) {
    setParsedQuestions((prev) =>
      prev.map((q) => ({ ...q, correct_option: option }))
    );
  }

  // Confirm Bulk Import to Database
  async function confirmBulkImport() {
    if (!importCourseId) {
      showToast('Please select a course to import questions into', 'error');
      return;
    }
    if (parsedQuestions.length === 0) {
      showToast('No parsed questions to import', 'error');
      return;
    }

    setImporting(true);
    try {
      const rows = parsedQuestions.map((q) => ({
        course_id: importCourseId,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
      }));

      const { error } = await supabase.from('questions').insert(rows);
      if (error) throw error;

      showToast(`Successfully imported ${rows.length} questions!`);
      setImportModalOpen(false);
      
      setSelectedCourseId(importCourseId);
      fetchQuestions(importCourseId);
    } catch {
      showToast('Failed to import questions to database', 'error');
    } finally {
      setImporting(false);
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Questions</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline"
            onClick={openImportModal}
          >
            📄 Bulk Import (CSV / PDF)
          </button>
          <button
            className="btn btn-primary"
            onClick={openAdd}
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
        <label htmlFor="course-select" className="label">Select Course to View Questions</label>
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
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Select a course above to view its questions, or click Add Question / Bulk Import below.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={openAdd}>
              ➕ Add Question Manually
            </button>
            <button className="btn btn-outline" onClick={openImportModal}>
              📄 Bulk Import (CSV / PDF)
            </button>
          </div>
        </div>
      ) : loading || questionsLoading ? (
        <SkeletonTable rows={5} />
      ) : questions.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            No questions for this course yet. Add questions manually or import from CSV/PDF.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={openAdd}>
              ➕ Add Question Manually
            </button>
            <button className="btn btn-outline" onClick={openImportModal}>
              📄 Bulk Import (CSV / PDF)
            </button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Showing {questions.length} question{questions.length !== 1 ? 's' : ''} in this course
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

      {/* Add/Edit Question Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Question' : 'Add Question Manually'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Question' : 'Save Question'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="modal-course-select" className="label">Course *</label>
            <select
              id="modal-course-select"
              className="select"
              value={formCourseId}
              onChange={(e) => setFormCourseId(e.target.value)}
              required
            >
              <option value="">-- Select Course --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

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

      {/* BULK IMPORT MODAL (CSV & PDF & ANSWER KEY) */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="📄 Bulk Import Questions (CSV / PDF / TXT)"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setImportModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={confirmBulkImport}
              disabled={importing || parsedQuestions.length === 0 || !importCourseId}
            >
              {importing ? 'Importing...' : `Import ${parsedQuestions.length} Questions`}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Step 1: Select Target Course */}
          <div>
            <label htmlFor="import-course-select" className="label">
              1. Which course should these questions be added to? *
            </label>
            <select
              id="import-course-select"
              className="select"
              value={importCourseId}
              onChange={(e) => setImportCourseId(e.target.value)}
              required
            >
              <option value="">-- Select Course --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Upload Questions File */}
          <div>
            <label htmlFor="import-file" className="label">
              2. Upload Questions File (.csv, .pdf, .txt) *
            </label>
            <input
              ref={fileInputRef}
              id="import-file"
              type="file"
              accept=".csv,.pdf,.txt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
              style={{ width: '100%', padding: '0.875rem' }}
            >
              {parsing ? 'Parsing Questions File...' : '📁 Choose Questions File (PDF / CSV / TXT)'}
            </button>
          </div>

          {/* Step 3: Optional Answer Key Upload & Quick Answer Assign */}
          {parsedQuestions.length > 0 && (
            <div style={{ padding: '0.875rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
              <label className="label" style={{ marginBottom: '0.5rem' }}>
                3. Answer Key Options (Optional)
              </label>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <input
                  ref={answerKeyInputRef}
                  type="file"
                  accept=".pdf,.txt,.csv"
                  onChange={handleAnswerKeySelect}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => answerKeyInputRef.current?.click()}
                  disabled={parsingAnswers}
                >
                  {parsingAnswers ? 'Parsing Answer Key...' : '📎 Upload Separate Answer Key PDF / TXT'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Set all answers to:</span>
                {['A', 'B', 'C', 'D'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '0.125rem 0.5rem', fontSize: '0.75rem', border: '1px solid var(--border)' }}
                    onClick={() => setAllAnswers(opt)}
                  >
                    Set All {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Parsed Questions Preview */}
          {parsedQuestions.length > 0 && (
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '0.5rem' }}>
                ✓ Parsed {parsedQuestions.length} Questions (Preview & Edit Answers):
              </p>
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  background: 'var(--bg-secondary)',
                }}
              >
                {parsedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'white',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                      {idx + 1}. {q.question_text}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', fontSize: '0.75rem' }}>
                      <div>A. {q.option_a}</div>
                      <div>B. {q.option_b}</div>
                      <div>C. {q.option_c}</div>
                      <div>D. {q.option_d}</div>
                    </div>
                    <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Correct Answer:</span>
                      {['A', 'B', 'C', 'D'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            const updated = [...parsedQuestions];
                            updated[idx].correct_option = opt;
                            setParsedQuestions(updated);
                          }}
                          style={{
                            padding: '0.125rem 0.375rem',
                            fontSize: '0.6875rem',
                            borderRadius: '3px',
                            border: q.correct_option === opt ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: q.correct_option === opt ? 'var(--accent-50)' : 'white',
                            color: q.correct_option === opt ? 'var(--accent)' : 'var(--text-primary)',
                            fontWeight: q.correct_option === opt ? 600 : 400,
                            cursor: 'pointer',
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
