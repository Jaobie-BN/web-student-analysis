-- =========================================================
-- LINE Bot & LIFF Support Extension for Student Analytics
-- Run this in your Supabase SQL Editor
-- =========================================================

-- 1. Add room_code to classrooms
ALTER TABLE classrooms 
ADD COLUMN IF NOT EXISTS room_code VARCHAR(10) UNIQUE;

-- Function to generate 6-character uppercase alphanumeric room code
CREATE OR REPLACE FUNCTION generate_room_code() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.room_code IS NULL OR NEW.room_code = '' THEN
    NEW.room_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_room_code_trigger ON classrooms;
CREATE TRIGGER set_room_code_trigger
BEFORE INSERT ON classrooms
FOR EACH ROW
EXECUTE FUNCTION generate_room_code();

-- Populate existing classrooms if they lack room_code
UPDATE classrooms 
SET room_code = UPPER(SUBSTRING(MD5(id::TEXT) FROM 1 FOR 6)) 
WHERE room_code IS NULL OR room_code = '';

CREATE INDEX IF NOT EXISTS idx_classrooms_room_code ON classrooms(room_code);

-- 2. Create student_line_accounts table
CREATE TABLE IF NOT EXISTS student_line_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  display_name TEXT,
  picture_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (classroom_id, student_id),
  UNIQUE (line_user_id, classroom_id)
);

CREATE INDEX IF NOT EXISTS idx_line_accounts_user ON student_line_accounts(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_accounts_student ON student_line_accounts(student_id);
CREATE INDEX IF NOT EXISTS idx_line_accounts_classroom ON student_line_accounts(classroom_id);

-- Enable RLS
ALTER TABLE student_line_accounts ENABLE ROW LEVEL SECURITY;

-- Teachers can view line bindings in their classrooms
DROP POLICY IF EXISTS "Teachers can view line bindings for their classrooms" ON student_line_accounts;
CREATE POLICY "Teachers can view line bindings for their classrooms"
  ON student_line_accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classrooms 
      WHERE classrooms.id = student_line_accounts.classroom_id AND classrooms.teacher_id = auth.uid()
    )
  );

-- Teachers can unlink/delete line bindings in their classrooms
DROP POLICY IF EXISTS "Teachers can unlink line bindings in their classrooms" ON student_line_accounts;
CREATE POLICY "Teachers can unlink line bindings in their classrooms"
  ON student_line_accounts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classrooms 
      WHERE classrooms.id = student_line_accounts.classroom_id AND classrooms.teacher_id = auth.uid()
    )
  );
