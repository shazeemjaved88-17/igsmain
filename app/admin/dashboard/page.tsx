// app/admin/dashboard/page.tsx
// Admin dashboard — overview cards with stats
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SkeletonCards } from '@/components/ui/LoadingSpinner';

interface Stats {
  totalTeachers: number;
  totalCourses: number;
  totalQuestions: number;
  todayAttempts: number;
  averageScore: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchStats() {
    try {
      const [teachersRes, coursesRes, questionsRes, attemptsRes] = await Promise.all([
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('exam_attempts').select('*').eq('status', 'completed'),
      ]);

      // Filter today's attempts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const allAttempts = attemptsRes.data || [];
      const todayAttempts = allAttempts.filter(
        (a) => new Date(a.created_at) >= new Date(todayStr)
      );

      // Calculate average score
      const completedAttempts = allAttempts.filter((a) => a.score !== null && a.total_questions);
      const averageScore =
        completedAttempts.length > 0
          ? completedAttempts.reduce((sum, a) => sum + (a.score / (a.total_questions * 2)) * 100, 0) /
            completedAttempts.length
          : 0;

      setStats({
        totalTeachers: teachersRes.count || 0,
        totalCourses: coursesRes.count || 0,
        totalQuestions: questionsRes.count || 0,
        todayAttempts: todayAttempts.length,
        averageScore: Math.round(averageScore),
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Dashboard</h1>
        <SkeletonCards count={5} />
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Teachers',
      value: stats?.totalTeachers || 0,
      icon: '👨‍🏫',
      color: '#6B2C91',
      bg: '#f3e8f9',
    },
    {
      label: 'Total Courses',
      value: stats?.totalCourses || 0,
      icon: '📚',
      color: '#1B7A3D',
      bg: '#e8f5ed',
    },
    {
      label: 'Total Questions',
      value: stats?.totalQuestions || 0,
      icon: '❓',
      color: '#d97706',
      bg: '#fffbeb',
    },
    {
      label: "Today's Attempts",
      value: stats?.todayAttempts || 0,
      icon: '📝',
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      label: 'Average Score',
      value: `${stats?.averageScore || 0}%`,
      icon: '📊',
      color: '#dc2626',
      bg: '#fef2f2',
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Dashboard</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        {cards.map((card) => (
          <div key={card.label} className="stat-card animate-fade-in">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {card.label}
              </span>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: card.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.125rem',
                }}
              >
                {card.icon}
              </div>
            </div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: card.color,
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Info */}
      <div
        className="card"
        style={{ marginTop: '2rem', padding: '1.5rem' }}
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: '1rem',
            color: 'var(--text-primary)',
          }}
        >
          Quick Guide
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <p>1. <strong>Add Teachers</strong> — Go to Teachers page and add your teaching staff.</p>
          <p>2. <strong>Create Courses</strong> — Create courses and assign them to teachers with exam duration.</p>
          <p>3. <strong>Add Questions</strong> — Add MCQ questions for each course or bulk import from CSV.</p>
          <p>4. <strong>Share Exam Link</strong> — Students can visit the homepage and start their exam.</p>
          <p>5. <strong>View Results</strong> — Monitor all exam attempts and export results to CSV.</p>
        </div>
      </div>
    </div>
  );
}
