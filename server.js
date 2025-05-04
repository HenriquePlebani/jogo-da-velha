// Importando as bibliotecas necessárias
const express = require('express'); // Framework para criar o servidor HTTP
const http = require('http'); // Módulo HTTP do Node.js
const socketIo = require('socket.io'); // Biblioteca para comunicação em tempo real via WebSockets
const path = require('path'); // Módulo para manipulação de caminhos de arquivos

// Inicializando a aplicação Express e o servidor HTTP
const app = express();
const server = http.createServer(app);
const io = socketIo(server); // Associando o Socket.IO ao servidor

// Definindo o diretório onde os arquivos estáticos serão servidos (como HTML, CSS e JS)
app.use(express.static(path.join(__dirname, 'public')));

// Variáveis de controle do jogo
let players = {}; // Objeto para armazenar os jogadores conectados, associando o ID do socket ao seu símbolo ('X' ou 'O')
let currentPlayer = 'X'; // Jogador atual, começa com 'X'
let board = ['', '', '', '', '', '', '', '', '']; // Tabuleiro do jogo (9 células)
let gameActive = false; // Flag para verificar se o jogo está em andamento

// Evento que lida com a conexão de novos jogadores
io.on('connection', (socket) => {
  console.log('Novo jogador conectado');

  // Evento para definir o símbolo ('X' ou 'O') para o jogador que se conecta
  socket.on('request-symbol', () => {
    if (Object.keys(players).length < 2) {
      const symbol = Object.keys(players).length === 0 ? 'X' : 'O'; // 'X' é atribuído ao primeiro jogador, 'O' ao segundo
      players[socket.id] = symbol; // Associa o símbolo ao jogador
      socket.emit('set-symbol', symbol); // Envia o símbolo para o jogador

      // Quando dois jogadores se conectam, o jogo começa e a vez de jogar é de 'X'
      if (Object.keys(players).length === 2) {
        gameActive = true; // O jogo começa
        io.emit('turn', currentPlayer); // Inicia a vez de 'X'
      }
    }
  });

  // Evento que lida com a jogada de um jogador
  socket.on('make-move', ({ player, index }) => {
    // Se o jogo não estiver ativo, se a jogada não for do jogador atual, ou se a célula já foi preenchida, a jogada é ignorada
    if (!gameActive || player !== currentPlayer || board[index] !== '') return;

    board[index] = player; // Atualiza o tabuleiro com a jogada
    io.emit('move-made', { player, index }); // Informa aos outros jogadores sobre a jogada

    // Verifica se há um vencedor após a jogada
    const winner = checkWinner();
    if (winner) {
      gameActive = false; // Fim de jogo
      io.emit('game-over', `${winner} won!`); // Informa quem venceu
      resetGame(); // Reseta o jogo
    } else if (board.every(cell => cell !== '')) { // Verifica se houve empate
      gameActive = false;
      io.emit('game-over', 'Draw!'); // Informa empate
      resetGame(); // Reseta o jogo
    } else {
      // Caso contrário, muda a vez para o outro jogador
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      io.emit('turn', currentPlayer); // Informa aos jogadores quem é o próximo
    }
  });

  // Evento para reiniciar o jogo
  socket.on('request-reset', () => {
    resetGame(true); // Reinicia o jogo imediatamente
  });

  // Evento que lida com a desconexão de um jogador
  socket.on('disconnect', () => {
    delete players[socket.id]; // Remove o jogador desconectado
    if (Object.keys(players).length < 2) {
      resetGame(); // Se um jogador desconectar, reinicia o jogo
    }
  });

  // Função que verifica se há um vencedor
  function checkWinner() {
    // Padrões de vitória (linhas, colunas e diagonais)
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
      [0, 4, 8], [2, 4, 6]             // Diagonais
    ];

    // Verifica se algum padrão de vitória foi alcançado
    for (const [a, b, c] of winPatterns) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]; // Retorna o vencedor ('X' ou 'O')
      }
    }
    return null; // Não há vencedor
  }

  // Função para reiniciar o jogo
  function resetGame(immediate = false) {
    board = ['', '', '', '', '', '', '', '', '']; // Limpa o tabuleiro
    currentPlayer = 'X'; // Redefine o jogador 'X' para a próxima partida
    
    if (Object.keys(players).length === 2) {
      gameActive = true; // O jogo recomeça com dois jogadores
    }

    // Envia a atualização do jogo para os jogadores
    if (immediate) {
      io.emit('game-reset'); // Reinicia imediatamente
      if (gameActive) {
        io.emit('turn', currentPlayer); // Inicia a vez de 'X'
      }
    } else {
      // Faz uma pequena pausa antes de reiniciar
      setTimeout(() => {
        io.emit('game-reset'); // Reinicia o jogo após um tempo
        if (gameActive) {
          io.emit('turn', currentPlayer); // Inicia a vez de 'X'
        }
      }, 1000);
    }
  }
});

// Configura a porta do servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando http://localhost:${PORT}`);
});
