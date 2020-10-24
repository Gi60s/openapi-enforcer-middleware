-- Use the event_source database
\c demo;

-- This table keeps track of all valid events that have occurred
CREATE TABLE IF NOT EXISTS tasks (
 id SERIAL PRIMARY KEY,
 title VARCHAR (256) NOT NULL,
 completed BOOLEAN DEFAULT FALSE,
 due TIMESTAMPTZ NOT NULL
);

INSERT INTO tasks (title, completed, due) VALUES ('My First Task', FALSE, '2020-01-02 04:05:06 +0:00');
INSERT INTO tasks (title, completed, due) VALUES ('My Second Task', FALSE, '2020-01-02 04:05:06 +0:00');