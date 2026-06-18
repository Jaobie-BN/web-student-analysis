-- PostgreSQL Supabase Schema for Student Analytics & Classroom Management System
-- Enable RLS and setup all required tables.

-- Create custom updated_at function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. CLASSROOMS
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weekly_schedule TEXT NOT NULL, -- e.g. "ทุกวันจันทร์", "ทุกวันอังคาร"
  semester_start_date DATE NOT NULL,
  total_weeks INTEGER DEFAULT 18 NOT NULL,
  grade_weights JSONB NOT NULL DEFAULT '{"attendance": 10, "homework": 30, "midterm": 30, "final": 30}'::jsonb,
  grade_weight_modes JSONB NOT NULL DEFAULT '{"attendance": "proportional", "homework": "proportional", "midterm": "proportional", "final": "proportional"}'::jsonb,
  grade_thresholds JSONB NOT NULL DEFAULT '{"g4": 80, "g35": 75, "g3": 70, "g25": 65, "g2": 60, "g15": 55, "g1": 50}'::jsonb,
  behavior_config JSONB NOT NULL DEFAULT '{"deductAbsent": 5, "deductLate": 2, "deductMissing": 2, "deductLateSubmission": 1}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_classrooms
BEFORE UPDATE ON classrooms
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- 2. STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_code TEXT NOT NULL,
  prefix TEXT, -- เด็กชาย, เด็กหญิง, นาย, นางสาว, etc.
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (classroom_id, student_code)
);

CREATE TRIGGER set_timestamp_students
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- 3. ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'late', 'sick', 'absent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (student_id, session_date)
);

CREATE TRIGGER set_timestamp_attendance
BEFORE UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- 4. ASSIGNMENTS
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade_component TEXT NOT NULL, -- 'attendance', 'homework', 'midterm', 'final'
  max_score NUMERIC NOT NULL CHECK (max_score > 0),
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('score', 'check')),
  assignment_weight NUMERIC DEFAULT 100 NOT NULL, -- Used only in 'manual' grading weight mode
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TRIGGER set_timestamp_assignments
BEFORE UPDATE ON assignments
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- 5. STUDENT SCORES
CREATE TABLE IF NOT EXISTS student_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  is_late BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (student_id, assignment_id)
);

CREATE TRIGGER set_timestamp_student_scores
BEFORE UPDATE ON student_scores
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- 6. AI REPORTS
CREATE TABLE IF NOT EXISTS ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  performance_summary TEXT NOT NULL,
  strengths TEXT NOT NULL,
  weaknesses TEXT NOT NULL,
  recommendations TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (student_id)
);

CREATE TRIGGER set_timestamp_ai_reports
BEFORE UPDATE ON ai_reports
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- ROW LEVEL SECURITY (RLS) SETUP

ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

-- 1. Classrooms Policies
CREATE POLICY "Teachers can perform all actions on their own classrooms" 
  ON classrooms 
  FOR ALL 
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- 2. Students Policies
CREATE POLICY "Teachers can perform all actions on students in their classrooms"
  ON students
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classrooms 
      WHERE classrooms.id = students.classroom_id AND classrooms.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classrooms 
      WHERE classrooms.id = students.classroom_id AND classrooms.teacher_id = auth.uid()
    )
  );

-- 3. Attendance Policies
CREATE POLICY "Teachers can perform all actions on attendance in their classrooms"
  ON attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classrooms 
      WHERE classrooms.id = attendance.classroom_id AND classrooms.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classrooms 
      WHERE classrooms.id = attendance.classroom_id AND classrooms.teacher_id = auth.uid()
    )
  );

-- 4. Assignments Policies
CREATE POLICY "Teachers can perform all actions on assignments in their classrooms"
  ON assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classrooms 
      WHERE classrooms.id = assignments.classroom_id AND classrooms.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classrooms 
      WHERE classrooms.id = assignments.classroom_id AND classrooms.teacher_id = auth.uid()
    )
  );

-- 5. Student Scores Policies
CREATE POLICY "Teachers can perform all actions on student scores in their classrooms"
  ON student_scores
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN classrooms c ON c.id = s.classroom_id
      WHERE s.id = student_scores.student_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      JOIN classrooms c ON c.id = s.classroom_id
      WHERE s.id = student_scores.student_id AND c.teacher_id = auth.uid()
    )
  );

-- 6. AI Reports Policies
CREATE POLICY "Teachers can perform all actions on AI reports in their classrooms"
  ON ai_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN classrooms c ON c.id = s.classroom_id
      WHERE s.id = ai_reports.student_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      JOIN classrooms c ON c.id = s.classroom_id
      WHERE s.id = ai_reports.student_id AND c.teacher_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_classroom ON students(classroom_id);
CREATE INDEX IF NOT EXISTS idx_attendance_classroom_student ON attendance(classroom_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_classroom ON attendance(classroom_id);
CREATE INDEX IF NOT EXISTS idx_assignments_classroom ON assignments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_student_scores_student ON student_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_student_scores_assignment ON student_scores(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_student ON ai_reports(student_id);
