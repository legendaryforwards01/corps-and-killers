const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// lista de jogadores logados no server
let jogadores = {};

const nomesPossiveis = [
    ['Maçã', 'Banana', 'Uva', 'Pêssego', 'Morango', 'Kiwi', 'Manga', 'Abacaxi', 'Pêra', 'Abacate', 'Melancia', 'Goiaba'],
    ['Vermelho', 'Amarelo', 'Verde', 'Rosa', 'Roxo', 'Azul', 'Branco', 'Preto', 'Cinza', 'Laranja', 'Bege', 'Ciano'],
    ['China', 'Rússia', 'ìndia', 'Austrália', 'Alemanha', 'Japão', 'México', 'Argentina', 'Brasil', 'Espanha', 'Itália', 'França'],
    ['Cachorro', 'Gato', 'Leão', 'Elefante', 'Girafa', 'Macaco', 'Cavalo', 'Cobra', 'Vaca', 'Porco', 'Peixe', 'Ovelha']
]

// pega uma lista aleatória dentro das opções
const listaSorteada = nomesPossiveis[Math.floor(Math.random() * nomesPossiveis.length)];

function gerarNomeAleatorio(){
    const indiceSorteado = Math.floor(Math.random() * listaSorteada.length);
    const [nomeSorteado] = listaSorteada.splice(indiceSorteado, 1);
    return nomeSorteado;
}

// cria um jogador a cada conexão no servidor
io.on('connection', (socket) => {
    console.log(`Jogador conectado: ${socket.id}`);
    jogadores[socket.id] = {
        nome: gerarNomeAleatorio(),
        id: socket.id,
        x: 300,
        y: 200,
        tamanho: 25,
        velocidade: 250,
        cor: '#00ffcc'
    };

    // atualiza a quantidade de jogadores
    io.emit('atualizar_jogadores', jogadores);

    // atualiza o movimento para os outros jogadores
    socket.on('movimento', (dados) => {
        if (jogadores[socket.id]) {
            jogadores[socket.id].x = dados.x;
            jogadores[socket.id].y = dados.y;
            io.emit('atualizar_jogadores', jogadores);
        }
    });

    // atualiza desconexões
    socket.on('disconnect', () => {
        console.log(`Jogador desconectado: ${socket.id}`);
        delete jogadores[socket.id];
        io.emit('atualizar_jogadores', jogadores);
    });
});

// abre a porta do servidor
http.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});