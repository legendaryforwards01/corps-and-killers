const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let jogadores = {};

io.on('connection', (socket) => {
    console.log(`Jogador conectado: ${socket.id}`);

    jogadores[socket.id] = {
        id: socket.id,
        x: 300,
        y: 200,
        tamanho: 25,
        velocidade: 4,
        cor: '#00ffcc'
    };

    io.emit('atualizar_jogadores', jogadores);

    socket.on('movimento', (dados) => {
        if (jogadores[socket.id]) {
            jogadores[socket.id].x = dados.x;
            jogadores[socket.id].y = dados.y;
            io.emit('atualizar_jogadores', jogadores);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Jogador desconectado: ${socket.id}`);
        delete jogadores[socket.id];
        io.emit('atualizar_jogadores', jogadores);
    });
});

http.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});