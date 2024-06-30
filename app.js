const express = require("express");
const socketIO = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const chess = new Chess();
let players = { white: null, black: null };

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index");
});

io.on("connection", function (socket) {
  console.log("A user connected:", socket.id);

  
  if (!players.white) {
    players.white = socket.id;
    socket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = socket.id;
    socket.emit("playerRole", "b");
  } else {
    socket.emit("spectatorRole");
  }


  socket.on("disconnect", function () {
    console.log("A user disconnected:", socket.id);
    if (socket.id === players.white) {
      players.white = null;
    } else if (socket.id === players.black) {
      players.black = null;
    }
  });

  socket.on("newGame", () => {
    chess.reset();
    players = { white: null, black: null };

    const sockets = Array.from(io.sockets.sockets.values());
    for (let socket of sockets) {
      if (!players.white) {
        players.white = socket.id;
        socket.emit("playerRole", "w");
      } else if (!players.black) {
        players.black = socket.id;
        socket.emit("playerRole", "b");
      } else {
        socket.emit("spectatorRole");
      }
    }

    io.emit("boardState", chess.fen());
    io.emit("newGameStarted");
  }); 

  socket.on("move", (move) => {
    try {
      
      if (
        (chess.turn() === "w" && socket.id !== players.white) ||
        (chess.turn() === "b" && socket.id !== players.black)
      ) {
        return;
      }
      const result = chess.move(move);
      if (result) {
        io.emit("move", move);
        io.emit("boardState", chess.fen());

        if (chess.isCheckmate()) {
          const winner = chess.turn() === "w" ? "Black" : "White";
          io.emit("gameOver", `Checkmate! ${winner} wins.`);
        }
      } else {
        console.log("Invalid move:", move);
        const error = new Error("Invalid Move"); 
        socket.emit("moveError", error); 
      }
    } catch (err) {
      console.error("Move validation error:", err);
      socket.emit("moveError", err); 
    }
  });
});

server.listen(3000, () => {
  console.log("Server is listening on port 3000");
});
