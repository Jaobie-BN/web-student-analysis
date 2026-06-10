# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** web-student-analysis
- **Date:** 2026-06-10
- **Prepared by:** TestSprite AI Team & Antigravity AI Assistant

---

## 2️⃣ Requirement Validation Summary

### Requirement: Teacher Authentication & Demo Mode
- **Description:** Supports email/password login and Local Storage-based Demo Mode.

#### Test TC001 Sign in and reach the dashboard
- **Test Code:** [TC001_Sign_in_and_reach_the_dashboard.py](./TC001_Sign_in_and_reach_the_dashboard.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/538409e1-2d0f-4be7-9f99-4d62e9ca93a6)
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Login works as expected. The teacher can enter credentials, submit the form, and successfully navigate to the dashboard portal.

#### Test TC002 Reach the dashboard from the landing page
- **Test Code:** [TC002_Reach_the_dashboard_from_the_landing_page.py](./TC002_Reach_the_dashboard_from_the_landing_page.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/bdb9f494-0e90-457a-bc2c-6e1496e430f8)
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Direct navigation from the landing page following sign-in successfully renders classroom analytics and dashboard components.

#### Test TC003 Enter the portal with demo data
- **Test Code:** [TC003_Enter_the_portal_with_demo_data.py](./TC003_Enter_the_portal_with_demo_data.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/81de4b3d-f597-4230-b700-734c474cc623)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Test blocked due to websocket tunnel disconnection (`ERR_EMPTY_RESPONSE`) from the cloud runner.

#### Test TC004 View dashboard analytics and risk flags after data entry
- **Test Code:** [TC004_View_dashboard_analytics_and_risk_flags_after_data_entry.py](./TC004_View_dashboard_analytics_and_risk_flags_after_data_entry.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/f3faa673-e95b-4aaa-b341-129963a6512a)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Test blocked due to tunnel network disruption during execution.

#### Test TC008 Review analytics and risk overview
- **Test Code:** [TC008_Review_analytics_and_risk_overview.py](./TC008_Review_analytics_and_risk_overview.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/72893ee7-1b0a-48ba-a731-d7d2f306a081)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Failed to login due to tunnel connection drop ("Failed to fetch").

---

### Requirement: Classroom & Grade Configuration
- **Description:** Create/edit classrooms and configure grade components, weights, and letter thresholds.

#### Test TC010 Create a classroom with grading settings
- **Test Code:** [TC010_Create_a_classroom_with_grading_settings.py](./TC010_Create_a_classroom_with_grading_settings.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/06fcced7-22ef-4869-ac33-12ae6c75ee62)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure (`ERR_EMPTY_RESPONSE`).

#### Test TC013 Create and configure a classroom
- **Test Code:** [TC013_Create_and_configure_a_classroom.py](./TC013_Create_and_configure_a_classroom.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/ebefd528-1274-4819-b46a-e0f81983e987)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC015 Update classroom grading settings
- **Test Code:** [TC015_Update_classroom_grading_settings.py](./TC015_Update_classroom_grading_settings.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/6c5e1253-c285-4bec-b919-9fe1d99f5e66)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked; login page failed to submit due to tunnel drop.

---

### Requirement: Student Roster Management
- **Description:** Manage student profile roster, import/export rosters via Excel templates.

#### Test TC012 Add a student to the roster
- **Test Code:** [TC012_Add_a_student_to_the_roster.py](./TC012_Add_a_student_to_the_roster.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/40070ad7-b8dc-4e89-aead-6c8a01797c15)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC014 Import a roster from Excel
- **Test Code:** [TC014_Import_a_roster_from_Excel.py](./TC014_Import_a_roster_from_Excel.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/e3c3d511-1f92-49f6-a9c5-d5abeabb5a7b)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC016 Delete a student from the roster
- **Test Code:** [TC016_Delete_a_student_from_the_roster.py](./TC016_Delete_a_student_from_the_roster.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/f53d9dcf-9bf2-4af9-95ae-e0b59efac478)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC017 Edit a student in the roster
- **Test Code:** [TC017_Edit_a_student_in_the_roster.py](./TC017_Edit_a_student_in_the_roster.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/695d2144-e083-47ea-bf86-3b1c66627fae)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC026 Export the roster to Excel
- **Test Code:** [TC026_Export_the_roster_to_Excel.py](./TC026_Export_the_roster_to_Excel.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/7c225f80-2b33-4e8f-8ebb-4f96a586e93a)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

---

### Requirement: Attendance Tracking
- **Description:** Track daily student attendance and verify sessions.

#### Test TC005 Record attendance for a session date
- **Test Code:** [TC005_Record_attendance_for_a_session_date.py](./TC005_Record_attendance_for_a_session_date.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/76700d38-7c6e-44d9-9df4-9a0047ea0739)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC009 Save an all-present attendance session
- **Test Code:** [TC009_Save_an_all_present_attendance_session.py](./TC009_Save_an_all_present_attendance_session.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/6be56ec6-b4c1-4aed-9cfc-84377e2b3e68)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked; login page failed to submit due to tunnel drop.

#### Test TC018 Review attendance history for a class session
- **Test Code:** [TC018_Review_attendance_history_for_a_class_session.py](./TC018_Review_attendance_history_for_a_class_session.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/0744827d-fa5c-43f9-851d-9fac266af6d7)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked; login page failed to submit due to tunnel drop.

---

### Requirement: Gradebook & Score Entry
- **Description:** Manage assignments, enter student scores, and support late submission indicators.

