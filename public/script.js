// Conecta ao servidor via Socket.IO
const socket = io();

// Elementos da interface
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const startBtn = document.getElementById('start-btn');
const aiBtn = document.getElementById('ai-btn');
const menuBtn = document.getElementById('menu-btn');
const soundToggle = document.getElementById('sound-toggle');
const boardElement = document.getElementById('board');
const scoreX = document.getElementById('scoreX');
const scoreO = document.getElementById('scoreO');
const turnDisplay = document.getElementById('turn');
const playerTitle = document.getElementById('player-title');
const cells = []; // Armazena as 9 células do tabuleiro

// Variáveis de estado
let playerSymbol = '';       // 'X' ou 'O' para o jogador
let isAgainstAI = false;     // Indica se o jogo é contra a IA
let soundEnabled = true;     // Habilita/desabilita som
let gameActive = false;      // Indica se o jogo está em andamento

// Inicializa o jogo e cria o tabuleiro
function initGame() {
  boardElement.innerHTML = ''; // Limpa o tabuleiro anterior
  cells.length = 0;

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;
    cell.tabIndex = 0;

    // Clique ou tecla Enter/Espaço faz a jogada
    cell.addEventListener('click', () => makeMove(i));
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        makeMove(i);
      }
    });

    cells.push(cell);
    boardElement.appendChild(cell);
  }

  // Mostra a tela do jogo
  gameScreen.style.display = 'flex';
  menuScreen.style.display = 'none';
  gameActive = true;
}

// Função que realiza a jogada
function makeMove(index) {
  if (!gameActive) return; // Se o jogo estiver parado, ignora
  if (cells[index].classList.contains('x') || cells[index].classList.contains('o')) return; // Célula já ocupada

  if (!isAgainstAI) {
    // Envia a jogada ao servidor no modo multiplayer
    socket.emit('make-move', { player: playerSymbol, index });
  } else {
    // Modo IA: jogador é sempre 'x', IA é 'o'
    cells[index].classList.add('x');
    if (soundEnabled) playSound('move');
    checkGameStatus();

    // Se o jogo ainda estiver ativo, IA joga após 500ms
    if (gameActive) {
      setTimeout(() => {
        const emptyCells = cells
          .map((cell, idx) => ({ cell, idx }))
          .filter(item => !item.cell.classList.contains('x') && !item.cell.classList.contains('o'));

        if (emptyCells.length > 0) {
          const randomIndex = Math.floor(Math.random() * emptyCells.length);
          const aiMove = emptyCells[randomIndex].idx;
          cells[aiMove].classList.add('o');
          if (soundEnabled) playSound('move');
          checkGameStatus();
        }
      }, 500);
    }
  }
}

// Verifica se há vitória ou empate
function checkGameStatus() {
  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
    [0, 4, 8], [2, 4, 6]             // Diagonais
  ];

  for (const combo of winningCombinations) {
    const [a, b, c] = combo;
    if (cells[a].classList.contains('x') && cells[b].classList.contains('x') && cells[c].classList.contains('x')) {
      endGame('X WINS!');
      return;
    }
    if (cells[a].classList.contains('o') && cells[b].classList.contains('o') && cells[c].classList.contains('o')) {
      endGame('O WINS!');
      return;
    }
  }

  // Se todas as células estiverem preenchidas e ninguém venceu
  if ([...cells].every(cell => cell.classList.contains('x') || cell.classList.contains('o'))) {
    endGame('DRAW!');
  }
}

// Finaliza o jogo com a mensagem de vitória ou empate
function endGame(message) {
  gameActive = false;
  if (soundEnabled) {
    playSound(message.includes('WINS') ? 'win' : 'draw');
  }
  alert(message);

  // Atualiza placar conforme resultado
  if (message.includes('X WINS')) {
    scoreX.innerText = `PLAYER 1: ${parseInt(scoreX.innerText.split(': ')[1]) + 1}`;
  } else if (message.includes('O WINS')) {
    scoreO.innerText = `PLAYER 2: ${parseInt(scoreO.innerText.split(': ')[1]) + 1}`;
  }

  // Reinicia o tabuleiro após 1s
  setTimeout(resetBoard, 1000);
}

// Reinicia o tabuleiro para nova rodada
function resetBoard() {
  cells.forEach(cell => {
    cell.classList.remove('x', 'o');
  });

  if (isAgainstAI) {
    gameActive = true;
  } else {
    socket.emit('request-reset'); // Solicita novo jogo ao servidor
  }
}

// Reproduz efeitos sonoros para ações específicas
function playSound(type) {
  if (!soundEnabled) return;

  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    let frequency = 440;
    let duration = 0.1;

    switch (type) {
      case 'move':
        frequency = 220 + Math.random() * 440;
        duration = 0.05;
        break;
      case 'win':
        frequency = 880;
        duration = 0.3;
        break;
      case 'draw':
        frequency = 220;
        duration = 0.5;
        break;
      case 'start':
        frequency = 523.25;
        duration = 0.2;
        break;
      case 'reset':
        frequency = 261.63;
        duration = 0.2;
        break;
    }

    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.log('Audio error:', e);
  }
}

// Botão: iniciar jogo multiplayer
startBtn.addEventListener('click', () => {
  isAgainstAI = false;
  initGame();
  socket.emit('request-symbol'); // Pede símbolo ao servidor
});

// Botão: iniciar jogo contra IA
aiBtn.addEventListener('click', () => {
  isAgainstAI = true;
  initGame();
  playerSymbol = 'X'; // Jogador é sempre X contra IA
  playerTitle.innerText = `PLAYER ${playerSymbol}`;
  if (soundEnabled) playSound('start');
});

// Botão: voltar ao menu
menuBtn.addEventListener('click', () => {
  gameScreen.style.display = 'none';
  menuScreen.style.display = 'flex';
  gameActive = false;
});

// Alternar som ligado/desligado
soundToggle.addEventListener('change', (e) => {
  soundEnabled = e.target.checked;
});

// === Eventos recebidos do servidor (modo multiplayer) ===

// Define o símbolo do jogador (X ou O)
socket.on('set-symbol', (symbol) => {
  playerSymbol = symbol;
  playerTitle.innerText = `PLAYER ${symbol}`;
  if (soundEnabled) playSound('start');
});

// Atualiza o tabuleiro com a jogada do adversário
socket.on('move-made', ({ player, index }) => {
  cells[index].classList.add(player.toLowerCase());
  if (soundEnabled) playSound('move');
});

// Final do jogo (modo multiplayer)
socket.on('game-over', (message) => {
  if (soundEnabled) playSound(message.includes('won') ? 'win' : 'draw');
  alert(message);

  if (message.includes('X won')) {
    scoreX.innerText = `PLAYER 1: ${parseInt(scoreX.innerText.split(': ')[1]) + 1}`;
  } else if (message.includes('O won')) {
    scoreO.innerText = `PLAYER 2: ${parseInt(scoreO.innerText.split(': ')[1]) + 1}`;
  }

  setTimeout(() => socket.emit('request-reset'), 1000);
});

// Servidor sinaliza que o jogo foi reiniciado
socket.on('game-reset', () => {
  if (soundEnabled) playSound('reset');
  cells.forEach(cell => {
    cell.classList.remove('x', 'o');
  });
  gameActive = true;
});

// Atualiza indicação de turno
socket.on('turn', (message) => {
  turnDisplay.innerText = message.toUpperCase();
});
