// app/admin/settings/page.tsx
// Admin settings page — configure passing percentage, school info, and Vercel env check
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const [passingPercentage, setPassingPercentage] = useState('50');
  const [schoolName, setSchoolName] = useState('Iqra Grammar School & Academy');
  const [marksPerQuestion, setMarksPerQuestion] = useState('2');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) {
        console.warn('Fetch settings warning:', error);
      } else if (data) {
        data.forEach((s) => {
          if (s.key === 'passing_percentage') setPassingPercentage(s.value);
          if (s.key === 'school_name') setSchoolName(s.value);
          if (s.key === 'marks_per_question') setMarksPerQuestion(s.value);
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const updates = [
        { key: 'passing_percentage', value: passingPercentage.trim() },
        { key: 'school_name', value: schoolName.trim() },
        { key: 'marks_per_question', value: marksPerQuestion.trim() },
      ];

      for (const item of updates) {
        const { data: existing } = await supabase
          .from('settings')
          .select('id')
          .eq('key', item.key)
          .maybeSingle();

        if (existing) {
          await supabase.from('settings').update({ value: item.value }).eq('key', item.key);
        } else {
          await supabase.from('settings').insert(item);
        }
      }

      showToast('Settings saved successfully!');
    } catch (err) {
      console.error('Save settings error:', err);
      showToast('Failed to save settings. Please check your Supabase connection.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured';
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Portal Settings
      </h1>

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div
            className="animate-spin"
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid var(--border)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ color: 'var(--text-secondary)' }}>Loading portal settings...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Settings Form */}
          <form onSubmit={handleSave} className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
              Examination & Grading Configurations
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label htmlFor="passing-percentage" className="label">
                  Passing Percentage Threshold (%) *
                </label>
                <input
                  id="passing-percentage"
                  type="number"
                  min="1"
                  max="100"
                  className="input"
                  value={passingPercentage}
                  onChange={(e) => setPassingPercentage(e.target.value)}
                  required
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Students scoring at or above this percentage will be marked PASS.
                </p>
              </div>

              <div>
                <label htmlFor="school-name" className="label">
                  School / Academy Title *
                </label>
                <input
                  id="school-name"
                  type="text"
                  className="input"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="marks-per-question" className="label">
                  Default Marks Per MCQ *
                </label>
                <select
                  id="marks-per-question"
                  className="select"
                  value={marksPerQuestion}
                  onChange={(e) => setMarksPerQuestion(e.target.value)}
                >
                  <option value="1">1 Mark per Question</option>
                  <option value="2">2 Marks per Question</option>
                  <option value="3">3 Marks per Question</option>
                  <option value="5">5 Marks per Question</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Each MCQ currently scores 2 marks per question.
                </p>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
              >
                {saving ? 'Saving Settings...' : 'Save Settings'}
              </button>
            </div>
          </form>

          {/* Vercel Environment Variables Helper Guide */}
          <div className="card" style={{ padding: '1.5rem', background: '#faf5ff', border: '1px solid #e9d5ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🚀</span>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>
                Vercel Deployment & Environment Variables Guide
              </h2>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              If your settings or database queries do not update when deployed on Vercel, verify that the following 3 Environment Variables are added in your <strong>Vercel Dashboard → Project Settings → Environment Variables</strong>:
            </p>

            <div className="table-container" style={{ marginBottom: '1rem' }}>
              <table className="table" style={{ fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th>Variable Name</th>
                    <th>Where to find in Supabase</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>NEXT_PUBLIC_SUPABASE_URL</td>
                    <td>Supabase Dashboard → Settings → API → Project URL</td>
                    <td>
                      <span className={`badge ${supabaseUrl !== 'Not configured' ? 'badge-pass' : 'badge-fail'}`}>
                        {supabaseUrl !== 'Not configured' ? 'Configured' : 'Missing'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</td>
                    <td>Supabase Dashboard → Settings → API → Project API Keys → anon public</td>
                    <td>
                      <span className={`badge ${hasAnonKey ? 'badge-pass' : 'badge-fail'}`}>
                        {hasAnonKey ? 'Configured' : 'Missing'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>SUPABASE_SERVICE_ROLE_KEY</td>
                    <td>Supabase Dashboard → Settings → API → Project API Keys → service_role secret</td>
                    <td>
                      <span className="badge badge-pass">Required for API Route Scoring</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <p><strong>Note:</strong> After adding or updating variables in Vercel, click <strong>Deployments → Redeploy</strong> to apply the changes!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
