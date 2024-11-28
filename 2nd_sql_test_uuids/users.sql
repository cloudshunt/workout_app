-- Create user

WITH users_id AS (
  INSERT INTO users (username, password)
  VALUES
  ('admin', 'secret'),
  ('bob', 'secret')
  RETURNING id
)

-- establish user details for future use
INSERT INTO users_current_details (user_id)
SELECT id FROM users_id;

SELECT 'User creation, DONE. user details setup, Done';