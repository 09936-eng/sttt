/**
 * LUMEN LOST – ผู้พิทักษ์แสง
 * เกมเเนว Science Puzzle Adventure เกี่ยวกับฟิสิกส์เชิงแสง (Optics)
 */

// ซาวด์เอฟเฟกต์ (สร้างด้วย Web Audio API เพื่อไม่ต้องพึ่งไฟล์ภายนอก)
class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }

    playBeep(freq = 440, type = 'sine', duration = 0.1) {
        if (!this.enabled) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch(e){}
    }

    playCollect() { this.playBeep(880, 'triangle', 0.15); }
    playRotate() { this.playBeep(300, 'sine', 0.05); }
    playWin() { 
        this.playBeep(523, 'square', 0.1); 
        setTimeout(() => this.playBeep(659, 'square', 0.1), 100);
        setTimeout(() => this.playBeep(783, 'square', 0.2), 200);
    }
}

const soundManager = new SoundManager();

// สถานะเกม (Game State)
const gameState = {
    currentLevel: 1,
    energy: 50,
    score: 0,
    time: 0,
    timerInterval: null,
    unlockedLevels: 1
};

// การตั้งค่า Canvas และระบบพิกัด
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 500;

// โครงสร้างตัวละคร (Scientist)
const player = {
    x: 100,
    y: 250,
    size: 20,
    speed: 4,
    vx: 0,
    vy: 0
};

// ข้อมูลเกี่ยวกับด่านต่างๆ (Level Configurations)
const levels = [
    {
        id: 1,
        title: "SHADOW AWAKENING",
        concept: "เงาเกิดขึ้นเมื่อวัตถุทึบแสงขวางทางเดินของแสง",
        hint: "ลองขยับวัตถุทึบแสงเพื่อบังแสงให้เกิดเงาเปิดสวิตช์!",
        lightSources: [{ x: 50, y: 250, angle: 0, color: '#ffffff' }],
        targets: [{ x: 750, y: 250, color: '#ffffff', active: false }],
        objects: [
            { type: 'block', x: 300, y: 200, w: 40, h: 100, moveable: true, title: "บล็อกทึบแสง", desc: "วัตถุนี้แสงไม่สามารถส่องผ่านได้ ทำให้เกิดพื้นที่มืดหรือเงาด้านหลัง" }
        ],
        energies: [{ x: 200, y: 100, collected: false }, { x: 400, y: 400, collected: false }]
    },
    {
        id: 2,
        title: "MIRROR MAZE",
        concept: "มุมตกกระทบเท่ากับมุมสะท้อน (Law of Reflection)",
        hint: "หมุนกระจกเพื่อให้แสงสะท้อนไปยังเครื่องรับพลังงาน",
        lightSources: [{ x: 50, y: 100, angle: 0, color: '#00f3ff' }],
        targets: [{ x: 700, y: 400, color: '#00f3ff', active: false }],
        objects: [
            { type: 'mirror', x: 400, y: 100, angle: 135, title: "กระจกเงาราบ", desc: "ทำหน้าที่สะท้อนแสง โดยมุมตกกระทบจะเท่ากับมุมสะท้อนเสมอ" },
            { type: 'mirror', x: 400, y: 400, angle: 45, title: "กระจกเงาราบ", desc: "ทำหน้าที่สะท้อนแสง เพื่อเปลี่ยนทิศทางของลำแสง" }
        ],
        energies: [{ x: 400, y: 250, collected: false }]
    },
    {
        id: 3,
        title: "REFRACTION LAB",
        concept: "แสงเบี่ยงเบนทิศทางเมื่อเดินทางผ่านตัวกลางที่มีความหนาแน่นต่างกัน",
        hint: "ปรับตำแหน่งบล็อกแก้วเพื่อเปลี่ยนทิศทางการหักเหของแสง",
        lightSources: [{ x: 50, y: 250, angle: -0.2, color: '#00ff66' }],
        targets: [{ x: 750, y: 300, color: '#00ff66', active: false }],
        objects: [
            { type: 'medium', x: 300, y: 150, w: 150, h: 200, n: 1.5, title: "บล็อกแก้วทัศนูปกรณ์", desc: "ตัวกลางที่มีความหนาแน่นสูงกว่าอากาศ ทำให้แสงเดินทางช้าลงและหักเห" }
        ],
        energies: [{ x: 350, y: 100, collected: false }]
    },
    {
        id: 4,
        title: "PRISM CODE",
        concept: "การกระจายของแสง (Dispersion): ปริซึมแยกแสงขาวออกเป็นสเปกตรัมสีต่างๆ",
        hint: "ยิงแสงขาวผ่านปริซึมเพื่อแยกเป็นสีแดงและน้ำเงินไปเข้าตัวรับ",
        lightSources: [{ x: 50, y: 250, angle: 0, color: '#ffffff' }],
        targets: [
            { x: 750, y: 150, color: '#ff0000', active: false },
            { x: 750, y: 350, color: '#0055ff', active: false }
        ],
        objects: [
            { type: 'prism', x: 350, y: 250, title: "ปริซึมสามเหลี่ยม", desc: "แยกแสงขาวออกเป็นสีต่างๆ เนื่องจากแสงแต่ละความยาวคลื่นหักเหได้ไม่เท่ากัน" }
        ],
        energies: [{ x: 200, y: 300, collected: false }]
    },
    {
        id: 5,
        title: "LENS DIMENSION",
        concept: "เลนส์นูนรวมแสง เลนส์เว้ากระจายแสง",
        hint: "ใช้เลนส์นูนเพื่อรวมแสงขนานให้ไปตัดกันที่จุดโฟกัสรับพลังงาน",
        lightSources: [
            { x: 50, y: 200, angle: 0, color: '#ffff00' },
            { x: 50, y: 300, angle: 0, color: '#ffff00' }
        ],
        targets: [{ x: 700, y: 250, color: '#ffff00', active: false }],
        objects: [
            { type: 'lens-convex', x: 350, y: 250, focalLength: 150, title: "เลนส์นูน (Convex Lens)", desc: "ทำหน้าที่รวมแสงที่เดินทางขนานเข้ามาให้ผ่านจุดโฟกัส" }
        ],
        energies: [{ x: 500, y: 100, collected: false }]
    },
    {
        id: 6,
        title: "OPTICAL CORE",
        concept: "การบูรณาการระบบออพติกส์ทั้งหมดเพื่อปลดปล่อยพลังงานแกนกลาง",
        hint: "เชื่อมต่อเส้นทางแสงโดยใช้กระจก และปริซึมร่วมกัน!",
        lightSources: [{ x: 50, y: 100, angle: 0, color: '#ffffff' }],
        targets: [
            { x: 750, y: 400, color: '#ff0000', active: false },
            { x: 750, y: 100, color: '#0055ff', active: false }
        ],
        objects: [
            { type: 'mirror', x: 300, y: 100, angle: 135, title: "กระจกเงา 1", desc: "สะท้อนแสงลงด้านล่าง" },
            { type: 'prism', x: 300, y: 250, title: "ปริซึมแยกแสง", desc: "แยกแสงเข้าสู่เครื่องรับสี" }
        ],
        energies: [{ x: 600, y: 250, collected: false }]
    }
];

