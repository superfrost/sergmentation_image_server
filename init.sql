CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY NOT NULL,
  file_name TEXT NOT NULL,
  date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS result (
  id INTEGER PRIMARY KEY NOT NULL,
  image_id INTEGER NOT NULL REFERENCES images(id),
  options TEXT NOT NULL,
  file_name TEXT NOT NULL,
  date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS favorite (
  id INTEGER PRIMARY KEY NOT NULL,
  image_id INTEGER NOT NULL REFERENCES images(id),
  user_id INTEGER NOT NULL REFERENCES users(id)
);

-- test data
-- admin password: 1234
-- guest password: 0000
INSERT OR IGNORE INTO users(id, username, password, role) VALUES(1, 'admin', '$2b$12$aC8FNIeznOUVhNO65bvsw.Eu29.jW6dWyLsrJ0Lxj1u9/mn2XYD7.', 1);
INSERT OR IGNORE INTO users(id, username, password, role) VALUES(2, 'guest', '$2b$12$fYMAKq.loh.tIMi4xDecB.eFjjJEcw8lCgopHhy3wLIpTiXD1fv7.', 0);
