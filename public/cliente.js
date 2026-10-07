const socket = io();

// 0. tela
const canvas = document.getElementById("meuCanvas");  
const ctx = canvas.getContext("2d");

function redimensionarCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
redimensionarCanvas();
window.addEventListener('resize', redimensionarCanvas);

// 1. declarações
const imagemMapa = new Image();
imagemMapa.src = "assets/mapa-todo-v2.png";

const imagemJogador = new Image();
imagemJogador.src = "assets/personagem-v2.png";

const mapa = {
    largura: 2000,
    altura: 2000
};

const jogador = {
    tamanho: 25,
    larguraVisual: 50,
    alturaVisual: 130,
    velocidade: 200,
    cor: '#00ffcc'
};

let posicao = {
    x: 200,
    y: 200
};

const camera = {
    x: 0,
    y: 0,
    largura: window.innerWidth,
    altura: window.innerHeight
};

let todosJogadores = {};
let ultimoTempo = 0;

// estado do poder do patrão
let poderPatraoUsado = false;
let idAlvoPatrao = null;

// controle de digitação do balão
let digitando = false;
let textoDigitado = "";
let alguemPerto = false;
const raioChat = 300;

// declaração das teclas 
const teclas = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false
};

// 2. socket & eventos de rede

socket.on('receber_mensagem', (dados) => {
    if (todosJogadores[dados.idJogador]) {
        todosJogadores[dados.idJogador].ultimaMensagem = dados.texto;
        todosJogadores[dados.idJogador].tempoMensagem = Date.now();
    }
});

socket.on('atualizar_jogadores', (dados) => {
    for (let id in dados) {
        if (todosJogadores[id]) {
            dados[id].ultimaMensagem = todosJogadores[id].ultimaMensagem;
            dados[id].tempoMensagem = todosJogadores[id].tempoMensagem;
        }
    }
    todosJogadores = dados;
});

socket.on('sala_cheia', (mensagem) => {
    alert(mensagem);
});

socket.on('voce_morreu', (mensagem) => {
    alert(mensagem);
    window.location.reload();
});

// 3. funções

function calcularDistancia(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function verificarProximidade() {
    let perto = false;
    for (let id in todosJogadores) {
        if (id !== socket.id) {
            const outro = todosJogadores[id];
            const dist = calcularDistancia(posicao, outro);
            if (dist <= raioChat) {
                perto = true;
                break;
            }
        }
    }
    alguemPerto = perto;

    if (!alguemPerto && digitando) {
        digitando = false;
        textoDigitado = "";
    }
}

// busca o alvo mais próximo pro Patrão
function buscarAlvoPatrao() {
    const meuJogador = todosJogadores[socket.id];
    if (!meuJogador || meuJogador.funcao !== 'Patrão' || poderPatraoUsado) {
        idAlvoPatrao = null;
        return;
    }

    let menorDistancia = Infinity;
    let alvoEncontrado = null;

    for (let id in todosJogadores) {
        if (id !== socket.id) {
            const dist = calcularDistancia(posicao, todosJogadores[id]);
            if (dist <= raioChat && dist < menorDistancia) {
                menorDistancia = dist;
                alvoEncontrado = id;
            }
        }
    }

    idAlvoPatrao = alvoEncontrado;
}

// desenha o balão de fala
function desenharBalao(texto, x, y, corFundo, corTexto) {
    ctx.save();
    ctx.font = "bold 13px Arial";
    const larguraTexto = ctx.measureText(texto).width;
    const padding = 8;
    const larguraBalao = larguraTexto + (padding * 2);
    const alturaBalao = 22;
    const posX = x - (larguraBalao / 2);
    const posY = y - alturaBalao;

    ctx.fillStyle = corFundo;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(posX, posY, larguraBalao, alturaBalao, 6);
    } else {
        ctx.rect(posX, posY, larguraBalao, alturaBalao);
    }
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = corTexto;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, x, posY + (alturaBalao / 2));
    ctx.restore();
}

