# Product Specification Document: Student Analytics & Classroom Management System

## 1. Executive Summary
The **Student Analytics & Classroom Management System** is a responsive, modern web application tailored for teachers and academic advisors. The system streamlines daily classroom operations by integrating:
- **Classroom Organization:** Roster management with Excel import/export capability.
- **Attendance Tracking:** Session-based attendance logging with automatic late-to-absence conversions.
- **Dynamic Gradebook:** Component-based grading with flexible weight formulas (midterm, final, homework, quizzes, and behavior).
- **Behavior (จิตพิสัย) Modeling:** Automatically deducted behavior scores based on attendance and assignment timeliness.
- **AI-Powered Diagnostics:** Automated generation of student performance summaries, strengths, weaknesses, and educational recommendations powered by Google Gemini.
- **Dashboard Visualization:** Recharts-based grade distribution graphs, risk assessments, and real-time alerts.

---

## 2. Core System Architecture
The application runs on a modern serverless web architecture:
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS v4 featuring sleek glassmorphism panels, harmonious HSL colors, and micro-interactions.
- **Backend Database:**
  - **Production:** Supabase PostgreSQL with enabled Row Level Security (RLS) policies.
  - **Demo Mode:** Local Storage-backed mock database engine for instant sandbox access.
- **AI Engine:** Google Gemini API (utilizing `gemini-2.5-flash` model via `@google/generative-ai` SDK).
- **Libraries:**
  - `recharts` for dynamic data visualizations.
  - `xlsx` (SheetJS) for Excel sheet parsing and writing.
  - `lucide-react` for modern icon kits.

---

## 3. Database Schema Design (Supabase PostgreSQL)
The database structure consists of 6 primary tables with constraints and indexes configured for high-performance lookups.

### 3.1. Entity Relationship Diagram (ERD)
- **Classrooms** has many **Students**
- **Classrooms** has many **Attendance** sessions
- **Classrooms** has many **Assignments**
- **Students** has many **Attendance** records
- **Students** has many **Student Scores**
- **Assignments** has many **Student Scores**
- **Students** has one **AI Report**

### 3.2. Table Data Dictionary

#### 1. `classrooms`
Defines a classroom entity managed by an authenticated teacher.
- `id` (UUID, Primary Key)
- `teacher_id` (UUID, referencing `auth.users(id)`)
- `name` (TEXT)
- `weekly_schedule` (TEXT, e.g., "ทุกวันจันทร์")
- `semester_start_date` (DATE)
- `total_weeks` (INTEGER, Default: 18)
- `grade_weights` (JSONB)
- `grade_weight_modes` (JSONB)
- `grade_thresholds` (JSONB)
- `behavior_config` (JSONB)

#### 2. `students`
Roster of students enrolled in a classroom.
- `id` (UUID, Primary Key)
- `classroom_id` (UUID, referencing `classrooms(id)`)
- `student_code` (TEXT)
- `prefix` (TEXT, e.g., "นาย", "นางสาว", "เด็กชาย")
- `first_name` (TEXT)
- `last_name` (TEXT)
- `notes` (TEXT)

#### 3. `attendance`
Logs attendance statuses for students per session date.
- `id` (UUID, Primary Key)
- `classroom_id` (UUID, referencing `classrooms(id)`)
- `student_id` (UUID, referencing `students(id)`)
- `session_date` (DATE)
- `status` (TEXT, 'present', 'late', 'sick', 'absent')

#### 4. `assignments`
Tasks, homework, exams, or assessments created for grading.
- `id` (UUID, Primary Key)
- `classroom_id` (UUID, referencing `classrooms(id)`)
- `name` (TEXT)
- `grade_component` (TEXT, e.g., "homework", "midterm", "final", "attendance")
- `max_score` (NUMERIC)
- `assignment_type` (TEXT, 'score' or 'check')
- `assignment_weight` (NUMERIC)

#### 5. `student_scores`
Individual student grades and completion status on assignments.
- `id` (UUID, Primary Key)
- `student_id` (UUID, referencing `students(id)`)
- `assignment_id` (UUID, referencing `assignments(id)`)
- `score` (NUMERIC)
- `is_late` (BOOLEAN)

#### 6. `ai_reports`
Synthesized diagnostic reports for students.
- `id` (UUID, Primary Key)
- `student_id` (UUID, referencing `students(id)`)
- `performance_summary` (TEXT)
- `strengths` (TEXT)
- `weaknesses` (TEXT)
- `recommendations` (TEXT)

---

## 4. Grading, Attendance, and Risk Algorithms

### 4.1. Attendance Rate Calculation
Calculates attendance percentage based on the rules:
- `Present` or `Sick` (excused) = `1.0` point.
- `Late` = Deducts from late points, converting `X` lates to `1` absence based on `latesPerAbsence` configuration.
- `Absent` = `0.0` points.

If total weeks are configured:
$$\text{Attendance Rate (\%)} = \max\left(0, \frac{\text{Total Weeks} - \text{Total Absences}}{\text{Total Weeks}}\right) \times 100$$
Where:
$$\text{Total Absences} = \text{Real Absences} + \lfloor \frac{\text{Real Lates}}{\text{Lates Per Absence}} \rfloor + \left( (\text{Real Lates} \bmod \text{Lates Per Absence}) \times 0.5 \right)$$

---

