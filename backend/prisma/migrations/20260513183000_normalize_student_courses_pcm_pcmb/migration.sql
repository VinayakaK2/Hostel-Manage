-- Map legacy / non-PU course labels to PCM (class 11) or PCMB (class 12).
-- Already-normalized rows are left unchanged.
UPDATE "students"
SET "course" = CASE WHEN "class_year" = 12 THEN 'PCMB' ELSE 'PCM' END
WHERE lower(trim("course")) NOT IN ('pcm', 'pcmb');
