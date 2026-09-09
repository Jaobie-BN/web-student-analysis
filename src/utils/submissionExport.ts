import type { Student, Assignment, StudentScore } from "@/utils/db";

export interface AssignmentStatusItem {
  assignmentId: string;
  assignmentName: string;
  isSubmitted: boolean;
  isLate: boolean;
  score: number | null;
  maxScore: number;
  revisionStatus?: "revision" | "retest" | null;
}

export interface StudentSubmissionRow {
  student: Student;
  orderNumber: number;
  fullName: string;
  assignmentsStatus: AssignmentStatusItem[];
  submittedCount: number;
  missingCount: number;
  revisionCount: number;
  retestCount: number;
  totalAssignments: number;
  submissionRate: number; // 0 - 100
}

export interface AssignmentSummaryItem {
  assignment: Assignment;
  submittedCount: number;
  missingCount: number;
  revisionCount: number;
  retestCount: number;
  submissionRate: number; // 0 - 100
}

export interface SubmissionDataResult {
  sortedAssignments: Assignment[];
  studentRows: StudentSubmissionRow[];
  assignmentSummaries: AssignmentSummaryItem[];
  totalClassSubmissions: number;
  totalPossibleSubmissions: number;
  overallSubmissionRate: number;
}

/**
 * Calculates submission status and statistics for all students and assignments in a classroom.
 */
