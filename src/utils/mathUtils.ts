/**
 * Math and Core Business Logic Utilities for Student Analytics & Classroom Management
 */

// Mapping of Thai weekday strings to JS Date weekday indexes (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
export const THAI_WEEKDAY_MAP: { [key: string]: number } = {
  "อาทิตย์": 0,
  "อา.": 0,
  "จันทร์": 1,
  "จ.": 1,
  "อังคาร": 2,
  "อ.": 2,
  "พุธ": 3,
  "พ.": 3,
  "พฤหัสบดี": 4,
  "พฤหัส": 4,
  "พฤ.": 4,
  "ศุกร์": 5,
  "ศ.": 5,
  "เสาร์": 6,
  "ส.": 6,
};

/**
 * Parses a Thai weekday string to identify the day of the week index (0 - 6).
 */
export function parseThaiWeekday(scheduleDay: string): number {
  const normalized = scheduleDay.trim();
  for (const key in THAI_WEEKDAY_MAP) {
    if (normalized.includes(key)) {
      return THAI_WEEKDAY_MAP[key];
    }
  }
  // Default to Monday (1) if unmatched
  return 1;
}

/**
 * Generates weekly session dates based on start date, weekly schedule day, and total weeks.
 * Spaces subsequent dates by 7 days.
 */
export function generateSessionDates(
  startDateStr: string,
  scheduleDay: string,
  totalWeeks: number = 18
): string[] {
  if (!startDateStr) return [];
  
  const targetDayIdx = parseThaiWeekday(scheduleDay);
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return [];

  // Find the first matching day index on or after the start date
  const resultDates: string[] = [];
  const current = new Date(start);
  
  // Find first day matching the schedule weekday
  let diff = targetDayIdx - current.getDay();
  if (diff < 0) {
    diff += 7; // Go to next week
  }
  current.setDate(current.getDate() + diff);

  // Generate totalWeeks dates spaced by 7 days
  for (let i = 0; i < totalWeeks; i++) {
    const dateStr = current.toISOString().split("T")[0];
    resultDates.push(dateStr);
    current.setDate(current.getDate() + 7);
  }

  return resultDates;
}

export type AttendanceStatus = "present" | "late" | "sick" | "absent";

/**
 * Calculates attendance percentage:
 * - present or sick (excused) = 1.0 point
 * - late = 0.5 points
 * - absent = 0.0 points
 * Attendance % = (Sum of points / Total logged sessions) * 100.
 * Defaults to 100% if no sessions are logged.
 */
export function calculateAttendancePercentage(
  records: { status: AttendanceStatus }[],
  latesPerAbsence: number = 3,
  totalWeeks?: number
): number {
  if (records.length === 0) return 100;
  
  const lpa = latesPerAbsence > 0 ? latesPerAbsence : 3;
  let absents = 0;
  let lates = 0;
  
  for (const rec of records) {
    if (rec.status === "absent") {
      absents++;
    } else if (rec.status === "late") {
      lates++;
    }
  }
  
  const convertedAbsences = Math.floor(lates / lpa);
  const remainingLates = lates % lpa;
  const lostPoints = absents + convertedAbsences + (remainingLates * 0.5);
  
  if (totalWeeks && totalWeeks > 0) {
    const earnedPoints = Math.max(0, totalWeeks - lostPoints);
    return (earnedPoints / totalWeeks) * 100;
  }
  
  const totalPoints = records.length - lostPoints;
  return (Math.max(0, totalPoints) / records.length) * 100;
}

export interface StudentAssignmentRecord {
  assignmentId: string;
  score: number | null; // null represents missing/pending
  maxScore: number;
  assignmentType: "score" | "check";
  isLate: boolean;
  gradeComponent: string;
  manualWeight: number; // weight percentage (e.g. 20 for 20%)
}

/**
 * Computes behavioral score (จิตพิสัย) dynamically:
 * - Starts at 100 points
 * - Deducts -5 for each Absence (absent)
 * - Deducts -2 for each Late attendance (late)
 * - Deducts -2 for each missing assignment score (where score is null/undefined)
 * - Deducts -1 for each late assignment submission (isLate = true)
 * Returns a score between 0 and 100.
 */
