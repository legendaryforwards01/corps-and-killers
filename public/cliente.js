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


// 1. declarações


// imagem do mapa
const imagemMapa = new Image();
imagemMapa.src = "assets/pixilart-drawing.png";

// controle de digitação do balão
let digitando = false;
let textoDigitado = "";
let alguemPerto = false;
const raioChat = 300;

//declaração das teclas 
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

// objeto Jogador com tamanho, velocidade e cor

// declaração do jogador
const jogador = {
    tamanho: 25,
    velocidade: 250,
    cor: '#00ffcc'
};

// declaração do spawn(vai ser alterado futuramente)
let posicao = {
    x: 300,
    y: 200
};

// tamanho e camera
const mapa = {
    largura: 2000,
    altura: 2000
};

const camera = {
    x: 0,
    y: 0,
    largura: window.innerWidth,
    altura: window.innerHeight
};

//lista dos jogadores que entrarem
let todosJogadores = {};
let ultimoTempo = 0;


// 2. funções 


// função para calcular distância entre dois jogadores
function calcularDistancia(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// verifica se há alguem dentro do raio do chat
function verificarProximidade() {
    let perto = false;
    for (let id in todosJogadores) {  /* passa por todos os jogadores */
        if (id !== socket.id) {  /* checa se não é o próprio jogador */
            const outro = todosJogadores[id];
            const dist = calcularDistancia(posicao, outro);
            if (dist <= raioChat) { /* se tiver perto, variavel perto se torna true */
                perto = true;
                break;
            }
        }
    }
    alguemPerto = perto;

    // se sair do raio, cancela a digitação
    if (!alguemPerto && digitando) {
        digitando = false;
        textoDigitado = "";
    }
}
 
//desenha o balão de mesnagem
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
    if (ctx.roundRect) { //cria o retangulo meio circular
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

function desenhar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); //limpar o jogador para desenhar no novo lugar

    if (imagemMapa.complete && imagemMapa.naturalWidth !== 0) { //rodar um mapa temporario enquanto carrega
        ctx.drawImage(imagemMapa, 0 - camera.x, 0 - camera.y, mapa.largura, mapa.altura);
    } else {
        ctx.fillStyle = "#2e5a1c";
        ctx.fillRect(0 - camera.x, 0 - camera.y, mapa.largura, mapa.altura);
    }

    ctx.strokeStyle = "black";
    ctx.lineWidth = 5;
    ctx.strokeRect(0 - camera.x, 0 - camera.y, mapa.largura, mapa.altura);

    for (let id in todosJogadores) {
        let player = todosJogadores[id];

        let xNaTela = player.x - camera.x;
        let yNaTela = player.y - camera.y;
        let tam = player.tamanho || jogador.tamanho;

        if (
            xNaTela + tam > 0 && xNaTela < canvas.width &&
            yNaTela + tam > 0 && yNaTela < canvas.height
        ) {
            ctx.fillStyle = player.cor || jogador.cor;
            ctx.fillRect(xNaTela, yNaTela, tam, tam);

            ctx.fillStyle = "white";
            ctx.font = "14px Arial";
            ctx.textAlign = "center";

            if (player.nome) {
                ctx.fillText(player.nome, xNaTela + tam / 2, yNaTela - 8);
            }

            if (player.ultimaMensagem && (Date.now() - player.tempoMensagem < 6000)) {
                desenharBalao(player.ultimaMensagem, xNaTela + tam / 2, yNaTela - 24, "rgba(255, 255, 255, 0.95)", "black");
            }
        }
    }

    // caixa de digitação flutuante quando o jogador apertar t
    if (digitando) {
        let meuXNaTela = posicao.x - camera.x + jogador.tamanho / 2;
        let meuYNaTela = posicao.y - camera.y - 24;
        const textoExibido = textoDigitado.length === 0 ? "Digite sua mensagem..." : textoDigitado;
        desenharBalao(textoExibido, meuXNaTela, meuYNaTela, "rgba(255, 235, 59, 0.95)", "black");
    }

    // aviso no canto 
    if (alguemPerto && !digitando) {
        ctx.save();
        ctx.font = "bold 15px Arial";
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(15, canvas.height - 45, 250, 30); // fundo escuro do aviso
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText("Pressione T para conversar", 25, canvas.height - 30);
        ctx.restore();
    }
}

function moverJogador(dt) {
    if (digitando) return; // trava movimentação enquanto escreve a mensagem

    let moveu = false;
    const vel = jogador.velocidade * dt; //velocidade ficar igual independente de onde estiver rodando

    if (teclas.ArrowUp && posicao.y > 0 || teclas.w && posicao.y > 0) {
        posicao.y -= vel;
        moveu = true;
    }
    if (teclas.ArrowDown && posicao.y + jogador.tamanho < mapa.altura || teclas.s && posicao.y + jogador.tamanho < mapa.altura) {
        posicao.y += vel;
        moveu = true;
    }
    if (teclas.ArrowLeft && posicao.x > 0 || teclas.a && posicao.x > 0) {
        posicao.x -= vel;
        moveu = true;
    }
    if (teclas.ArrowRight && posicao.x + jogador.tamanho < mapa.largura || teclas.d && posicao.x + jogador.tamanho < mapa.largura) {
        posicao.x += vel;
        moveu = true;
    }

    if (moveu) {
        socket.emit('movimento', posicao);
    };

};

 //atualizar posição da câmera
function atualizarCamera() {
    camera.x = posicao.x - canvas.width / 2 + jogador.tamanho / 2;
    camera.y = posicao.y - canvas.height / 2 + jogador.tamanho / 2;

    camera.x = Math.max(0, Math.min(camera.x, mapa.largura - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, mapa.altura - canvas.height));
}


// 3. captura de teclas 


window.addEventListener('keydown', (evento) => {
    // tecla T ativa o modo de digitação (se tiver alguém perto e não ja estiver digitando)
    if ((evento.key === "t" || evento.key === "T") && !digitando) {
        if (alguemPerto) {
            digitando = true;
            textoDigitado = "";
            evento.preventDefault();
        }
        return;
    }

    // enter envia a mensagem e fecha a caixa
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

    // se apertar backspace exclui o ultimo caractere
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

// se para de pressionar tal tecla, ela para
window.addEventListener('keyup', (evento) => {
    if (evento.key in teclas) {
        teclas[evento.key] = false;
    }
});

//dados para o jogador que recebe a mensagem
socket.on('receber_mensagem', (dados) => {
    if (todosJogadores[dados.idJogador]) {
        todosJogadores[dados.idJogador].ultimaMensagem = dados.texto;
        todosJogadores[dados.idJogador].tempoMensagem = Date.now();
    }
});

//atualiza dados do jogador
socket.on('atualizar_jogadores', (dados) => {
    todosJogadores = dados;
});

// 4. loop

function update(tempoAtual) {
    if(!ultimoTempo){ //proporção para velocidade ser a mesma independente de onde estiver rodando
        ultimoTempo = tempoAtual;
    }
    const deltaTime = (tempoAtual - ultimoTempo) / 1000;
    ultimoTempo = tempoAtual;

    verificarProximidade(); //checar se pode conversar
    moverJogador(deltaTime); //mover jogador correspondentemente 
    atualizarCamera(); //atualizar posição da câmera
    desenhar();//desenhar o jogador

    requestAnimationFrame(update);//rodar a 60 fps
}

//entrar no loop da função update
requestAnimationFrame(update);