export function calculateSubmissionData(
  students: Student[],
  assignments: Assignment[],
  scores: StudentScore[],
  assignmentOrder?: string[],
  pendingRevisions?: Record<string, "revision" | "retest">
): SubmissionDataResult {
  // Sort assignments according to classroom custom order
  const order = assignmentOrder || [];
  const sortedAssignments = [...assignments].sort((a, b) => {
    const idxA = order.indexOf(a.id);
    const idxB = order.indexOf(b.id);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  // Calculate per student
  const studentRows: StudentSubmissionRow[] = students.map((student, index) => {
    let submittedCount = 0;
    let revisionCount = 0;
    let retestCount = 0;

    const assignmentsStatus: AssignmentStatusItem[] = sortedAssignments.map((ass) => {
      const scoreRec = scores.find(
        (sc) => sc.student_id === student.id && sc.assignment_id === ass.id
      );

      const revisionStatus: "revision" | "retest" | null =
        scoreRec?.revision_status ||
        pendingRevisions?.[`${student.id}_${ass.id}`] ||
        null;

      if (revisionStatus === "revision") {
        revisionCount++;
      } else if (revisionStatus === "retest") {
        retestCount++;
      }

      let isSubmitted = false;
      if (scoreRec && scoreRec.score !== null) {
        if (ass.assignment_type === "check") {
          isSubmitted = scoreRec.score > 0;
        } else {
          isSubmitted = true;
        }
      }

      if (isSubmitted) {
        submittedCount++;
      }

      return {
        assignmentId: ass.id,
        assignmentName: ass.name,
        isSubmitted,
        isLate: Boolean(scoreRec?.is_late),
        score: scoreRec?.score ?? null,
        maxScore: ass.max_score,
        revisionStatus,
      };
    });

    const totalAssignments = sortedAssignments.length;
    const missingCount = totalAssignments - submittedCount;
    const submissionRate =
      totalAssignments > 0 ? Math.round((submittedCount / totalAssignments) * 100) : 0;

    return {
      student,
      orderNumber: index + 1,
      fullName: `${student.prefix || ""}${student.first_name} ${student.last_name}`,
      assignmentsStatus,
      submittedCount,
      missingCount,
      revisionCount,
      retestCount,
      totalAssignments,
      submissionRate,
    };
  });

  // Calculate per assignment summary
  const assignmentSummaries: AssignmentSummaryItem[] = sortedAssignments.map((ass) => {
    let submittedCount = 0;
    let revisionCount = 0;
    let retestCount = 0;

    students.forEach((s) => {
      const scoreRec = scores.find(
        (sc) => sc.student_id === s.id && sc.assignment_id === ass.id
      );
      const rev =
        scoreRec?.revision_status ||
        pendingRevisions?.[`${s.id}_${ass.id}`] ||
        null;
      if (rev === "revision") revisionCount++;
      if (rev === "retest") retestCount++;

      if (scoreRec && scoreRec.score !== null) {
        if (ass.assignment_type === "check") {
          if (scoreRec.score > 0) submittedCount++;
        } else {
          submittedCount++;
        }
      }
    });

    const missingCount = students.length - submittedCount;
    const submissionRate =
      students.length > 0 ? Math.round((submittedCount / students.length) * 100) : 0;

    return {
      assignment: ass,
      submittedCount,
      missingCount,
      revisionCount,
      retestCount,
      submissionRate,
    };
  });

  const totalClassSubmissions = studentRows.reduce((acc, row) => acc + row.submittedCount, 0);
  const totalPossibleSubmissions = students.length * sortedAssignments.length;
  const overallSubmissionRate =
    totalPossibleSubmissions > 0
      ? Math.round((totalClassSubmissions / totalPossibleSubmissions) * 100)
      : 0;

  return {
    sortedAssignments,
    studentRows,
    assignmentSummaries,
    totalClassSubmissions,
    totalPossibleSubmissions,
    overallSubmissionRate,
  };
}

/**
 * Generates and downloads an Excel file (.xlsx) with colored cells:
 * - Green cell background (#D4EDDA) for "ส่งแล้ว"
 * - Red cell background (#F8D7DA) for "ยังไม่ส่ง"
 * - Summary statistics columns and bottom summary rows
 */
export async function exportSubmissionStatusExcel(params: {
  classroomName: string;
  subjectCode?: string;
  students: Student[];
  assignments: Assignment[];
  scores: StudentScore[];
  assignmentOrder?: string[];
  pendingRevisions?: Record<string, "revision" | "retest">;
}) {
  const {
    classroomName,
    subjectCode,
    students,
    assignments,
    scores,
    assignmentOrder,
    pendingRevisions,
  } = params;

  if (students.length === 0) {
    throw new Error("ไม่มีข้อมูลนักเรียนในห้องเรียนนี้");
  }

  const data = calculateSubmissionData(
    students,
    assignments,
    scores,
    assignmentOrder,
    pendingRevisions
  );
  const { sortedAssignments, studentRows, assignmentSummaries } = data;

  // Dynamically import exceljs to ensure clean browser bundle
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = (ExcelJSModule.default || ExcelJSModule) as any;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Web Student Analysis";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("รายงานสถานะการส่งงาน", {
    views: [{ showGridLines: true }],
  });

  // Color constants (Hex ARGB format for ExcelJS)
  const COLOR_HEADER_BG = "FFF1F5F9"; // Slate 100
  const COLOR_HEADER_TEXT = "FF0F172A"; // Slate 900
  const COLOR_GREEN_BG = "FFD4EDDA"; // Soft Green
  const COLOR_GREEN_TEXT = "FF155724"; // Dark Green
  const COLOR_RED_BG = "FFF8D7DA"; // Soft Red
  const COLOR_RED_TEXT = "FF721C24"; // Dark Red
  const COLOR_AMBER_BG = "FFFFF3CD"; // Soft Amber / Orange
  const COLOR_AMBER_TEXT = "FF856404"; // Dark Amber
  const COLOR_PURPLE_BG = "FFEDE9FE"; // Soft Purple / Indigo
  const COLOR_PURPLE_TEXT = "FF5B21B6"; // Dark Purple
  const COLOR_BORDER = "FFCBD5E1"; // Slate 300
  const COLOR_SUMMARY_BG = "FFF8FAFC"; // Slate 50

  const thinBorder = {
    top: { style: "thin", color: { argb: COLOR_BORDER } },
    left: { style: "thin", color: { argb: COLOR_BORDER } },
    bottom: { style: "thin", color: { argb: COLOR_BORDER } },
    right: { style: "thin", color: { argb: COLOR_BORDER } },
  };

  // Title block
  const totalCols = 3 + sortedAssignments.length + 3; // No, Code, Name, [Assignments...], Submitted, Missing, Rate

  worksheet.mergeCells(1, 1, 1, Math.max(totalCols, 4));
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = `รายงานสถานะการส่งงาน - ${classroomName}${subjectCode ? ` (${subjectCode})` : ""}`;
  titleCell.font = { name: "Cordia New", size: 18, bold: true, color: { argb: "FF0F172A" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells(2, 1, 2, Math.max(totalCols, 4));
  const subTitleCell = worksheet.getCell(2, 1);
  const nowStr = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  subTitleCell.value = `ข้อมูล ณ วันที่: ${nowStr} | จำนวนนักเรียนทั้งหมด: ${students.length} คน | จำนวนชิ้นงานทั้งหมด: ${sortedAssignments.length} ชิ้น | อัตราการส่งเฉลี่ย: ${data.overallSubmissionRate}%`;
  subTitleCell.font = { name: "Cordia New", size: 12, color: { argb: "FF64748B" } };
  subTitleCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(2).height = 20;

  // Empty row 3
  worksheet.getRow(3).height = 10;

  // Row 4: Table Headers
  const headerRowNumber = 4;
  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.height = 28;

  const headers = [
    "เลขที่",
    "รหัสนักเรียน",
    "ชื่อ - นามสกุล",
    ...sortedAssignments.map((a) => a.name),
    "ส่งแล้ว (ชิ้น)",
    "ค้างส่ง (ชิ้น)",
    "อัตราการส่ง (%)",
  ];

  headers.forEach((text, colIdx) => {
    const colNumber = colIdx + 1;
    const cell = headerRow.getCell(colNumber);
    cell.value = text;
    cell.font = { name: "Cordia New", size: 13, bold: true, color: { argb: COLOR_HEADER_TEXT } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_HEADER_BG },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: colIdx === 2 ? "left" : "center",
      wrapText: true,
    };
    cell.border = thinBorder;
  });

  // Student Data Rows (Starting at row 5)
  let currentRowIdx = 5;

  studentRows.forEach((row) => {
    const excelRow = worksheet.getRow(currentRowIdx);
    excelRow.height = 22;

    // Col 1: เลขที่
    const noCell = excelRow.getCell(1);
    noCell.value = row.orderNumber;
    noCell.alignment = { vertical: "middle", horizontal: "center" };
    noCell.border = thinBorder;
    noCell.font = { name: "Cordia New", size: 12 };

    // Col 2: รหัส
    const codeCell = excelRow.getCell(2);
    codeCell.value = row.student.student_code;
    codeCell.alignment = { vertical: "middle", horizontal: "center" };
    codeCell.border = thinBorder;
    codeCell.font = { name: "Cordia New", size: 12 };

    // Col 3: ชื่อ - นามสกุล
    const nameCell = excelRow.getCell(3);
    nameCell.value = row.fullName;
    nameCell.alignment = { vertical: "middle", horizontal: "left" };
    nameCell.border = thinBorder;
    nameCell.font = { name: "Cordia New", size: 12 };

    // Assignment Columns
    row.assignmentsStatus.forEach((status, aIdx) => {
      const colNumber = 4 + aIdx;
      const cell = excelRow.getCell(colNumber);
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: "center" };

      if (status.revisionStatus === "revision") {
        cell.value = "รอแก้งาน";
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLOR_AMBER_BG },
        };
        cell.font = {
          name: "Cordia New",
          size: 12,
          bold: true,
          color: { argb: COLOR_AMBER_TEXT },
        };
      } else if (status.revisionStatus === "retest") {
        cell.value = "รอสอบแก้";
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLOR_PURPLE_BG },
        };
        cell.font = {
          name: "Cordia New",
          size: 12,
          bold: true,
          color: { argb: COLOR_PURPLE_TEXT },
        };
      } else if (status.isSubmitted) {
        cell.value = "ส่งแล้ว";
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLOR_GREEN_BG },
        };
        cell.font = {
          name: "Cordia New",
          size: 12,
          bold: true,
          color: { argb: COLOR_GREEN_TEXT },
        };
      } else {
        cell.value = "ยังไม่ส่ง";
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLOR_RED_BG },
        };
        cell.font = {
          name: "Cordia New",
          size: 12,
          bold: true,
          color: { argb: COLOR_RED_TEXT },
        };
      }
    });

    // Summary: ส่งแล้ว (ชิ้น)
    const subCell = excelRow.getCell(4 + sortedAssignments.length);
    subCell.value = row.submittedCount;
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    subCell.border = thinBorder;
    subCell.font = { name: "Cordia New", size: 12, bold: true, color: { argb: COLOR_GREEN_TEXT } };
    subCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0FDF4" }, // Very soft emerald
    };

    // Summary: ค้างส่ง (ชิ้น)
    const missCell = excelRow.getCell(5 + sortedAssignments.length);
    missCell.value = row.missingCount;
    missCell.alignment = { vertical: "middle", horizontal: "center" };
    missCell.border = thinBorder;
    missCell.font = { name: "Cordia New", size: 12, bold: true, color: { argb: COLOR_RED_TEXT } };
    missCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEF2F2" }, // Very soft red
    };

    // Summary: อัตราการส่ง (%)
    const rateCell = excelRow.getCell(6 + sortedAssignments.length);
    rateCell.value = `${row.submissionRate}%`;
    rateCell.alignment = { vertical: "middle", horizontal: "center" };
    rateCell.border = thinBorder;
    rateCell.font = { name: "Cordia New", size: 12, bold: true };
    rateCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_SUMMARY_BG },
    };

    currentRowIdx++;
  });

  // Summary Row 1: รวมส่งแล้ว (คน)
  const sumSubmittedRow = worksheet.getRow(currentRowIdx);
  sumSubmittedRow.height = 24;
  worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, 3);
  const sumSubLabel = sumSubmittedRow.getCell(1);
  sumSubLabel.value = "รวมส่งแล้ว (คน)";
  sumSubLabel.alignment = { vertical: "middle", horizontal: "right" };
  sumSubLabel.font = { name: "Cordia New", size: 12, bold: true, color: { argb: COLOR_GREEN_TEXT } };
  sumSubLabel.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
  sumSubLabel.border = thinBorder;
  sumSubmittedRow.getCell(2).border = thinBorder;
  sumSubmittedRow.getCell(3).border = thinBorder;

  assignmentSummaries.forEach((sum, aIdx) => {
    const cell = sumSubmittedRow.getCell(4 + aIdx);
    cell.value = sum.submittedCount;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
    cell.font = { name: "Cordia New", size: 12, bold: true, color: { argb: COLOR_GREEN_TEXT } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_GREEN_BG },
    };
  });

  const totalSubCell = sumSubmittedRow.getCell(4 + sortedAssignments.length);
  totalSubCell.value = data.totalClassSubmissions;
  totalSubCell.alignment = { vertical: "middle", horizontal: "center" };
  totalSubCell.border = thinBorder;
  totalSubCell.font = { name: "Cordia New", size: 12, bold: true, color: { argb: COLOR_GREEN_TEXT } };
  totalSubCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_GREEN_BG },
  };

  const emptyCell1 = sumSubmittedRow.getCell(5 + sortedAssignments.length);
  emptyCell1.value = "-";
  emptyCell1.alignment = { vertical: "middle", horizontal: "center" };
  emptyCell1.border = thinBorder;

  const emptyCell2 = sumSubmittedRow.getCell(6 + sortedAssignments.length);
  emptyCell2.value = "-";
  emptyCell2.alignment = { vertical: "middle", horizontal: "center" };
  emptyCell2.border = thinBorder;

  currentRowIdx++;

  // Summary Row 2: รวมค้างส่ง (คน)
  const sumMissingRow = worksheet.getRow(currentRowIdx);
  sumMissingRow.height = 24;
  worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, 3);
  const sumMissLabel = sumMissingRow.getCell(1);
  sumMissLabel.value = "รวมค้างส่ง (คน)";
  sumMissLabel.alignment = { vertical: "middle", horizontal: "right" };
  sumMissLabel.font = { name: "Cordia New", size: 12, bold: true, color: { argb: COLOR_RED_TEXT } };
  sumMissLabel.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
  sumMissLabel.border = thinBorder;
  sumMissingRow.getCell(2).border = thinBorder;
  sumMissingRow.getCell(3).border = thinBorder;

  assignmentSummaries.forEach((sum, aIdx) => {
    const cell = sumMissingRow.getCell(4 + aIdx);
    cell.value = sum.missingCount;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
    cell.font = { name: "Cordia New", size: 12, bold: true, color: { argb: COLOR_RED_TEXT } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_RED_BG },
    };
  });

  const emptyCell3 = sumMissingRow.getCell(4 + sortedAssignments.length);
  emptyCell3.value = "-";
  emptyCell3.alignment = { vertical: "middle", horizontal: "center" };
  emptyCell3.border = thinBorder;

  const totalMissCell = sumMissingRow.getCell(5 + sortedAssignments.length);
  totalMissCell.value = data.totalPossibleSubmissions - data.totalClassSubmissions;
  totalMissCell.alignment = { vertical: "middle", horizontal: "center" };
  totalMissCell.border = thinBorder;
  totalMissCell.font = { name: "Cordia New", size: 12, bold: true, color: { argb: COLOR_RED_TEXT } };
  totalMissCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_RED_BG },
  };

  const emptyCell4 = sumMissingRow.getCell(6 + sortedAssignments.length);
  emptyCell4.value = "-";
  emptyCell4.alignment = { vertical: "middle", horizontal: "center" };
  emptyCell4.border = thinBorder;

  currentRowIdx++;

  // Summary Row 3: ร้อยละการส่ง (%)
  const sumRateRow = worksheet.getRow(currentRowIdx);
  sumRateRow.height = 24;
  worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, 3);
  const sumRateLabel = sumRateRow.getCell(1);
  sumRateLabel.value = "ร้อยละการส่ง (%)";
  sumRateLabel.alignment = { vertical: "middle", horizontal: "right" };
  sumRateLabel.font = { name: "Cordia New", size: 12, bold: true, color: { argb: COLOR_HEADER_TEXT } };
  sumRateLabel.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
  sumRateLabel.border = thinBorder;
  sumRateRow.getCell(2).border = thinBorder;
  sumRateRow.getCell(3).border = thinBorder;

  assignmentSummaries.forEach((sum, aIdx) => {
    const cell = sumRateRow.getCell(4 + aIdx);
    cell.value = `${sum.submissionRate}%`;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
    cell.font = { name: "Cordia New", size: 12, bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_SUMMARY_BG },
    };
  });

  const emptyCell5 = sumRateRow.getCell(4 + sortedAssignments.length);
  emptyCell5.value = "-";
  emptyCell5.alignment = { vertical: "middle", horizontal: "center" };
  emptyCell5.border = thinBorder;

  const emptyCell6 = sumRateRow.getCell(5 + sortedAssignments.length);
  emptyCell6.value = "-";
  emptyCell6.alignment = { vertical: "middle", horizontal: "center" };
  emptyCell6.border = thinBorder;

  const overallRateCell = sumRateRow.getCell(6 + sortedAssignments.length);
  overallRateCell.value = `${data.overallSubmissionRate}%`;
  overallRateCell.alignment = { vertical: "middle", horizontal: "center" };
  overallRateCell.border = thinBorder;
  overallRateCell.font = { name: "Cordia New", size: 12, bold: true, color: { argb: "FF2563EB" } };
  overallRateCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFF6FF" },
  };

  // Adjust column widths
  worksheet.getColumn(1).width = 8; // เลขที่
  worksheet.getColumn(2).width = 16; // รหัสนักเรียน
  worksheet.getColumn(3).width = 28; // ชื่อ-นามสกุล

  sortedAssignments.forEach((_, aIdx) => {
    const colNumber = 4 + aIdx;
    worksheet.getColumn(colNumber).width = 16;
  });

  worksheet.getColumn(4 + sortedAssignments.length).width = 15; // ส่งแล้ว (ชิ้น)
  worksheet.getColumn(5 + sortedAssignments.length).width = 15; // ค้างส่ง (ชิ้น)
  worksheet.getColumn(6 + sortedAssignments.length).width = 16; // อัตราการส่ง (%)

  // Write buffer and trigger download in browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = classroomName.replace(/[\\/:*?"<>|]/g, "_");
  const dateStr = new Date().toISOString().split("T")[0];
  a.download = `รายงานสถานะการส่งงาน_${safeName}_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
