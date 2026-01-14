-- Add Tips, Men, and Lady tee box ratings to courses table
-- Tips = back tees, Men = middle tees, Lady = forward tees

ALTER TABLE courses ADD COLUMN IF NOT EXISTS tips_course_rating NUMERIC(4,1);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS tips_slope_rating NUMERIC(4,1);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS men_course_rating NUMERIC(4,1);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS men_slope_rating NUMERIC(4,1);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS lady_course_rating NUMERIC(4,1);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS lady_slope_rating NUMERIC(4,1);

-- Migrate existing data to tips ratings (assuming existing ratings were for tips/back tees)
UPDATE courses 
SET tips_course_rating = course_rating, 
    tips_slope_rating = slope_rating 
WHERE course_rating IS NOT NULL OR slope_rating IS NOT NULL;

COMMENT ON COLUMN courses.tips_course_rating IS 'Course rating for Tips (back) tees';
COMMENT ON COLUMN courses.tips_slope_rating IS 'Slope rating for Tips (back) tees';
COMMENT ON COLUMN courses.men_course_rating IS 'Course rating for Men (middle) tees';
COMMENT ON COLUMN courses.men_slope_rating IS 'Slope rating for Men (middle) tees';
COMMENT ON COLUMN courses.lady_course_rating IS 'Course rating for Lady (forward) tees';
COMMENT ON COLUMN courses.lady_slope_rating IS 'Slope rating for Lady (forward) tees';
