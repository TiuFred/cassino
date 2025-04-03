// server.js
const express = require("express");
const http = require("http");
const socketio = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Serve os arquivos estáticos da pasta "public"
app.use(express.static("public"));

// Estado do jogo: saldos, apostas e nicknames
let saldos = {};    // Ex: { socketId: 100 }
let apostas = {};   // Ex: { socketId: [ { bet: 'valor', amount: X }, ... ] }
let nicknames = {}; // Ex: { socketId: "nickname" }

io.on("connection", (socket) => {
  console.log("Novo jogador conectado:", socket.id);
  saldos[socket.id] = 100;

  // Define o nickname do jogador
  socket.on("setNickname", (nickname) => {
    nicknames[socket.id] = nickname;
    io.emit("playersList", getPlayersList());
    console.log(`Jogador ${socket.id} definiu nickname: ${nickname}`);
  });

  // Recebe as apostas do jogador
  socket.on("apostar", (dados) => {
    if (!apostas[socket.id]) {
      apostas[socket.id] = [];
    }
    apostas[socket.id].push(dados);
    console.log(`Jogador ${socket.id} apostou`, dados);
  });

  // Evento para girar a roleta
  socket.on("girar", () => {
    // Sorteia um número de 0 a 36
    const numeroSorteado = Math.floor(Math.random() * 37);
    console.log(`Número sorteado: ${numeroSorteado}`);

    let winners = [];
    // Processa as apostas de cada jogador
    for (const id in apostas) {
      let ganhoTotal = 0;
      let totalApostado = apostas[id].reduce((acc, aposta) => acc + aposta.amount, 0);

      // Verifica cada aposta do jogador
      apostas[id].forEach((aposta) => {
        // Exemplo simples: se a aposta for exatamente igual ao número sorteado, ganha 35:1
        if (parseInt(aposta.bet) === numeroSorteado) {
          ganhoTotal += aposta.amount * 35;
        }
        // Aqui você pode expandir a lógica para outras apostas (cor, par/ímpar, dúzias, etc.)
      });
      // Atualiza o saldo do jogador
      saldos[id] -= totalApostado;
      saldos[id] += ganhoTotal;
      if (ganhoTotal > 0) {
        winners.push(nicknames[id] || id);
      }
    }

    // Se ninguém ganhou, define "Ninguém"
    if (winners.length === 0) {
      winners.push("Ninguém");
    }

    // Emite o resultado para todos os jogadores, incluindo:
    // - numeroSorteado
    // - saldos atualizados
    // - winners: array com os nicknames dos vencedores
    // - nextRoundIn: tempo para o próximo giro (20 segundos)
    io.emit("resultado", {
      numeroSorteado,
      saldos,
      winners,
      nextRoundIn: 20
    });

    // Emite a lista atualizada de jogadores
    io.emit("playersList", getPlayersList());

    // Reinicia as apostas para a próxima rodada
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

// Função para montar a lista de jogadores
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