// desenha tudo no canvas
function desenhar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // desenha o mapa
    if (imagemMapa.complete && imagemMapa.naturalWidth !== 0) {
        ctx.drawImage(imagemMapa, 0 - camera.x, 0 - camera.y, mapa.largura, mapa.altura);
    } else {
        ctx.fillStyle = "#2e5a1c";
        ctx.fillRect(0 - camera.x, 0 - camera.y, mapa.largura, mapa.altura);
    }

    ctx.strokeStyle = "black";
    ctx.lineWidth = 5;
    ctx.strokeRect(0 - camera.x, 0 - camera.y, mapa.largura, mapa.altura);

    // desenha os jogadores
    for (let id in todosJogadores) {
        let player = todosJogadores[id];

        let xNaTela = player.x - camera.x;
        let yNaTela = player.y - camera.y;
        let tam = player.tamanho || jogador.tamanho;

        let largVis = player.larguraVisual || jogador.larguraVisual || 64;
        let altVis = player.alturaVisual || jogador.alturaVisual || 64;

        let offsetX = (largVis - tam) / 2;
        let offsetY = (altVis - tam) / 2;

        if (
            xNaTela + largVis > 0 && xNaTela < canvas.width &&
            yNaTela + altVis > 0 && yNaTela < canvas.height
        ) {
            ctx.save();

            // sombra vermelha no alvo do Patrão
            if (id === idAlvoPatrao) {
                ctx.shadowColor = "red";
                ctx.shadowBlur = 20;
            }

            // desenha o personagem
            if (imagemJogador.complete && imagemJogador.naturalWidth !== 0) {
                ctx.drawImage(imagemJogador, xNaTela - offsetX, yNaTela - offsetY, largVis, altVis);
            } else {
                ctx.fillStyle = player.cor || jogador.cor;
                ctx.fillRect(xNaTela, yNaTela, tam, tam);
            }

            ctx.restore();

            // balão de mensagem
            if (player.ultimaMensagem && (Date.now() - player.tempoMensagem < 6000)) {
                desenharBalao(player.ultimaMensagem, xNaTela + tam / 2, yNaTela - offsetY - 10, "rgba(255, 255, 255, 0.95)", "black");
            }
        }
    }

    // exibe a função e o status do poder na tela
    if (todosJogadores[socket.id]){
        ctx.save();
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = "yellow";
        ctx.textAlign = "left";
        ctx.fillText("Função: " + todosJogadores[socket.id].funcao, 20, 30);

        if (todosJogadores[socket.id].funcao === 'Patrão') {
            ctx.fillStyle = poderPatraoUsado ? "gray" : "#ff4444";
            const statusPoder = poderPatraoUsado ? "Poder Usado" : "Poder Disponível (Aperte Q para Eliminar)";
            ctx.fillText(statusPoder, 20, 55);
        }
        ctx.restore();
    }

    // caixa de digitação no chat
    if (digitando) {
        let altVis = jogador.alturaVisual;
        let offsetY = (altVis - jogador.tamanho) / 2;
        let meuXNaTela = posicao.x - camera.x + jogador.tamanho / 2;
        let meuYNaTela = posicao.y - camera.y - offsetY - 10;
        const textoExibido = textoDigitado.length === 0 ? "Digite sua mensagem..." : textoDigitado;
        desenharBalao(textoExibido, meuXNaTela, meuYNaTela, "rgba(255, 235, 59, 0.95)", "black");
    }

    // aviso para conversar
    if (alguemPerto && !digitando) {
        ctx.save();
        ctx.font = "bold 15px Arial";
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(15, canvas.height - 45, 250, 30);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText("Pressione T para conversar", 25, canvas.height - 30);
        ctx.restore();
    }
}

// movimenta o jogador
function moverJogador(dt) {
    if (digitando) return;

    let moveu = false;
    const vel = jogador.velocidade * dt;

    if ((teclas.ArrowUp || teclas.w) && posicao.y > 0) {
        posicao.y -= vel;
        moveu = true;
    }
    if ((teclas.ArrowDown || teclas.s) && posicao.y + jogador.tamanho < mapa.altura) {
        posicao.y += vel;
        moveu = true;
    }
    if ((teclas.ArrowLeft || teclas.a) && posicao.x > 0) {
        posicao.x -= vel;
        moveu = true;
    }
    if ((teclas.ArrowRight || teclas.d) && posicao.x + jogador.tamanho < mapa.largura) {
        posicao.x += vel;
        moveu = true;
    }

    if (moveu) {
        socket.emit('movimento', posicao);
    }
}

// atualiza a posição da câmera
function atualizarCamera() {
    camera.x = posicao.x - canvas.width / 2 + jogador.tamanho / 2;
    camera.y = posicao.y - canvas.height / 2 + jogador.tamanho / 2;

    camera.x = Math.max(0, Math.min(camera.x, mapa.largura - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, mapa.altura - canvas.height));
}

// 4. captura de teclas 
window.addEventListener('keydown', (evento) => {
    // usa poder do patrão
    if ((evento.key === "q" || evento.key === "Q") && !digitando) {
        const meuJogador = todosJogadores[socket.id];
        if (meuJogador && meuJogador.funcao === 'Patrão' && !poderPatraoUsado && idAlvoPatrao) {
            socket.emit('eliminar_jogador', { idAlvo: idAlvoPatrao });
            poderPatraoUsado = true;
            idAlvoPatrao = null;
        }
        return;
    }

    // abre o chat
    if ((evento.key === "t" || evento.key === "T") && !digitando) {
        if (alguemPerto) {
            digitando = true;
            textoDigitado = "";
            evento.preventDefault();
        }
        return;
    }

    // envia mensagem
    if (evento.key === "Enter") {
        if (digitando) {
            const mensagemLimpa = textoDigitado.trim();
            if (mensagemLimpa !== "") {
                socket.emit('enviar_mensagem', mensagemLimpa);
            }
            textoDigitado = "";
            digitando = false;
        }
        return;
    }

    // digita no chat
    if (digitando) {
        if (evento.key === "Backspace") {
            textoDigitado = textoDigitado.slice(0, -1);
        } else if (evento.key.length === 1 && textoDigitado.length < 60) {
            textoDigitado += evento.key;
        }
        return;
    }

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

// 5. loop principal
function update(tempoAtual) {
    if(!ultimoTempo){
        ultimoTempo = tempoAtual;
    }
    const deltaTime = (tempoAtual - ultimoTempo) / 1000;
    ultimoTempo = tempoAtual;

    verificarProximidade();
    buscarAlvoPatrao();
    moverJogador(deltaTime);
    atualizarCamera();
    desenhar();

    requestAnimationFrame(update);
}

requestAnimationFrame(update);