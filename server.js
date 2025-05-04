const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

let players = {};
let currentPlayer = 'X';
let board = ['', '', '', '', '', '', '', '', ''];
let gameActive = false;

io.on('connection', (socket) => {
  console.log('Novo jogador conectado');

  socket.on('request-symbol', () => {
    if (Object.keys(players).length < 2) {
      const symbol = Object.keys(players).length === 0 ? 'X' : 'O';
      players[socket.id] = symbol;
      socket.emit('set-symbol', symbol);
      
      if (Object.keys(players).length === 2) {
        gameActive = true;
        io.emit('turn', currentPlayer);
      }
    }
  });

  socket.on('make-move', ({ player, index }) => {
    if (!gameActive || player !== currentPlayer || board[index] !== '') return;
    
    board[index] = player;
    io.emit('move-made', { player, index });
    
    const winner = checkWinner();
    if (winner) {
      gameActive = false;
      io.emit('game-over', `${winner} won!`);
      resetGame();
    } else if (board.every(cell => cell !== '')) {
      gameActive = false;
      io.emit('game-over', 'Draw!');
      resetGame();
    } else {
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      io.emit('turn', currentPlayer);
    }
  });

  socket.on('request-reset', () => {
    resetGame(true);
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    if (Object.keys(players).length < 2) {
      resetGame();
    }
  });

  function checkWinner() {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    for (const [a, b, c] of winPatterns) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }

  function resetGame(immediate = false) {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    
    if (Object.keys(players).length === 2) {
      gameActive = true;
    }

    if (immediate) {
      io.emit('game-reset');
      if (gameActive) {
        io.emit('turn', currentPlayer);
      }
    } else {
      setTimeout(() => {
        io.emit('game-reset');
        if (gameActive) {
          io.emit('turn', currentPlayer);
        }
      }, 1000);
    }
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando http://localhost:3000`);
});