-- Create user
-- admin, secret
-- developer, letmein
-- bob, <shouldn't work>
WITH users_id AS (
  INSERT INTO users (username, password)
  VALUES
  ('admin', '$2b$10$uC3lSZqheRZja2B.jBA8q.2s3hkEviwTuRWdw36tngJBkm1i/Llo6'),
  ('developer', '$2b$10$RIwuQnP.NKc1gJ5Ef08.dOSX8ibuEnDMziqJGr925nRM0LRhvCFN.'),
  ('bob', 'knock-knock')
  RETURNING id
)

-- establish user details for future use
INSERT INTO users_current_details (user_id)
SELECT id FROM users_id;

SELECT 'User creation, DONE. user details setup, Done';