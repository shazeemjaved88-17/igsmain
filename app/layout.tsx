// app/layout.tsx
// Root layout with Inter font, metadata, and global styles
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iqra Grammar School & Academy - Exam Portal",
  description:
    "Online MCQ Exam Portal for Iqra Grammar School and Academy. Take exams, view results, and manage courses.",
  keywords: ["exam", "mcq", "iqra grammar school", "online test", "academy"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