// ปุ่มกดคีย์บอร์ด
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

// เริ่มการทำงานระบบ UI
document.getElementById('btn-start').addEventListener('click', () => loadLevel(gameState.currentLevel));
document.getElementById('btn-how-to').addEventListener('click', () => switchScreen('howto-menu'));
document.getElementById('btn-back-howto').addEventListener('click', () => switchScreen('main-menu'));
document.getElementById('btn-select-level').addEventListener('click', () => {
    renderLevelGrid();
    switchScreen('level-menu');
});
document.getElementById('btn-back-menu').addEventListener('click', () => switchScreen('main-menu'));
document.getElementById('btn-close-scan').addEventListener('click', () => {
    document.getElementById('scan-modal').style.display = 'none';
});

// สลับการแสดงผลหน้าจอ
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// สร้างปุ่มเลือกด่าน
function renderLevelGrid() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    levels.forEach(lvl => {
        const btn = document.createElement('button');
        btn.className = `btn-sci ${lvl.id > gameState.unlockedLevels ? 'disabled' : ''}`;
        btn.innerText = `ด่าน ${lvl.id}`;
        btn.onclick = () => {
            if (lvl.id <= gameState.unlockedLevels) {
                gameState.currentLevel = lvl.id;
                loadLevel(lvl.id);
            }
        };
        grid.appendChild(btn);
    });
}

