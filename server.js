const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let players = [];  // Armazenar os jogadores
let boardState = ['', '', '', '', '', '', '', '', '']; // Estado do tabuleiro
let currentPlayer = ''; // Jogador atual (escolhido aleatoriamente)
let score = { X: 0, O: 0 }; // Pontuação de cada jogador

// Servir arquivos estáticos
app.use(express.static('public'));

// Iniciar o servidor
server.listen(3000, () => {
  console.log('Servidor rodando http://localhost:3000');
});

// Quando um jogador se conecta
io.on('connection', (socket) => {
  console.log('Novo jogador conectado: ' + socket.id);

  // Se houver menos de 2 jogadores, permitir conexão
  if (players.length < 2) {
    players.push(socket);

    // Atribui o símbolo "X" ou "O" ao jogador
    const playerSymbol = players.length === 1 ? 'X' : 'O';
    socket.emit('set-symbol', playerSymbol);

    // Quando o segundo jogador se conectar, iniciar o jogo
    if (players.length === 2) {
      // Escolher aleatoriamente quem começa
      currentPlayer = Math.random() > 0.5 ? 'X' : 'O';
      io.emit('game-start', `O jogador ${currentPlayer} vai começar!`);
      io.emit('turn', `É a vez do jogador ${currentPlayer}`);
    }
  } else {
    // Se já tiver 2 jogadores, desconectar o jogador extra
    socket.emit('game-start', 'Desculpe, a partida já começou.');
    socket.disconnect();
  }

  // Quando um jogador faz um movimento
  socket.on('make-move', (data) => {
    const { player, index } = data;

    if (boardState[index] === '' && player === currentPlayer) {
      boardState[index] = player;
      currentPlayer = player === 'X' ? 'O' : 'X'; // Alterna o jogador
      io.emit('move-made', { player, index });
      io.emit('turn', `É a vez do jogador ${currentPlayer}`); // Exibir quem é a vez

      // Checar se alguém ganhou ou se o tabuleiro está cheio
      checkGameStatus();
    }
  });

  // Quando o jogador desconecta
  socket.on('disconnect', () => {
    console.log('Jogador desconectado: ' + socket.id);
    // Resetar o jogo se um jogador desconectar
    players = [];
    boardState = ['', '', '', '', '', '', '', '', ''];
    io.emit('game-reset', 'O jogo foi reiniciado!');
  });
});

// Função para checar o status do jogo
function checkGameStatus() {
  // Checar combinações de vitória
  const winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  for (const [a, b, c] of winningCombinations) {
    if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
      score[boardState[a]]++;  // Incrementar a pontuação do vencedor
      io.emit('game-over', `Jogador ${boardState[a]} venceu! Pontuação - X: ${score.X}, O: ${score.O}`);
      resetGame();
      return;
    }
  }

  // Checar empate
  if (!boardState.includes('')) {
    io.emit('game-over', 'Empate!');
    resetGame();
  }
}

// Função para reiniciar o jogo
function resetGame() {
  boardState = ['', '', '', '', '', '', '', '', ''];
  currentPlayer = Math.random() > 0.5 ? 'X' : 'O'; // Escolher aleatoriamente o próximo jogador
  io.emit('game-reset', 'O jogo foi reiniciado!');
  io.emit('turn', `É a vez do jogador ${currentPlayer}`);
}