export function calculateBehavioralScore(
  attendanceRecords: { status: AttendanceStatus }[],
  assignments: StudentAssignmentRecord[],
  behaviorConfig?: {
    deductAbsent?: number;
    deductLate?: number;
    deductMissing?: number;
    deductLateSubmission?: number;
  }
): number {
  const deductAbsent = behaviorConfig?.deductAbsent ?? 0;
  const deductLate = behaviorConfig?.deductLate ?? 0;
  const deductMissing = behaviorConfig?.deductMissing ?? 0;
  const deductLateSubmission = behaviorConfig?.deductLateSubmission ?? 0;

  let score = 100;

  // Attendance deductions
  for (const rec of attendanceRecords) {
    if (rec.status === "absent") {
      score -= deductAbsent;
    } else if (rec.status === "late") {
      score -= deductLate;
    }
  }

  // Assignment deductions
  for (const ass of assignments) {
    if (ass.score === null) {
      score -= deductMissing; // Missing score
    } else if (ass.isLate) {
      score -= deductLateSubmission; // Late submission
    }
  }

  return Math.max(0, score);
}

export interface ComponentConfig {
  weight: number; // e.g. 30 for 30%
  weightMode: "proportional" | "equal" | "manual";
}

/**
 * Computes a student's grade status and breakdown.
 * Excludes components with zero assignments, and rescales remaining components to 100%.
 */
