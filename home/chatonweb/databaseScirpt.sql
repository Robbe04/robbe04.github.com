CREATE DATABASE IF NOT EXISTS messenger;

USE messenger;

CREATE TABLE IF NOT EXISTS messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    message_text VARCHAR(255)
);

INSERT INTO messages (message_text) VALUES ("Mijn 1e bericht in het messenger platform");

SELECT * FROM messages;