// โหลดข้อมูลด่าน
function loadLevel(levelNum) {
    gameState.currentLevel = levelNum;
    switchScreen('game-screen');
    const lvl = levels[levelNum - 1];
    
    // ตั้งค่าตัวละคร
    player.x = 80;
    player.y = 440;

    // อัปเดต HUD และ AI
    document.getElementById('hud-level').innerText = levelNum;
    document.getElementById('ai-text').innerText = `ภารกิจ: ${lvl.title} - ${lvl.hint}`;

    startTimer();
    requestAnimationFrame(gameLoop);
}

// ระบบนับเวลา
function startTimer() {
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
        gameState.time++;
        const mins = String(Math.floor(gameState.time / 60)).padStart(2, '0');
        const secs = String(gameState.time % 60).padStart(2, '0');
        document.getElementById('hud-timer').innerText = `${mins}:${secs}`;
    }, 1000);
}

// ลูปหลักของเกม (Game Loop)
function gameLoop() {
    if (!document.getElementById('game-screen').classList.contains('active')) return;

    updatePlayer();
    render();

    requestAnimationFrame(gameLoop);
}

// อัปเดตการเคลื่อนที่ของผู้เล่น
function updatePlayer() {
    let dx = 0, dy = 0;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

    player.x += dx * player.speed;
    player.y += dy * player.speed;

    // จำกัดขอบเขตหน้าจอ
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));

    // เช็คการเก็บพลังงาน
    const lvl = levels[gameState.currentLevel - 1];
    lvl.energies.forEach(e => {
        if (!e.collected && Math.hypot(player.x - e.x, player.y - e.y) < player.size + 10) {
            e.collected = true;
            gameState.energy += 20;
            gameState.score += 100;
            soundManager.playCollect();
            document.getElementById('hud-energy').innerText = gameState.energy;
            document.getElementById('hud-score').innerText = gameState.score;
        }
    });
}

// การวาดภาพองค์ประกอบใน Canvas (Render Engine)
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const lvl = levels[gameState.currentLevel - 1];

    // 1. วาดวัตถุในฉาก
    lvl.objects.forEach(obj => {
        ctx.save();
        if (obj.type === 'block') {
            ctx.fillStyle = '#3a4760';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
        } else if (obj.type === 'mirror') {
            ctx.translate(obj.x, obj.y);
            ctx.rotate((obj.angle * Math.PI) / 180);
            ctx.fillStyle = '#00f3ff';
            ctx.fillRect(-25, -5, 50, 10);
        } else if (obj.type === 'medium') {
            ctx.fillStyle = 'rgba(0, 243, 255, 0.2)';
            ctx.strokeStyle = '#00f3ff';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
        } else if (obj.type === 'prism') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y - 30);
            ctx.lineTo(obj.x - 30, obj.y + 30);
            ctx.lineTo(obj.x + 30, obj.y + 30);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        } else if (obj.type === 'lens-convex') {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(obj.x, obj.y, 10, 40, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffff00';
            ctx.stroke();
        }
        ctx.restore();
    });

    // 2. วาดพลังงานที่ลอยอยู่
    lvl.energies.forEach(e => {
        if (!e.collected) {
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0055';
        }
    });

    // 3. วาดจุดรับพลังงาน (Targets)
    let allTargetsActive = true;
    lvl.targets.forEach(t => {
        ctx.fillStyle = t.active ? t.color : '#333';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 3;
        ctx.stroke();
        if (!t.active) allTargetsActive = false;
    });

    // 4. จำลองลำแสง (Light Propagation Logic)
    lvl.lightSources.forEach(src => {
        traceRay(src.x, src.y, src.angle, src.color, lvl);
    });

    // 5. วาดตัวละครนักวิทยาศาสตร์
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f3ff';
    ctx.fillStyle = '#00f3ff';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // เช็คการเคลียร์ด่าน
    if (allTargetsActive && lvl.targets.length > 0) {
        soundManager.playWin();
        if (gameState.currentLevel < levels.length) {
            gameState.unlockedLevels = Math.max(gameState.unlockedLevels, gameState.currentLevel + 1);
            alert(`ยินดีด้วย! คุณผ่านด่าน ${gameState.currentLevel}`);
            gameState.currentLevel++;
            loadLevel(gameState.currentLevel);
        } else {
            alert("ยินดีด้วย! คุณฟื้นฟูพลังงานให้ LUMEN CITY สำเร็จแล้ว!");
            switchScreen('main-menu');
        }
    }
}

