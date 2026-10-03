const socket = io();
// 0. tela

// cria a tela do jogo
const canvas = document.getElementById("meuCanvas");  
const ctx = canvas.getContext("2d");
function redimensionarCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
// fixa a tela do jogo em toda a tela disponível
redimensionarCanvas();
window.addEventListener('resize', redimensionarCanvas);

const raioChat = 300;

function calcularDistancia(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function atualizarVisibilidadeChat(){
    const containerChat = document.getElementById("container-chat");
    if (!containerChat){
        return;
    }
    let alguemPerto = false;
    for (let id in todosJogadores){
        if (id !== socket.id){
            const outrosjogadores = todosJogadores[id];
            const dist = calcularDistancia(posicao, outrosjogadores);
            if (dist <= raioChat){
                alguemPerto = true;
                break;
            }
        }
    }

    if(alguemPerto || document.activeElement === inputChat){
        containerChat.style.display = "block";
    }
    else{
        containerChat.style.display = "none";
    }
}

// imagem do mapa
const imagemMapa = new Image();
imagemMapa.src = "assets/mapa.jpg";

const inputChat = document.getElementById("input-chat");
const historicoChat = document.getElementById("historico-chat");

window.addEventListener('keydown', (evento) => {
    if (evento.key === "Enter"){
        if (document.activeElement === inputChat){
            if (inputChat.value.trim() !== ""){
                socket.emit('enviar_mensagem', inputChat.value);
                inputChat.value = "";
            }
            inputChat.blur();
        }
        else{
            inputChat.focus();
            evento.preventDefault();
        };
    };
});

socket.on('receber_mensagem', (dados) => {
    const msgElemento = document.createElement("div");
    const nomeExibicao = (dados.idJogador === socket.id) ? "Eu": dados.nomeJogador;
    msgElemento.innerHTML = `<strong>${nomeExibicao}</strong>: ${dados.texto}`;
    historicoChat.appendChild(msgElemento);
    historicoChat.scrollTop = historicoChat.scrollHeight
});

// 1. objetos

// tamanho real do mapa (Mundo do jogo)
const mapa = {
    largura: 2000,
    altura: 2000
};

// objeto da câmera
const camera = {
    x: 0,
    y: 0,
    largura: window.innerWidth,
    altura: window.innerHeight
};

// objeto do jogador
const jogador = {
    tamanho: 25,
    velocidade: 250,
    cor: '#00ffcc'
};

// spawn do jogador
let posicao = {
    x: 300,
    y: 200
};

// lista dos jogadores logados
let todosJogadores = {};

let ultimoTempo = 0;

// objeto com as teclas pressionadas em false
const teclas = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// 2. capta a tecla pressionada e torna true
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

// atualiza os jogadores logados no servidor
socket.on('atualizar_jogadores', (dados) => {
    todosJogadores = dados;
});


// 3. funções

// função que atualiza a localização do jogador a cada segundo
function desenhar() {
    // limpa a tela
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // desenha a imagem de fundo do mapa
    // caso a imagem ainda esteja carregando, desenha um fundo temporário
    if (imagemMapa.complete && imagemMapa.naturalWidth !== 0) {
        ctx.drawImage(imagemMapa, 0 - camera.x, 0 - camera.y, mapa.largura, mapa.altura);
    } else {
        ctx.fillStyle = "#2e5a1c";
        ctx.fillRect(0 - camera.x, 0 - camera.y, mapa.largura, mapa.altura);
    }

    // desenha as bordas do mapa para enxergar o limite
    ctx.strokeStyle = "black";
    ctx.lineWidth = 5;
    ctx.strokeRect(0 - camera.x, 0 - camera.y, mapa.largura, mapa.altura);

    // desenha cada jogador
    for (let id in todosJogadores) {
        let player = todosJogadores[id];

        // posição na tela = posição no mapa - posição da camera
        let xNaTela = player.x - camera.x;
        let yNaTela = player.y - camera.y;
        let tam = player.tamanho || jogador.tamanho;

        if (
            xNaTela + tam > 0 && xNaTela < canvas.width &&
            yNaTela + tam > 0 && yNaTela < canvas.height
        ) {
            // desenha o jogador
            ctx.fillStyle = player.cor || jogador.cor;
            ctx.fillRect(xNaTela, yNaTela, tam, tam);

            // texto do nome
            ctx.fillStyle = "white";
            ctx.font = "14px Arial";
            ctx.textAlign = "center";

            // nome em cima do jogador
            if (player.nome) {
                ctx.fillText(player.nome, xNaTela + tam / 2, yNaTela - 8);
            };
        };
    };
};

function moverJogador(dt) {
    let moveu = false;
    const vel = jogador.velocidade * dt;

    if (teclas.ArrowUp && posicao.y > 0) {
        posicao.y -= vel;
        moveu = true;
    }
    if (teclas.ArrowDown && posicao.y + jogador.tamanho < mapa.altura) {
        posicao.y += vel;
        moveu = true;
    }
    if (teclas.ArrowLeft && posicao.x > 0) {
        posicao.x -= vel;
        moveu = true;
    }
    if (teclas.ArrowRight && posicao.x + jogador.tamanho < mapa.largura) {
        posicao.x += vel;
        moveu = true;
    }
    // se true, ele manda o movimento pro servidor e os outros jogadores podem ver o movimento
    if (moveu) {
        socket.emit('movimento', posicao);
    }
}

function atualizarCamera() {
    // centraliza a câmera na posição do jogador
    camera.x = posicao.x - canvas.width / 2 + jogador.tamanho / 2;
    camera.y = posicao.y - canvas.height / 2 + jogador.tamanho / 2;

    // impede a câmera de sair do mapa
    camera.x = Math.max(0, Math.min(camera.x, mapa.largura - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, mapa.altura - canvas.height));
};

// função pra carregar o jogo a cada frame
function update(tempoAtual) {
    if(!ultimoTempo){
        ultimoTempo = tempoAtual;
    };
    const deltaTime = (tempoAtual - ultimoTempo) / 1000;
    ultimoTempo = tempoAtual;

    moverJogador(deltaTime);
    atualizarCamera();
    atualizarVisibilidadeChat();
    desenhar();

    requestAnimationFrame(update); // roda a função a cada frame
}

requestAnimationFrame(update);