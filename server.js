const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const raioChat = 300;

app.use(express.static('public'));

// lista de jogadores logados no server
let jogadores = {};

const max_jogadores = 12;

const nomesPossiveis = [
    ['Maçã', 'Banana', 'Uva', 'Pêssego', 'Morango', 'Kiwi', 'Manga', 'Abacaxi', 'Pêra', 'Abacate', 'Melancia', 'Goiaba'],
    ['Vermelho', 'Amarelo', 'Verde', 'Rosa', 'Roxo', 'Azul', 'Branco', 'Preto', 'Cinza', 'Laranja', 'Bege', 'Ciano'],
    ['China', 'Rússia', 'ìndia', 'Austrália', 'Alemanha', 'Japão', 'México', 'Argentina', 'Brasil', 'Espanha', 'Itália', 'França'],
    ['Cachorro', 'Gato', 'Leão', 'Elefante', 'Girafa', 'Macaco', 'Cavalo', 'Cobra', 'Vaca', 'Porco', 'Peixe', 'Ovelha']
]
function funcoesLista(){
    return['Empresário', 'Empresário','Empresário', 'Empresário','Empresário', 'Empresário','Empresário', 'Empresário','Empresário',
            'Patrão', 'Enfermeiro', 'Detetive'];

}

let funcoesDisponiveis = funcoesLista();

function embaralhar(array){
    for (let i = array.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    };
    return(array);
}

funcoesDisponiveis = embaralhar(funcoesDisponiveis); 

// pega uma lista aleatória dentro das opções
const listaSorteada = nomesPossiveis[Math.floor(Math.random() * nomesPossiveis.length)];

function gerarNomeAleatorio(){
    const indiceSorteado = Math.floor(Math.random() * listaSorteada.length);
    const [nomeSorteado] = listaSorteada.splice(indiceSorteado, 1);
    return nomeSorteado;
}

// calcular distância entre os jogadores
function calcularDistancia(p1, p2){
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
};


// cria um jogador a cada conexão no servidor
io.on('connection', (socket) => {
    if (Object.keys(jogadores).length >= max_jogadores){
        console.log(`Conexão recusada: Sala cheia ${socket.id}`);
        socket.emit('sala_cheia', 'A sala já atingiu o máximo de 12 jogadores. ');
        socket.disconnect(true);
        return;
    }

    const funcaoAtribuida = funcoesDisponiveis.pop() || 'Empresário';

    console.log(`Jogador conectado ${socket.id} || Função: ${funcaoAtribuida}`)

    jogadores[socket.id] = {
        nome: gerarNomeAleatorio(),
        id: socket.id,
        x: 200,
        y: 200,
        tamanho: 25,
        larguraVisual: 50,
        alturaVisual: 130,
        velocidade: 200,
        cor: '#00ffcc',
        funcao: funcaoAtribuida
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

    socket.on('enviar_mensagem', (texto) => {
        const remetente = jogadores[socket.id];
        if (!remetente){
            return;
        }

        const mensagemLimpa = texto.trim().substring(0, 100);
        if (mensagemLimpa.length === 0){
            return;
        }

        const dadosMensagem = {
            idJogador: socket.id,
            texto: mensagemLimpa,
            timestamp: Date.now()
        }

        for (let id in jogadores){
            const destinatario = jogadores[id];
            const dist = calcularDistancia(remetente, destinatario);

            if (dist <= raioChat){
                io.to(id).emit('receber_mensagem', dadosMensagem);
            }
        }
    })

    // atualiza desconexões
    socket.on('disconnect', () => {
        console.log(`Jogador desconectado: ${socket.id}`);
        if (jogadores[socket.id]){
            funcoesDisponiveis.push(jogadores[socket.id].funcao);
            funcoesDisponiveis = embaralhar(funcoesDisponiveis);
        }
        delete jogadores[socket.id];
        io.emit('atualizar_jogadores', jogadores);
    });
});

// abre a porta do servidor
http.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});