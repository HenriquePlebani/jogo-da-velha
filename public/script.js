document.addEventListener("DOMContentLoaded", function() {
    const board = document.getElementById('board');
    const status = document.getElementById('status');
    const socket = io();
    let currentPlayer = '';
    let boardState = ['', '', '', '', '', '', '', '', '']; // Estado do tabuleiro
  
    // Função para criar o tabuleiro
    function createBoard() {
      board.innerHTML = ''; // Limpa o tabuleiro
      for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.dataset.index = i;
        cell.addEventListener('click', () => makeMove(i));
        board.appendChild(cell);
      }
    }
  
    // Função para fazer o movimento
    function makeMove(index) {
      if (boardState[index] === '' && currentPlayer !== '') {
        boardState[index] = currentPlayer;
        socket.emit('make-move', { player: currentPlayer, index });
      }
    }
  
    // Atualiza o tabuleiro quando um movimento é feito
    socket.on('move-made', (data) => {
      boardState[data.index] = data.player;
      updateBoard();
    });
  
    // Atualiza a interface do tabuleiro
    function updateBoard() {
      const cells = board.querySelectorAll('div');
      cells.forEach((cell, index) => {
        cell.textContent = boardState[index];
      });
    }
  
    // Recebe o símbolo do jogador ("X" ou "O")
    socket.on('set-symbol', (symbol) => {
      currentPlayer = symbol;
      if (symbol === 'X') {
        status.textContent = 'Você é o jogador "X".';
      } else {
        status.textContent = 'Você é o jogador "O".';
      }
    });
  
    // Inicia o jogo
    socket.on('game-start', (message) => {
      status.textContent = message;
      createBoard();
    });
  
    // Exibe o status final (vencedor ou empate)
    socket.on('game-over', (message) => {
      status.textContent = message;
      boardState = ['', '', '', '', '', '', '', '', ''];
      createBoard();
    });
  
    // Cria o tabuleiro inicial
    createBoard();
  });
  