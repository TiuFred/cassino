// server.js
const express = require("express");
const http = require("http");
const socketio = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Serve os arquivos estáticos da pasta "public"
app.use(express.static("public"));

// Estado simples do jogo: saldos, apostas e nicknames de cada jogador
let saldos = {};       // Exemplo: { socketId: 100 }
let apostas = {};      // Exemplo: { socketId: [ { bet: '3', amount: 5 }, ... ] }
let nicknames = {};    // Exemplo: { socketId: "nomeDoJogador" }

io.on("connection", (socket) => {
  console.log("Novo jogador conectado:", socket.id);
  
  // Inicializa o saldo do jogador com 100 fichas
  saldos[socket.id] = 100;

  // Evento para definir o nickname do jogador
  socket.on("setNickname", (nickname) => {
    nicknames[socket.id] = nickname;
    // Emite a lista de jogadores atualizada para todos
    io.emit("playersList", getPlayersList());
    console.log(`Jogador ${socket.id} definiu nickname: ${nickname}`);
  });

  // Evento para receber uma aposta do cliente
  // Formato esperado: { bet: 'valor', amount: número }
  socket.on("apostar", (dados) => {
    if (!apostas[socket.id]) {
      apostas[socket.id] = [];
    }
    apostas[socket.id].push(dados);
    console.log(`Jogador ${socket.id} apostou`, dados);
  });

  // Evento para girar a roleta (pode ser iniciado por qualquer jogador)
  socket.on("girar", () => {
    // Sorteia um número entre 0 e 36
    const numeroSorteado = Math.floor(Math.random() * 37);
    console.log(`Número sorteado: ${numeroSorteado}`);

    // Para cada jogador, calcula os ganhos baseados nas apostas realizadas
    for (const id in apostas) {
      let ganhoTotal = 0;
      let totalApostado = apostas[id].reduce((acc, aposta) => acc + aposta.amount, 0);
      apostas[id].forEach((aposta) => {
        // Exemplo: se a aposta for exatamente igual ao número sorteado, o jogador ganha 35:1
        if (parseInt(aposta.bet) === numeroSorteado) {
          ganhoTotal += aposta.amount * 35;
        }
        // Aqui você pode expandir a lógica para outras modalidades (cor, par/ímpar, dúzias, etc.)
      });
      // Atualiza o saldo do jogador: subtrai o total apostado e soma o ganho
      saldos[id] -= totalApostado;
      saldos[id] += ganhoTotal;
    }
    
    // Emite o resultado para todos os clientes conectados
    io.emit("resultado", {
      numeroSorteado,
      saldos,
      apostas
    });
    
    // Limpa as apostas após o giro
    apostas = {};
  });

  // Quando o jogador se desconecta, remove seu estado e atualiza a lista de jogadores
  socket.on("disconnect", () => {
    console.log("Jogador desconectado:", socket.id);
    delete saldos[socket.id];
    delete apostas[socket.id];
    delete nicknames[socket.id];
    io.emit("playersList", getPlayersList());
  });
});

// Função para montar a lista de jogadores com seus nicknames e saldos
function getPlayersList() {
  let players = [];
  for (let id in nicknames) {
    players.push({ nickname: nicknames[id], saldo: saldos[id] });
  }
  return players;
}

server.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
