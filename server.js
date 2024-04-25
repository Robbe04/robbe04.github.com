const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Array om de berichten op te slaan
let messages = [];

// Socket.IO events
io.on("connection", (socket) => {
  console.log("A user connected");

  // Stuur de huidige berichten naar de verbonden client
  socket.emit("init", messages);

  // Luister naar berichten van de client
  socket.on("message", (message) => {
    // Voeg het bericht toe aan de array van berichten
    messages.push(message);
    // Stuur het bericht naar alle verbonden clients
    io.emit("message", message);
  });

  // Handel het ontkoppelen van de client af
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// Start de server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
