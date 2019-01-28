-- Use the event_source database
\c demo;

-- This table keeps track of all valid events that have occurred
CREATE TABLE IF NOT EXISTS tasks (
 index SERIAL PRIMARY KEY,
 title VARCHAR (256) NOT NULL,
 completed BOOLEAN DEFAULT FALSE,
 due TIMESTAMPZ NOT NULL
);