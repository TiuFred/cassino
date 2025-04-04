// server.js
const express = require("express");
const http = require("http");
const socketio = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Serve arquivos estáticos da pasta "public"
app.use(express.static("public"));

// Estados do jogo: saldos, apostas e nicknames
let saldos = {};    // Exemplo: { socketId: 100 }
let apostas = {};   // Exemplo: { socketId: [ { bet: 'valor', amount: X }, ... ] }
let nicknames = {}; // Exemplo: { socketId: "nickname" }

io.on("connection", (socket) => {
  console.log("Novo jogador conectado:", socket.id);
  saldos[socket.id] = 100;

  socket.on("setNickname", (nickname) => {
    nicknames[socket.id] = nickname;
    io.emit("playersList", getPlayersList());
    console.log(`Jogador ${socket.id} definiu nickname: ${nickname}`);
  });

  socket.on("apostar", (dados) => {
    if (!apostas[socket.id]) {
      apostas[socket.id] = [];
    }
    apostas[socket.id].push(dados);
    console.log(`Jogador ${socket.id} apostou`, dados);
  });

  socket.on("girar", () => {
    // Sorteia um número entre 0 e 36
    const numeroSorteado = Math.floor(Math.random() * 37);
    console.log(`Número sorteado: ${numeroSorteado}`);

    let winners = [];
    // Processa as apostas de cada jogador
    for (const id in apostas) {
      let ganhoTotal = 0;
      let totalApostado = apostas[id].reduce((acc, aposta) => acc + aposta.amount, 0);

      apostas[id].forEach((aposta) => {
        // Simples: se a aposta for exatamente igual ao número sorteado, ganha 35:1
        if (parseInt(aposta.bet) === numeroSorteado) {
          ganhoTotal += aposta.amount * 35;
        }
      });

      saldos[id] -= totalApostado;
      saldos[id] += ganhoTotal;
      if (ganhoTotal > 0) {
        winners.push(nicknames[id] || id);
      }
    }
    if (winners.length === 0) {
      winners.push("Ninguém");
    }

    io.emit("resultado", {
      numeroSorteado,
      saldos,
      winners,
      nextRoundIn: 20
    });
    io.emit("playersList", getPlayersList());
    apostas = {};
  });

  socket.on("disconnect", () => {
    console.log("Jogador desconectado:", socket.id);
    delete saldos[socket.id];
    delete apostas[socket.id];
    delete nicknames[socket.id];
    io.emit("playersList", getPlayersList());
  });
});

function getPlayersList() {
  let players = [];
  for (let id in nicknames) {
    players.push({ nickname: nicknames[id], saldo: saldos[id] });
  }
  return players;
}

server.listen(process.env.PORT || 3000, () => {
  console.log("Servidor rodando na porta 3000");
});
