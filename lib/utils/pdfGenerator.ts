import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PDFExportOptions {
  elementId?: string;
  filename?: string;
  studentName?: string;
  rollNumber?: string;
  courseName?: string;
  teacherName?: string;
  score?: number;
  totalQuestions?: number;
  createdAt?: string;
  questions?: Array<{
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option?: string;
  }>;
  answers?: Record<string, string> | null;
}

export async function generateAttemptedPaperPDF(options: PDFExportOptions): Promise<void> {
  const {
    elementId,
    filename = 'Attempted_Paper.pdf',
    studentName = 'Student',
    rollNumber = 'N/A',
    courseName = 'Exam',
    teacherName = 'N/A',
    score = 0,
    totalQuestions = 0,
    createdAt = new Date().toISOString(),
    questions = [],
    answers = {},
  } = options;

  // Try HTML2Canvas element capture first if elementId is supplied
  if (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      // Store original style properties to restore after capture
      const origOverflow = element.style.overflow;
      const origMaxHeight = element.style.maxHeight;
      const origHeight = element.style.height;

      try {
        element.style.overflow = 'visible';
        element.style.maxHeight = 'none';
        element.style.height = 'auto';

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight,
        });

        // Restore styles
        element.style.overflow = origOverflow;
        element.style.maxHeight = origMaxHeight;
        element.style.height = origHeight;

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Add subsequent pages if content overflows A4 height
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        pdf.save(filename);
        return;
      } catch (err) {
        console.warn('html2canvas capture failed, falling back to direct PDF generation:', err);
        // Restore styles if capture errored
        element.style.overflow = origOverflow;
        element.style.maxHeight = origMaxHeight;
        element.style.height = origHeight;
      }
    }
  }

  // Fallback / Direct Vector jsPDF Generation
  const pdf = new jsPDF('p', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageOverflow = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      addHeaderBanner(true);
    }
  };

  const addHeaderBanner = (isContinued = false) => {
    pdf.setFillColor(107, 44, 145); // #6B2C91
    pdf.rect(margin, y, contentWidth, 40, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('IQRA GRAMMAR SCHOOL & ACADEMY', margin + 12, y + 24);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const subtitle = isContinued ? 'ATTEMPTED PAPER & ANSWER SHEET (Cont.)' : 'ATTEMPTED PAPER & ANSWER SHEET';
    pdf.text(subtitle, pageWidth - margin - 12, y + 24, { align: 'right' });

    y += 50;
  };

  // 1. Banner
  addHeaderBanner();

  // 2. Student & Result Summary Card
  const totalMarks = totalQuestions * 2;
  const pct = totalMarks ? Math.round((score / totalMarks) * 100) : 0;
  const isPass = pct >= 50;

  pdf.setFillColor(248, 249, 250);
  pdf.setDrawColor(220, 224, 230);
  pdf.rect(margin, y, contentWidth, 85, 'FD');

  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`Student: ${studentName}`, margin + 12, y + 22);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.text(`Roll Number: ${rollNumber}`, margin + 12, y + 40);
  pdf.text(`Course: ${courseName}`, margin + 12, y + 56);
  pdf.text(`Teacher: ${teacherName}`, margin + 12, y + 72);

  // Score & Status Box on Right Side
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(107, 44, 145);
  pdf.text(`Score: ${score} / ${totalMarks} (${pct}%)`, pageWidth - margin - 12, y + 25, { align: 'right' });

  pdf.setFontSize(12);
  if (isPass) {
    pdf.setTextColor(27, 122, 61); // Green
    pdf.text('Result: PASS ✓', pageWidth - margin - 12, y + 48, { align: 'right' });
  } else {
    pdf.setTextColor(220, 38, 38); // Red
    pdf.text('Result: FAIL ✕', pageWidth - margin - 12, y + 48, { align: 'right' });
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Date: ${new Date(createdAt).toLocaleString()}`, pageWidth - margin - 12, y + 70, { align: 'right' });

  y += 105;

  // 3. Questions Breakdown
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(30, 41, 59);
  pdf.text(`Attempted Questions Breakdown (${questions.length} Questions)`, margin, y);
  y += 15;

  questions.forEach((q, idx) => {
    const studentSelected = answers ? answers[q.id] : undefined;
    const selectedNorm = studentSelected ? String(studentSelected).trim().toUpperCase() : '';
    const correctNorm = q.correct_option ? String(q.correct_option).trim().toUpperCase() : '';

    const isCorrect = selectedNorm !== '' && selectedNorm === correctNorm;
    const isAttempted = selectedNorm !== '';

    // Calculate height needed for question + options
    const questionLines = pdf.splitTextToSize(`${idx + 1}. ${q.question_text}`, contentWidth - 24);
    const questionBoxHeight = 35 + questionLines.length * 14 + 4 * 22;

    checkPageOverflow(questionBoxHeight);

    // Question Box Header
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(isCorrect ? 45 : isAttempted ? 239 : 156, isCorrect ? 158 : isAttempted ? 68 : 163, isCorrect ? 85 : isAttempted ? 68 : 175);
    pdf.setLineWidth(1.5);

    pdf.rect(margin, y, contentWidth, questionBoxHeight, 'D');

    // Status Indicator Strip on Left
    pdf.setFillColor(isCorrect ? 45 : isAttempted ? 220 : 156, isCorrect ? 158 : isAttempted ? 38 : 163, isCorrect ? 85 : isAttempted ? 38 : 175);
    pdf.rect(margin, y, 4, questionBoxHeight, 'F');

    let boxY = y + 18;

    // Question title & badge
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(107, 44, 145);
    pdf.text(`Question ${idx + 1} of ${questions.length}`, margin + 12, boxY);

    const badgeText = isCorrect ? '✓ Correct (+2 Marks)' : isAttempted ? '✕ Incorrect (0 Marks)' : '⚪ Unanswered (0 Marks)';
    pdf.setFontSize(9);
    pdf.setTextColor(isCorrect ? 27 : isAttempted ? 220 : 100, isCorrect ? 122 : isAttempted ? 38 : 116, isCorrect ? 61 : isAttempted ? 38 : 139);
    pdf.text(badgeText, pageWidth - margin - 12, boxY, { align: 'right' });

    boxY += 16;

    // Question Text
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(30, 41, 59);
    questionLines.forEach((line: string) => {
      pdf.text(line, margin + 12, boxY);
      boxY += 13;
    });

    boxY += 4;

    // Options A, B, C, D
    const optionsList = [
      { key: 'A', text: q.option_a },
      { key: 'B', text: q.option_b },
      { key: 'C', text: q.option_c },
      { key: 'D', text: q.option_d },
    ];

    optionsList.forEach((opt) => {
      const isStudentChoice = selectedNorm === opt.key;
      const isCorrectOption = correctNorm === opt.key;

      if (isStudentChoice && isCorrectOption) {
        pdf.setFillColor(232, 245, 237); // Light green
        pdf.setDrawColor(45, 158, 85);
      } else if (isStudentChoice && !isCorrectOption) {
        pdf.setFillColor(254, 242, 242); // Light red
        pdf.setDrawColor(239, 68, 68);
      } else if (isCorrectOption && (!isStudentChoice || !isAttempted)) {
        pdf.setFillColor(232, 245, 237);
        pdf.setDrawColor(45, 158, 85);
      } else {
        pdf.setFillColor(248, 249, 250);
        pdf.setDrawColor(226, 232, 240);
      }

      pdf.setLineWidth(0.75);
      pdf.rect(margin + 12, boxY, contentWidth - 24, 18, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(107, 44, 145);
      pdf.text(`${opt.key}.`, margin + 18, boxY + 12);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(30, 41, 59);
      const optTextTruncated = opt.text.length > 70 ? opt.text.substring(0, 67) + '...' : opt.text;
      pdf.text(optTextTruncated, margin + 32, boxY + 12);

      // Option Badge
      let badge = '';
      if (isStudentChoice && isCorrectOption) {
        badge = '✓ Selected & Correct';
        pdf.setTextColor(27, 122, 61);
      } else if (isStudentChoice && !isCorrectOption) {
        badge = '✕ Selected (Wrong)';
        pdf.setTextColor(220, 38, 38);
      } else if (isCorrectOption) {
        badge = '✓ Correct Answer';
        pdf.setTextColor(27, 122, 61);
      }

      if (badge) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text(badge, pageWidth - margin - 20, boxY + 12, { align: 'right' });
      }

      boxY += 21;
    });

    y += questionBoxHeight + 12;
  });

  pdf.save(filename);
}