export function calculateFinalGrade(
  weights: { [componentName: string]: any },
  modes: { [componentName: string]: any },
  assignments: StudentAssignmentRecord[],
  attendanceRecords: { status: AttendanceStatus }[],
  gradeThresholds: { [gradeKey: string]: number } = {
    g4: 80,
    g35: 75,
    g3: 70,
    g25: 65,
    g2: 60,
    g15: 55,
    g1: 50,
  },
  behaviorConfig?: {
    deductAbsent?: number;
    deductLate?: number;
    deductMissing?: number;
    deductLateSubmission?: number;
    gradingMode?: string;
    maxAbsencesAllowed?: number;
    latesPerAbsence?: number;
    scoreCalculationMethod?: "active_rescaling" | "deductive";
    totalWeeks?: number;
  }
) {
  // Map flat weights & modes to component config objects
  const components: { [name: string]: ComponentConfig } = {};
  for (const key in weights) {
    components[key] = {
      weight: weights[key],
      weightMode: (modes[key] || "proportional") as "proportional" | "equal" | "manual"
    };
  }

  // 1. Group assignments by component name
  const groupedAssignments: { [name: string]: StudentAssignmentRecord[] } = {};
  for (const key in components) {
    groupedAssignments[key] = [];
  }

  for (const ass of assignments) {
    if (groupedAssignments[ass.gradeComponent]) {
      groupedAssignments[ass.gradeComponent].push(ass);
    }
  }

  // 2. Compute behavioral score (จิตพิสัย) as part of attendance component
  const behaviorScore100 = calculateBehavioralScore(attendanceRecords, assignments, behaviorConfig);

  // 3. For each active component, compute the percentage achieved (0-100%)
  const componentScores: { [name: string]: number } = {};
  const activeComponents: string[] = [];
  let sumActiveWeights = 0;

  for (const compName in components) {
    const config = components[compName];
    const compAssignments = groupedAssignments[compName] || [];

    // Special logic for attendance component if it includes behavioral / manual attendance log
    const isLockedAtt = (
      compName === "attendance" ||
      compName === "Attendance" ||
      compName === "จิตพิสัย/เข้าเรียน" ||
      compName === "จิตพิสัย" ||
      compName === "เวลาเรียน" ||
      compName === "การเข้าเรียน" ||
      compName === "เช็คชื่อเข้าเรียน" ||
      compName === "การเช็คชื่อ"
    );

    const useAutoGrading = isLockedAtt && (behaviorConfig as any)?.gradingMode !== "manual";

    if (useAutoGrading) {
      // Scale by attendance percentage and behavioral score
      const attPercent = calculateAttendancePercentage(attendanceRecords, behaviorConfig?.latesPerAbsence ?? 3, behaviorConfig?.totalWeeks);
      // Behavior is 50% and Attendance is 50% of this component
      const componentScore = (attPercent + behaviorScore100) / 2; // 0-100%
      componentScores[compName] = componentScore;
      activeComponents.push(compName);
      sumActiveWeights += config.weight;
      continue;
    }

    if (compAssignments.length === 0) {
      // Dynamic Weight Exclusion: exclude from active calculation
      continue;
    }

    activeComponents.push(compName);
    sumActiveWeights += config.weight;

    let obtainedSum = 0;
    let maxSum = 0;
    let ratioSum = 0;
    let manualSum = 0;

    for (const ass of compAssignments) {
      // Determine assignment obtained score
      let scoreVal = 0;
      if (ass.assignmentType === "check") {
        scoreVal = ass.score !== null && ass.score > 0 ? ass.maxScore : 0;
      } else {
        scoreVal = ass.score || 0;
      }

      const ratio = ass.maxScore > 0 ? scoreVal / ass.maxScore : 0;

      obtainedSum += scoreVal;
      maxSum += ass.maxScore;
      ratioSum += ratio;
      manualSum += ratio * (ass.manualWeight / 100);
    }

    if (config.weightMode === "proportional") {
      // (Sum of obtained / Sum of max) * 100
      componentScores[compName] = maxSum > 0 ? (obtainedSum / maxSum) * 100 : 0;
    } else if (config.weightMode === "equal") {
      // Average of ratios * 100
      componentScores[compName] = (ratioSum / compAssignments.length) * 100;
    } else if (config.weightMode === "manual") {
      // Weighted sum * 100
      componentScores[compName] = manualSum * 100;
    }
  }

  // 4. Calculate Final Score % based on chosen calculation method
  let weightedScoreSum = 0;
  let finalPercentage = 0;
  const scoreCalculationMethod = behaviorConfig?.scoreCalculationMethod ?? "deductive";

  if (scoreCalculationMethod === "deductive") {
    let sumTotalWeights = 0;
    for (const compName in components) {
      const config = components[compName];
      const weight = config.weight;
      sumTotalWeights += weight;

      const hasAssignments = activeComponents.includes(compName);
      const score100 = hasAssignments ? (componentScores[compName] || 0) : 100;
      weightedScoreSum += (score100 / 100) * weight;
    }
    finalPercentage = sumTotalWeights > 0 ? (weightedScoreSum / sumTotalWeights) * 100 : 0;
  } else {
    for (const compName of activeComponents) {
      const weight = components[compName].weight;
      const score100 = componentScores[compName] || 0;
      weightedScoreSum += (score100 / 100) * weight;
    }
    finalPercentage = sumActiveWeights > 0 ? (weightedScoreSum / sumActiveWeights) * 100 : 0;
  }

  // 5. Map final score to Thai Grades (4, 3.5, 3, 2.5, 2, 1.5, 1, 0)
  let grade = "0";
  let gradePoints = 0.0;
  if (finalPercentage >= (gradeThresholds.g4 ?? 80)) {
    grade = "4";
    gradePoints = 4.0;
  } else if (finalPercentage >= (gradeThresholds.g35 ?? 75)) {
    grade = "3.5";
    gradePoints = 3.5;
  } else if (finalPercentage >= (gradeThresholds.g3 ?? 70)) {
    grade = "3";
    gradePoints = 3.0;
  } else if (finalPercentage >= (gradeThresholds.g25 ?? 65)) {
    grade = "2.5";
    gradePoints = 2.5;
  } else if (finalPercentage >= (gradeThresholds.g2 ?? 60)) {
    grade = "2";
    gradePoints = 2.0;
  } else if (finalPercentage >= (gradeThresholds.g15 ?? 55)) {
    grade = "1.5";
    gradePoints = 1.5;
  } else if (finalPercentage >= (gradeThresholds.g1 ?? 50)) {
    grade = "1";
    gradePoints = 1.0;
  } else {
    grade = "0";
    gradePoints = 0.0;
  }

  // 6. Student Risk Assessment (green, yellow, red)
  const lpa = behaviorConfig?.latesPerAbsence ?? 3;
  const maxAbsAllowed = behaviorConfig?.maxAbsencesAllowed ?? 4;

  const attRate = calculateAttendancePercentage(attendanceRecords, lpa, behaviorConfig?.totalWeeks);
  
  // Calculate total absences count (real absences + converted lates)
  const realAbsences = attendanceRecords.filter((a) => a.status === "absent").length;
  const realLates = attendanceRecords.filter((a) => a.status === "late").length;
  const convertedAbsences = Math.floor(realLates / lpa);
  const totalAbsences = realAbsences + convertedAbsences;

  let risk: "green" | "yellow" | "red" = "green";

  // Academic risk check
  const academicRed = finalPercentage < 50;
  const academicYellow = finalPercentage < 60;

  // Attendance risk check based on count
  const attendanceRed = totalAbsences > maxAbsAllowed;
  const attendanceYellow = totalAbsences === maxAbsAllowed;

  if (academicRed || attendanceRed) {
    risk = "red";
  } else if (academicYellow || attendanceYellow) {
    risk = "yellow";
  }

  return {
    finalPercentage: parseFloat(finalPercentage.toFixed(2)),
    grade,
    gradePoints,
    risk,
    behaviorScore: behaviorScore100,
    attendanceRate: parseFloat(attRate.toFixed(2)),
    totalAbsences,
    componentScores, // breakdown of each component score out of 100%
  };
}
