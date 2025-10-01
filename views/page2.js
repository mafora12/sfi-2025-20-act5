let currentPageData = {
    x: window.screenX,
    y: window.screenY,
    width: window.innerWidth,
    height: window.innerHeight

}

let previousPageData = {
    x: window.screenX,
    y: window.screenY,
    width: window.innerWidth,
    height: window.innerHeight
};

let remotePageData = { x: 0, y: 0, width: 100, height: 100 };
let point2 = [currentPageData.width / 2, currentPageData.height / 2];
let socket;
let isConnected = false;
let hasRemoteData = false;
let isFullySynced = false;
let connectionTimeout;

function setup() {
    createCanvas(windowWidth, windowHeight);
    frameRate(60);
    socket = io();

    socket.on('connect', () => {
        console.log('Connected with ID:', socket.id);
        isConnected = true;
        socket.emit('win2update', currentPageData, socket.id);
        
        // Solicitar sincronización después de un breve delay
        setTimeout(() => {
            socket.emit('requestSync');
        }, 500);
    });

    socket.on('getdata', (response) => {
        if (response && response.data && isValidRemoteData(response.data)) {
            remotePageData = response.data;
            hasRemoteData = true;
            console.log('Received valid remote data:', remotePageData);
            socket.emit('confirmSync');
        }
    });

    socket.on('fullySynced', (synced) => {
        isFullySynced = synced;
        console.log('Sync status:', synced ? 'SYNCED' : 'NOT SYNCED');
    });

    socket.on('peerDisconnected', () => {
        hasRemoteData = false;
        isFullySynced = false;
        console.log('Peer disconnected, waiting for reconnection...');
    });

    socket.on('disconnect', () => {
        isConnected = false;
        hasRemoteData = false;
        isFullySynced = false;
        console.log('Disconnected from server');
    });
}

function isValidRemoteData(data) {
    return data && 
           typeof data.x === 'number' && 
           typeof data.y === 'number' && 
           typeof data.width === 'number' && data.width > 0 &&
           typeof data.height === 'number' && data.height > 0;
}

function checkWindowPosition() {
    currentPageData = {
        x: window.screenX,
        y: window.screenY,
        width: window.innerWidth,
        height: window.innerHeight
    };

    if (currentPageData.x !== previousPageData.x || currentPageData.y !== previousPageData.y || 
        currentPageData.width !== previousPageData.width || currentPageData.height !== previousPageData.height) {

        point2 = [currentPageData.width / 2, currentPageData.height / 2]
        socket.emit('win2update', currentPageData, socket.id);
        previousPageData = currentPageData; 
    }
}


// Array para las estrellas
let stars = [];

function draw() {
    checkWindowPosition();

    // --- Fondo reactivo ---
    if (!isConnected) {
        background(30);
        showStatus('Conectando al servidor...', color(0, 200, 255));
        return;
    }

    if (!hasRemoteData) {
        background(30);
        showStatus('Esperando conexión de la otra ventana...', color(0, 200, 255));
        return;
    }

    if (!isFullySynced) {
        background(30);
        showStatus('Sincronizando datos...', color(0, 200, 255));
        return;
    }

    // Calculamos vector y distancia
    let vector2 = createVector(remotePageData.x, remotePageData.y);
    let vector1 = createVector(currentPageData.x, currentPageData.y);
    let resultingVector = createVector(vector2.x - vector1.x, vector2.y - vector1.y);

    let remoteX = resultingVector.x + remotePageData.width / 2;
    let remoteY = resultingVector.y + remotePageData.height / 2;

    let d = dist(point2[0], point2[1], remoteX, remoteY);

    // --- Fondo dinámico ---
    if (d < 200) {
        setGradient(0, 0, width, height, color(50, 50, 80), color(255, 200, 100));
    } else {
        background(30);
    }

    // --- Pulso rítmico ---
    let pulseSpeed = map(d, 50, 600, 0.15, 0.05, true);
    let pulsingSize = 120 + sin(frameCount * pulseSpeed) * 15;

    // --- Glow dinámico ---
    let glowColor = lerpColor(color(0, 150, 255), color(255, 220, 0), map(d, 600, 50, 0, 1, true));
    drawingContext.shadowBlur = 40;
    drawingContext.shadowColor = glowColor;

    // --- Círculo propio ---
    drawCircle(point2[0], point2[1], pulsingSize, glowColor);

    // --- Círculo remoto ---
    drawCircle(remoteX, remoteY, pulsingSize * 0.8, glowColor);

    // --- Efecto de choque de energía + estrellitas ---
    if (d < 50) {
        fill(255);
        noStroke();
        ellipse(point2[0], point2[1], pulsingSize * 1.2);
        ellipse(remoteX, remoteY, pulsingSize * 1.2);

        // Generar nuevas estrellitas
        for (let i = 0; i < 5; i++) {
            stars.push(new Star((point2[0] + remoteX) / 2, (point2[1] + remoteY) / 2));
        }
    }

    // Dibujar y actualizar estrellas
    for (let i = stars.length - 1; i >= 0; i--) {
        stars[i].update();
        stars[i].show();
        if (stars[i].finished()) {
            stars.splice(i, 1);
        }
    }
}

// Clase Star ✨
class Star {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.random2D().mult(random(1, 4));
        this.alpha = 255;
        this.size = random(5, 12);
        this.color = color(255, 255, random(150, 255));
    }

    update() {
        this.pos.add(this.vel);
        this.alpha -= 4;
    }

    finished() {
        return this.alpha <= 0;
    }

    show() {
        noStroke();
        fill(red(this.color), green(this.color), blue(this.color), this.alpha);
        drawingContext.shadowBlur = 20;
        drawingContext.shadowColor = this.color;
        ellipse(this.pos.x, this.pos.y, this.size);
    }
}

// Función para dibujar círculo con glow
function drawCircle(x, y, size, c) {
    noStroke();
    fill(c);
    ellipse(x, y, size);
}

// Función de degradado para el fondo
function setGradient(x, y, w, h, c1, c2) {
    noFill();
    for (let i = y; i <= y + h; i++) {
        let inter = map(i, y, y + h, 0, 1);
        let c = lerpColor(c1, c2, inter);
        stroke(c);
        line(x, i, x + w, i);
    }
}


function showStatus(message, statusColor) {
    textSize(24);
    textAlign(CENTER, CENTER);
    noStroke();
    // Dibujar rectángulo de fondo para el texto
    fill(0, 0, 0, 150); // Negro semi-transparente
    rectMode(CENTER);
    let textW = textWidth(message) + 40;
    let textH = 40;
    rect(width / 2, 1*height / 6, textW, textH, 10);
    // Dibujar el texto
    fill(statusColor);
    text(message, width / 2, 1*height / 6);
}



function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}