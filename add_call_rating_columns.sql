-- Add rating and reason columns to call_records table
ALTER TABLE call_records 
ADD COLUMN IF NOT EXISTS rating VARCHAR(20),
ADD COLUMN IF NOT EXISTS rating_reason TEXT;

-- Add index on rating for filtering
CREATE INDEX IF NOT EXISTS idx_call_records_rating ON call_records(rating);

-- Add comment for documentation
COMMENT ON COLUMN call_records.rating IS 'Call outcome rating: WON, NEXT_STEP, LOST, NO_RESULT';
COMMENT ON COLUMN call_records.rating_reason IS 'AI-generated explanation for the rating';