#### Test TC006 Enter scores and recalculate totals
- **Test Code:** [TC006_Enter_scores_and_recalculate_totals.py](./TC006_Enter_scores_and_recalculate_totals.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/b98b4de0-ca2f-4fde-992c-575f81131850)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC007 Enter assignment scores and recalculate grades
- **Test Code:** [TC007_Enter_assignment_scores_and_recalculate_grades.py](./TC007_Enter_assignment_scores_and_recalculate_grades.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/3db2d5eb-918d-4a1e-abf9-1fd68b97a12e)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC011 Create an assignment in the gradebook
- **Test Code:** [TC011_Create_an_assignment_in_the_gradebook.py](./TC011_Create_an_assignment_in_the_gradebook.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/c93c574a-24cf-4f10-ae2c-b029fd5530ad)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked; login page failed to submit due to tunnel drop.

#### Test TC027 Mark a submission as late while entering scores
- **Test Code:** [TC027_Mark_a_submission_as_late_while_entering_scores.py](./TC027_Mark_a_submission_as_late_while_entering_scores.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/19571a99-62cc-40ec-a85b-7e7f9389a2d9)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC030 Toggle a late submission for a score
- **Test Code:** [TC030_Toggle_a_late_submission_for_a_score.py](./TC030_Toggle_a_late_submission_for_a_score.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/7d31b00b-a510-424a-9d14-a57de9fc7203)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

---

### Requirement: Reports & Exports
- **Description:** Generate and export report cards (PDF) and transcripts (Excel).

#### Test TC019 Generate a report card or transcript and export it
- **Test Code:** [TC019_Generate_a_report_card_or_transcript_and_export_it.py](./TC019_Generate_a_report_card_or_transcript_and_export_it.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/9fa60bae-d8f7-42db-bc74-5a80beff0deb)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC020 Generate a report card for a student
- **Test Code:** [TC020_Generate_a_report_card_for_a_student.py](./TC020_Generate_a_report_card_for_a_student.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/1b8c495d-8a66-4b37-a997-5e325448d56c)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC021 Generate a report card and export it as PDF
- **Test Code:** [TC021_Generate_a_report_card_and_export_it_as_PDF.py](./TC021_Generate_a_report_card_and_export_it_as_PDF.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/58c39b19-343c-4eed-9a05-c47fe0a7e425)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC022 Generate a transcript and export it as Excel
- **Test Code:** [TC022_Generate_a_transcript_and_export_it_as_Excel.py](./TC022_Generate_a_transcript_and_export_it_as_Excel.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/55775933-ca21-4a73-8bde-ff676fd05c7f)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC028 Switch between report card and transcript formats
- **Test Code:** [TC028_Switch_between_report_card_and_transcript_formats.py](./TC028_Switch_between_report_card_and_transcript_formats.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/d64cf95f-4ab0-4fef-a607-e648028cd800)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

---

### Requirement: AI Insights (Google Gemini)
- **Description:** Generate and save student performance summary insights using Gemini API.

#### Test TC023 Generate and save an AI student summary
- **Test Code:** [TC023_Generate_and_save_an_AI_student_summary.py](./TC023_Generate_and_save_an_AI_student_summary.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/6d98af5a-db9b-4e1c-822d-95ef25356a77)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC024 View AI student insights
- **Test Code:** [TC024_View_AI_student_insights.py](./TC024_View_AI_student_insights.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/48ee44b4-30d3-48e1-9c8d-352509dace8a)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC025 Generate an AI performance summary for a student
- **Test Code:** [TC025_Generate_an_AI_performance_summary_for_a_student.py](./TC025_Generate_an_AI_performance_summary_for_a_student.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/7a3083a9-0934-4873-8901-c93cd7ca0c28)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

#### Test TC029 Save a generated AI insight report
- **Test Code:** [TC029_Save_a_generated_AI_insight_report.py](./TC029_Save_a_generated_AI_insight_report.py)
- **Test Visualization and Result:** [Link](https://www.testsprite.com/dashboard/mcp/tests/1ec4a595-b2ab-4026-9915-1da8c06229d5/eb9d18a0-a01a-486d-84f2-b526a66c48fe)
- **Status:** 🚫 Blocked
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked due to tunnel connection failure.

---

## 3️⃣ Coverage & Matching Metrics

- **6.67%** of tests passed (2 of 30 tests)

| Requirement | Total Tests | ✅ Passed | 🚫 Blocked / Failed |
| :--- | :---: | :---: | :---: |
| Teacher Authentication & Demo Mode | 5 | 2 | 3 |
| Classroom & Grade Configuration | 3 | 0 | 3 |
| Student Roster Management | 5 | 0 | 5 |
| Attendance Tracking | 3 | 0 | 3 |
| Gradebook & Score Entry | 5 | 0 | 5 |
| Reports & Exports | 5 | 0 | 5 |
| AI Insights (Google Gemini) | 4 | 0 | 4 |

---

## 4️⃣ Key Gaps / Risks

> **Summary:** 6.67% of tests passed fully (2 out of 30).
> 
> **Risks:** 
> - **Websocket Tunnel Instability:** 28 of the 30 tests were blocked because the TestSprite cloud runners experienced network/tunnel disconnection (`ERR_EMPTY_RESPONSE`) when trying to communicate with our local port 3000.
> - **Authentication Robustness:** The core authentication logic works as expected (TC001 and TC002 passed), showing the Next.js server behaves correctly when requests do reach it.
> - **Recommendations:** 
>   1. Ensure the tunnel connection remains active during parallel test execution.
>   2. Re-run tests sequentially or in smaller batches to avoid overloading the local dev/production server and the tunnel bandwidth.