// ฟังก์ชันจำลองเส้นทางของลำแสง (Raytracing Engine)
function traceRay(x, y, angle, color, lvl) {
    let currX = x;
    let currY = y;
    let dirX = Math.cos(angle);
    let dirY = Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(currX, currY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;

    for (let step = 0; step < 600; step++) {
        currX += dirX * 2;
        currY += dirY * 2;

        // เช็คการชนเป้าหมาย
        lvl.targets.forEach(t => {
            if (Math.hypot(currX - t.x, currY - t.y) < 15) {
                if (color === t.color || t.color === '#ffffff') {
                    t.active = true;
                }
            }
        });

        // เช็คการสะท้อนกระจก
        let hitObject = false;
        lvl.objects.forEach(obj => {
            if (obj.type === 'mirror') {
                if (Math.hypot(currX - obj.x, currY - obj.y) < 20) {
                    const normalAngle = (obj.angle * Math.PI) / 180;
                    const incomingAngle = Math.atan2(dirY, dirX);
                    const reflectAngle = 2 * normalAngle - incomingAngle;
                    dirX = Math.cos(reflectAngle);
                    dirY = Math.sin(reflectAngle);
                    hitObject = true;
                }
            } else if (obj.type === 'prism') {
                if (Math.hypot(currX - obj.x, currY - obj.y) < 25 && color === '#ffffff') {
                    // แยกแสงขาวออกเป็นแดงและน้ำเงิน
                    traceRay(currX, currY, angle - 0.3, '#ff0000', lvl);
                    traceRay(currX, currY, angle + 0.3, '#0055ff', lvl);
                    hitObject = true;
                }
            } else if (obj.type === 'lens-convex') {
                if (Math.hypot(currX - obj.x, currY - obj.y) < 20) {
                    // รวมแสงเข้าหาแกนกลาง
                    dirY = (250 - currY) * 0.01;
                    hitObject = true;
                }
            }
        });

        if (currX < 0 || currX > canvas.width || currY < 0 || currY > canvas.height) break;
    }
    ctx.lineTo(currX, currY);
    ctx.stroke();
}

// ปุ่มปฏิสัมพันธ์และการใช้เครื่องมือ (Interactive Buttons)
document.getElementById('btn-action-rotate').onclick = () => {
    const lvl = levels[gameState.currentLevel - 1];
    lvl.objects.forEach(obj => {
        if (Math.hypot(player.x - obj.x, player.y - obj.y) < 60 && obj.angle !== undefined) {
            obj.angle = (obj.angle + 45) % 360;
            soundManager.playRotate();
        }
    });
};

document.getElementById('btn-action-scan').onclick = () => {
    const lvl = levels[gameState.currentLevel - 1];
    let found = false;
    lvl.objects.forEach(obj => {
        if (Math.hypot(player.x - obj.x, player.y - obj.y) < 80) {
            document.getElementById('scan-title').innerText = obj.title || "วัตถุทางวิทยาศาสตร์";
            document.getElementById('scan-desc').innerText = obj.desc || "ไม่มีข้อมูลในระบบ";
            document.getElementById('scan-modal').style.display = 'flex';
            found = true;
        }
    });
    if (!found) {
        document.getElementById('scan-title').innerText = "ผลการสแกนพื้นที่";
        document.getElementById('scan-desc').innerText = "ไม่พบวัตถุทางวิทยาศาสตร์ในระยะใกล้";
        document.getElementById('scan-modal').style.display = 'flex';
    }
};

document.getElementById('btn-action-hint').onclick = () => {
    if (gameState.energy >= 10) {
        gameState.energy -= 10;
        document.getElementById('hud-energy').innerText = gameState.energy;
        const lvl = levels[gameState.currentLevel - 1];
        document.getElementById('ai-text').innerText = `คำใบ้ AI: ${lvl.hint}`;
    } else {
        alert("พลังงาน LUMEN ENERGY ไม่เพียงพอ!");
    }
};

// การกดปุ่มสัมผัสสำหรับมือถือ
const bindTouch = (id, keyName) => {
    const btn = document.getElementById(id);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyName] = true; });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; });
};
bindTouch('btn-up', 'ArrowUp');
bindTouch('btn-down', 'ArrowDown');
bindTouch('btn-left', 'ArrowLeft');
bindTouch('btn-right', 'ArrowRight');
