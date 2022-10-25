CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    chat_id INT NOT NULL UNIQUE,
    email varchar(256) NOT NULL,
    password_hash TEXT NOT NULL
);