### 4.2. Behavioral Score (จิตพิสัย) Model
Behavior scores start at a base of **100** points. Deductions are calculated automatically based on classroom actions:
- **Absence deduction:** $-d_{\text{absent}}$ per absent record.
- **Late attendance deduction:** $-d_{\text{late}}$ per late record.
- **Missing assignment deduction:** $-d_{\text{missing}}$ per un-scored assignment (`score === null`).
- **Late submission deduction:** $-d_{\text{late\_submission}}$ per late assignment score (`is_late === true`).

$$\text{Behavioral Score} = \max\left(0, 100 - (\text{Absences} \times d_{\text{absent}}) - (\text{Lates} \times d_{\text{late}}) - (\text{Missing} \times d_{\text{missing}}) - (\text{Late Submissions} \times d_{\text{late\_submission}})\right)$$

---

### 4.3. Final Grade Calculation & Weighting Modes
Components are aggregated into a final score (0–100%). If a grading component has zero assignments created, it is dynamically excluded, and the weights of remaining components are rescaled.

#### 1. Proportional Mode (Sum-to-Sum)
Scores are summed up and divided by the total possible score:
$$\text{Component Score} = \frac{\sum \text{Obtained Scores}}{\sum \text{Max Scores}} \times 100$$

#### 2. Equal Mode (Average of Percentages)
Assignments are treated with equal significance, regardless of their max score:
$$\text{Component Score} = \frac{\sum \left( \frac{\text{Obtained Score}}{\text{Max Score}} \right)}{\text{Total Assignments}} \times 100$$

#### 3. Manual Mode (Weighted Assignments)
Each assignment within a component contributes a manual percentage:
$$\text{Component Score} = \sum \left( \frac{\text{Obtained Score}}{\text{Max Score}} \times \text{Manual Weight} \right)$$

#### 4. Component Rescaling (Active Rescaling vs Deductive)
- **Active Rescaling (`active_rescaling`):** Excludes empty components and rescales active weights to total 100%.
- **Deductive Mode (`deductive`):** Empty components default to 100% score (un-penalized), keeping global weights constant.

#### 5. Threshold Grade Translation
Final score translates to a Thai academic grade:
- $\ge 80\% \rightarrow$ **Grade 4.0**
- $\ge 75\% \rightarrow$ **Grade 3.5**
- $\ge 70\% \rightarrow$ **Grade 3.0**
- $\ge 65\% \rightarrow$ **Grade 2.5**
- $\ge 60\% \rightarrow$ **Grade 2.0**
- $\ge 55\% \rightarrow$ **Grade 1.5**
- $\ge 50\% \rightarrow$ **Grade 1.0**
- $< 50\% \rightarrow$ **Grade 0.0** (Failed)

---

### 4.4. Student Risk Flagging System
Students are categorized into risk tiers to trigger classroom alerts:
- **Red (Critical Risk):**
  - Final percentage falls below **50%** (failing).
  - OR total absences exceed `maxAbsencesAllowed` configured in the classroom.
- **Yellow (Watchlist):**
  - Final percentage falls between **50% and 59%**.
  - OR total absences equal `maxAbsencesAllowed`.
- **Green (Normal/Excellent):** All other students.

---

## 5. Key Functional Modules

### 5.1. Roster Module & Excel Integration
- **Direct Input:** Add student code, prefix, name, and notes.
- **Excel Roster Import:**
  - Reads `.xlsx` files using `xlsx.read()`.
  - Maps columns `รหัสนักเรียน` (Code), `คำนำหน้า` (Prefix), `ชื่อ` (First Name), and `นามสกุล` (Last Name).
  - Bulk inserts rows while preventing duplicate student codes in the same classroom.
- **Excel Roster Export:** Creates workbook sheets from students array and downloads them directly in-browser.

### 5.2. Daily Attendance Sheet
- **Session Selector:** Creates or selects session dates aligned with the classroom's weekly schedule.
- **Grid Logging:** Allows single-click status updates (`Present`, `Late`, `Sick`, `Absent`) for all students.
- **Bulk Set:** Support for fast check-in (e.g., set all to "Present" to quickly check in the class).

### 5.3. Gradebook Matrix
- **Assignment Builder:** Create graded columns specifying Component Category (homework, quizzes, exams, behavior), Max Score, and Assignment Weight.
- **Score Cell Input:** Inline scoring table with input sanitization (values clamped between 0 and Max Score). Includes late-submission check-boxes to apply behavioral penalties.

### 5.4. AI Insights & Diagnostic generator
- **API Endpoint:** `POST /api/ai-report`
- **Gemini System Prompt Design:**
  The AI analyzes the student profile and returns a structured output:
  - **Performance Summary:** Overview of the student's status.
  - **Strengths:** Key highlights of academic or attendance metrics.
  - **Weaknesses:** Academic gaps, behavioral warnings, or attendance patterns.
  - **Recommendations:** Actionable advice for the teacher to support the student's progress.

---

## 6. UI/UX and Design Guidelines
To deliver a premium design experience, the system enforces:
- **Color Scheme:** Dominated by a deep navy primary `#004D99`, slate background `#f8fafc`, emerald green for normal/success states, amber for warning alerts, and rose red for critical risk flags.
- **Modern Typography:** Set in *Inter* or *Outfit* for modern numerals, and *Sarabun* for clean Thai language rendering.
- **Interactive Alerts Banner:** Displays high-priority warnings at the top of the dashboard whenever a student triggers red or yellow risk criteria, facilitating immediate interventions.
