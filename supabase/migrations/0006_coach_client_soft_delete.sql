-- Step 5: Add coach_name, client_name (populated at processing_transcript),
-- and deleted_at for soft delete.

-- 1. New columns
ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS coach_name  TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- 2. Backfill existing runs by extracting the first two distinct speakers
--    from the transcript (same "first speaker = coach" heuristic the frontend
--    uses). Only targets rows that have a transcript and no coach_name yet.
DO $$
DECLARE
  r RECORD;
  lines TEXT[];
  line TEXT;
  m TEXT[];
  speaker TEXT;
  seen TEXT[] := '{}';
  coach TEXT;
  client TEXT;
BEGIN
  FOR r IN
    SELECT id, transcript FROM public.runs
    WHERE coach_name IS NULL AND transcript IS NOT NULL
  LOOP
    seen := '{}';
    coach := NULL;
    client := NULL;
    lines := string_to_array(r.transcript, E'\n');
    FOREACH line IN ARRAY lines
    LOOP
      m := regexp_match(line, '^\s*\[([^\]]+)\]\s*:');
      IF m IS NOT NULL THEN
        speaker := trim(m[1]);
        IF NOT seen @> ARRAY[speaker] THEN
          seen := array_append(seen, speaker);
        END IF;
        IF array_length(seen, 1) >= 2 THEN EXIT; END IF;
      END IF;
    END LOOP;
    coach := seen[1];
    client := seen[2];
    UPDATE public.runs SET coach_name = coach, client_name = client WHERE id = r.id;
  END LOOP;
END;
$$;

-- 3. RLS policy: anon can soft-delete (set deleted_at only, nothing else)
CREATE POLICY "anyone can soft-delete a run"
  ON public.runs FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (
    call_type        IS NOT DISTINCT FROM call_type
    AND status       IS NOT DISTINCT FROM status
    AND transcript   IS NOT DISTINCT FROM transcript
  );

-- 4. Index for filtering out soft-deleted rows efficiently
CREATE INDEX IF NOT EXISTS runs_deleted_at_idx ON public.runs (deleted_at)
  WHERE deleted_at IS NULL;
