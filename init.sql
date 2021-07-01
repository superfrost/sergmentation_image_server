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

-- test data
-- INSERT OR IGNORE INTO images(id, file_name, date) VALUES(0, 'image-0000.jpg', '2021-06-16 14:00:00');
-- INSERT OR IGNORE INTO images(id, file_name, date) VALUES(1, 'image-0001.jpg', '2021-06-16 14:00:01');

-- INSERT OR IGNORE INTO result(id, image_id, options, file_name, date) VALUES(0, 0, '4', 'result-0000-4.jpg', '2021-06-16 14:00:01');
-- INSERT OR IGNORE INTO result(id, image_id, options, file_name, date) VALUES(1, 0, '8', 'result-0000-8.jpg', '2021-06-16 14:00:02');

-- INSERT OR IGNORE INTO result(id, image_id, options, file_name, date) VALUES(2, 1, '4', 'result-0001-4.jpg', '2021-06-16 14:00:03');
-- INSERT OR IGNORE INTO result(id, image_id, options, file_name, date) VALUES(3, 1, '8', 'result-0001-8.jpg', '2021-06-16 14:00:04');
