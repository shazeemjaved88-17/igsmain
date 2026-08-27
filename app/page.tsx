// app/page.tsx
// Landing page — Iqra Grammar School & Academy branding with "Start Your Exam" CTA
'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #f3e8f9 0%, #ffffff 40%, #e8f5ed 100%)',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Purple Logo Placeholder */}
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6B2C91, #8B4CAF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
              fontSize: '1.25rem',
            }}
          >
            IA
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--primary)',
                lineHeight: 1.2,
              }}
            >
              Iqra Grammar School
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              & Academy
            </p>
          </div>
        </div>
        <Link
          href="/admin/login"
          className="btn btn-ghost btn-sm"
          style={{ textDecoration: 'none', fontSize: '0.8125rem' }}
        >
          Admin Portal
        </Link>
      </header>

      {/* Hero Section */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
        }}
      >
        <div
          className="animate-fade-in"
          style={{
            textAlign: 'center',
            maxWidth: '600px',
          }}
        >
          {/* Logo Badges */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            {/* Iqra Academy - Purple */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '1rem',
                background: 'linear-gradient(135deg, #6B2C91, #8B4CAF)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 8px 25px rgba(107, 44, 145, 0.3)',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: '1.75rem', lineHeight: 1 }}>IA</span>
              <span style={{ fontSize: '0.5rem', fontWeight: 500, opacity: 0.9 }}>ACADEMY</span>
            </div>

            {/* Divider */}
            <div
              style={{
                width: '2px',
                height: '50px',
                background: 'linear-gradient(to bottom, transparent, var(--border), transparent)',
              }}
            />

            {/* Iqra Group of Schools - Green */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '1rem',
                background: 'linear-gradient(135deg, #1B7A3D, #2d9e55)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 8px 25px rgba(27, 122, 61, 0.3)',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: '1.75rem', lineHeight: 1 }}>IG</span>
              <span style={{ fontSize: '0.5rem', fontWeight: 500, opacity: 0.9 }}>SCHOOLS</span>
            </div>
          </div>

          <h2
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              marginBottom: '0.75rem',
            }}
          >
            Online Exam Portal
          </h2>
          <p
            style={{
              fontSize: '1.0625rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '2.5rem',
              maxWidth: '480px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Welcome to the Iqra Grammar School & Academy online examination system.
            Take your MCQ exams securely and get instant results.
          </p>

          <Link
            href="/exam/start"
            className="btn btn-primary btn-lg animate-pulse-glow"
            style={{
              textDecoration: 'none',
              fontSize: '1.0625rem',
              padding: '1rem 2.5rem',
              borderRadius: '0.75rem',
              fontWeight: 600,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Start Your Exam
          </Link>

          {/* Info Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
              marginTop: '3rem',
            }}
          >
            {[
              { icon: '📝', title: 'MCQ Based', desc: 'Multiple choice questions' },
              { icon: '⏱️', title: 'Timed Exams', desc: 'Auto-submit on time up' },
              { icon: '📊', title: 'Instant Results', desc: 'See your score immediately' },
            ].map((item) => (
              <div
                key={item.title}
                className="card"
                style={{
                  padding: '1.25rem 0.75rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                <h3
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '0.25rem',
                  }}
                >
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '1.5rem',
          color: 'var(--text-muted)',
          fontSize: '0.8125rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        © {new Date().getFullYear()} Iqra Grammar School & Academy. All rights reserved.
      </footer>
    </div>
  );
}
