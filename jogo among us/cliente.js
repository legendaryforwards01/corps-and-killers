const socket = io();

const canvas = document.getElementById("meuCanvas");  
const ctx = canvas.getContext("2d");

const jogador = {
    tamanho: 25,
    velocidade: 4,
    cor: '#00ffcc'
};

let posicao = {
    x: 300,
    y: 200
};

let todosJogadores = {};

const teclas = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

window.addEventListener('keydown', (evento) => {
    if (evento.key in teclas) {
        teclas[evento.key] = true;
        evento.preventDefault();
    }
});

window.addEventListener('keyup', (evento) => {
    if (evento.key in teclas) {
        teclas[evento.key] = false;
    }
});

socket.on('atualizar_jogadores', (dados) => {
    todosJogadores = dados;
});

function desenhar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let id in todosJogadores) {
        let p = todosJogadores[id];
        ctx.fillStyle = p.cor || jogador.cor;
        ctx.fillRect(p.x, p.y, p.tamanho || jogador.tamanho, p.tamanho || jogador.tamanho);
    }
}

function moverJogador() {
    let moveu = false;

    if (teclas.ArrowUp && posicao.y > 0) {
        posicao.y -= jogador.velocidade;
        moveu = true;
    }
    if (teclas.ArrowDown && posicao.y + jogador.tamanho < canvas.height) {
        posicao.y += jogador.velocidade;
        moveu = true;
    }
    if (teclas.ArrowLeft && posicao.x > 0) {
        posicao.x -= jogador.velocidade;
        moveu = true;
    }
    if (teclas.ArrowRight && posicao.x + jogador.tamanho < canvas.width) {
        posicao.x += jogador.velocidade;
        moveu = true;
    }

    if (moveu) {
        socket.emit('movimento', posicao);
    }
}

function update() {
    moverJogador();
    desenhar();
    requestAnimationFrame(update);
}

update();