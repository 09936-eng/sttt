/**
 * LUMEN LOST – ผู้พิทักษ์แสง
 * HTML5 Canvas 2D Light Physics Engine
 */

// Global Game State
const state = {
    currentLevel: 0,
    energy: 100,
    score: 0,
    timeSeconds: 0,
    soundEnabled: true,
    timerInterval: null,
    isLevelComplete: false
};

// Web Audio API Synthesizer Sound System
class SoundSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playTone(freq, type = 'sine', duration = 0.1) {
        if (!state.soundEnabled) return;
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
        } catch (e) {}
    }

    btnClick() { this.playTone(800, 'square', 0.05); }
    collectEnergy() { this.playTone(1200, 'sine', 0.15); }
    success() { 
        this.playTone(523.25, 'triangle', 0.1); 
        setTimeout(() => this.playTone(659.25, 'triangle', 0.1), 100);
        setTimeout(() => this.playTone(783.99, 'triangle', 0.2), 200);
    }
}
const sounds = new SoundSystem();

// Data Configuration สำหรับแต่ละด่าน (ทั้ง 6 ด่าน)
const levelConfigs = [
    {
        name: "1: Shadow Awakening",
        concept: "เงาเกิดจากวัตถุทึบแสงขวางทางเดินแสง",
        hint: "ขยับกล่องทึบแสงไปตั้งรับแสง เพื่อทอดเงาเปิดสวิตช์พลังงานที่ซ่อนอยู่!",
        source: { x: 100, y: 250, angle: 0, color: "#ffffff" },
        targets: [{ x: 700, y: 250, color: "#ffffff", active: false }],
        objects: [
            { type: 'box', x: 350, y: 180, w: 60, h: 140, draggable: true }
        ],
        shadowSensors: [{ x: 500, y: 250, size: 20, active: false }]
    },
    {
        name: "2: Mirror Maze",
        concept: "การสะท้อน: มุมตกกระทบเท่ากับมุมสะท้อน",
        hint: "คลิกที่กระจกเพื่อหมุน ทำมุมสะท้อนแสงไปยังเครื่องรับพลังงาน!",
        source: { x: 100, y: 100, angle: 0, color: "#00f3ff" },
        targets: [{ x: 700, y: 400, color: "#00f3ff", active: false }],
        objects: [
            { type: 'mirror', x: 400, y: 100, angle: 45, draggable: false },
            { type: 'mirror', x: 400, y: 400, angle: 135, draggable: false }
        ]
    },
    {
        name: "3: Refraction Lab",
        concept: "การหักเห: แสงเบี่ยงเบนเมื่อเปลี่ยนตัวกลาง",
        hint: "ลำแสงจะเบี่ยงเบนเมื่อผ่านบล็อกแก้ว ปรับตำแหน่งบล็อกให้เบนแสงลงเครื่องรับ!",
        source: { x: 100, y: 200, angle: 0.1, color: "#00ffcc" },
        targets: [{ x: 700, y: 350, color: "#00ffcc", active: false }],
        objects: [
            { type: 'medium', x: 350, y: 150, w: 100, h: 200, n: 1.5, draggable: true } // n คือดรรชนีหักเห
        ]
    },
    {
        name: "4: Prism Code",
        concept: "การกระจายแสง: แสงขาวแยกเป็นสเปกตรัมเมื่อผ่านปริซึม",
        hint: "ยิงแสงขาวผ่านปริซึมเพื่อแยกสี จากนั้นนำแสงสีที่ได้แยกย้ายเข้าเครื่องรับ!",
        source: { x: 100, y: 250, angle: 0, color: "#ffffff" },
        targets: [
            { x: 700, y: 150, color: "#ff0055", active: false },
            { x: 700, y: 350, color: "#0088ff", active: false }
        ],
        objects: [
            { type: 'prism', x: 350, y: 250, draggable: true }
        ]
    },
    {
        name: "5: Lens Dimension",
        concept: "เลนส์นูนรวมแสง / เลนส์เว้ากระจายแสง",
        hint: "เลนส์นูนจะช่วยเบนลำแสงขนานมารวมกันที่จุดโฟกัสเป้าหมาย!",
        source: { x: 100, y: 200, angle: 0, color: "#ffff00" },
        targets: [{ x: 700, y: 250, color: "#ffff00", active: false }],
        objects: [
            { type: 'convex_lens', x: 350, y: 200, draggable: true }
        ]
    },
    {
        name: "6: Optical Core",
        concept: "บูรณาการทัศนูปกรณ์เพื่อฟื้นฟูเมือง",
        hint: "ผสมผสาน กระจก ปริซึม และเลนส์ แก้ปริศนาทั้งหมดพร้อมกัน!",
        source: { x: 80, y: 150, angle: 0, color: "#ffffff" },
        targets: [
            { x: 720, y: 100, color: "#ff0055", active: false },
            { x: 720, y: 400, color: "#0088ff", active: false }
        ],
        objects: [
            { type: 'prism', x: 250, y: 150, draggable: false },
            { type: 'mirror', x: 450, y: 80, angle: 45, draggable: true },
            { type: 'convex_lens', x: 500, y: 350, draggable: true }
        ]
    }
];

// Player Entity Class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 18;
        this.speed = 4;
        this.color = "#00f3ff";
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // แว่นตามุมมอง Sci-Fi Scanner
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(this.x - 5, this.y - 6, 10, 4);
        ctx.restore();
    }
}

// Main Game Controller
class Game {
    constructor() {
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.player = new Player(50, 430);
        this.keys = {};
        this.draggedObj = null;
        
        this.initEvents();
    }

    initEvents() {
        // Keyboard Controls
        window.addEventListener("keydown", (e) => this.keys[e.key] = true);
        window.addEventListener("keyup", (e) => this.keys[e.key] = false);

        // Mouse Drag / Touch Controls สำหรับย้ายและหมุนอุปกรณ์
        this.canvas.addEventListener("mousedown", (e) => this.handleInputStart(e.offsetX, e.offsetY));
        this.canvas.addEventListener("mousemove", (e) => this.handleInputMove(e.offsetX, e.offsetY));
        this.canvas.addEventListener("mouseup", () => this.draggedObj = null);

        // UI Event Listeners
        document.getElementById("btn-start").onclick = () => { sounds.btnClick(); this.loadLevel(0); this.switchScreen("game-screen"); };
        document.getElementById("btn-levels").onclick = () => { sounds.btnClick(); this.switchScreen("level-menu"); };
        document.getElementById("btn-how-to").onclick = () => { sounds.btnClick(); this.switchScreen("howto-menu"); };
        document.getElementById("btn-back-menu").onclick = () => { sounds.btnClick(); this.switchScreen("main-menu"); };
        document.getElementById("btn-back-howto").onclick = () => { sounds.btnClick(); this.switchScreen("main-menu"); };
        document.getElementById("btn-hint").onclick = () => this.useHint();

        // Level Select Buttons
        document.querySelectorAll(".level-card").forEach(btn => {
            btn.onclick = (e) => {
                const lvl = parseInt(e.target.dataset.level);
                sounds.btnClick();
                this.loadLevel(lvl);
                this.switchScreen("game-screen");
            };
        });

        document.getElementById("btn-next-level").onclick = () => {
            sounds.btnClick();
            if (state.currentLevel < levelConfigs.length - 1) {
                this.loadLevel(state.currentLevel + 1);
                this.switchScreen("game-screen");
            } else {
                this.switchScreen("main-menu");
            }
        };

        // Mobile Controls setup
        this.setupMobileControls();
    }

    setupMobileControls() {
        const bindDpad = (id, key) => {
            const el = document.getElementById(id);
            el.addEventListener("touchstart", (e) => { e.preventDefault(); this.keys[key] = true; });
            el.addEventListener("touchend", (e) => { e.preventDefault(); this.keys[key] = false; });
        };
        bindDpad("btn-up", "ArrowUp");
        bindDpad("btn-down", "ArrowDown");
        bindDpad("btn-left", "ArrowLeft");
        bindDpad("btn-right", "ArrowRight");
        
        document.getElementById("btn-scan").onclick = () => this.scanEnvironment();
    }

    switchScreen(id) {
        document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
        document.getElementById(id).classList.add("active");
    }

    loadLevel(index) {
        state.currentLevel = index;
        state.isLevelComplete = false;
        const config = levelConfigs[index];
        this.levelData = JSON.parse(JSON.stringify(config)); // Deep copy
        this.player.x = 60;
        this.player.y = 430;

        document.getElementById("hud-level-name").innerText = index + 1;
        document.getElementById("ai-text").innerText = this.levelData.concept;
        
        this.startTimer();
    }

    startTimer() {
        clearInterval(state.timerInterval);
        state.timeSeconds = 0;
        state.timerInterval = setInterval(() => {
            state.timeSeconds++;
            const m = String(Math.floor(state.timeSeconds / 60)).padStart(2, '0');
            const s = String(state.timeSeconds % 60).padStart(2, '0');
            document.getElementById("hud-timer").innerText = `${m}:${s}`;
        }, 1000);
    }

    useHint() {
        if (state.energy >= 10) {
            state.energy -= 10;
            document.getElementById("hud-energy").innerText = state.energy;
            document.getElementById("ai-text").innerText = `💡 คำใบ้: ${this.levelData.hint}`;
            sounds.btnClick();
        } else {
            document.getElementById("ai-text").innerText = "⚠️ พลังงาน LUMEN ไม่เพียงพอสำหรับขอคำใบ้!";
        }
    }

    scanEnvironment() {
        sounds.btnClick();
        document.getElementById("ai-text").innerText = `🔍 SCANNER: ตรวจพบหลักการ -> ${this.levelData.concept}`;
    }

    handleInputStart(x, y) {
        // ตรวจสอบการคลิกที่อุปกรณ์เพื่อลาก หรือหมุนกระจก
        if (!this.levelData) return;
        this.levelData.objects.forEach(obj => {
            if (obj.draggable && x >= obj.x - 30 && x <= obj.x + 30 && y >= obj.y - 30 && y <= obj.y + 30) {
                this.draggedObj = obj;
            } else if (obj.type === 'mirror' && Math.hypot(obj.x - x, obj.y - y) < 25) {
                // หมุนกระจกทีละ 45 องศาเมื่อคลิก
                obj.angle = (obj.angle + 45) % 360;
                sounds.btnClick();
            }
        });
    }

    handleInputMove(x, y) {
        if (this.draggedObj) {
            this.draggedObj.x = Math.max(50, Math.min(750, x));
            this.draggedObj.y = Math.max(50, Math.min(450, y));
        }
    }

    update() {
        // Player Movement Logic
        if (this.keys["ArrowLeft"] || this.keys["a"]) this.player.x -= this.player.speed;
        if (this.keys["ArrowRight"] || this.keys["d"]) this.player.x += this.player.speed;
        if (this.keys["ArrowUp"] || this.keys["w"]) this.player.y -= this.player.speed;
        if (this.keys["ArrowDown"] || this.keys["s"]) this.player.y += this.player.speed;

        // Bounding limits
        this.player.x = Math.max(20, Math.min(780, this.player.x));
        this.player.y = Math.max(20, Math.min(480, this.player.y));
    }

    // Ray Tracing Engine สำหรับจำลองลำแสงความเร็วสูง
    traceBeams() {
        if (!this.levelData) return;
        const src = this.levelData.source;
        let beams = [{ x: src.x, y: src.y, angle: src.angle, color: src.color }];
        
        // รีเซ็ตเป้าหมาย
        this.levelData.targets.forEach(t => t.active = false);

        let iter = 0;
        while (beams.length > 0 && iter < 10) {
            iter++;
            let nextBeams = [];
            
            beams.forEach(beam => {
                let currentX = beam.x;
                let currentY = beam.y;
                let rad = beam.angle * Math.PI / 180;
                let dirX = Math.cos(rad);
                let dirY = Math.sin(rad);

                let hit = false;
                for (let step = 0; step < 800; step += 4) {
                    currentX += dirX * 4;
                    currentY += dirY * 4;

                    // วาดเส้นลำแสงเรืองแสง
                    this.ctx.shadowBlur = 8;
                    this.ctx.shadowColor = beam.color;
                    this.ctx.strokeStyle = beam.color;
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.moveTo(currentX - dirX * 4, currentY - dirY * 4);
                    this.ctx.lineTo(currentX, currentY);
                    this.ctx.stroke();

                    // Check interaction กับวัตถุในระดับ
                    for (let obj of this.levelData.objects) {
                        // 1. Mirror Reflection
                        if (obj.type === 'mirror' && Math.hypot(obj.x - currentX, obj.y - currentY) < 20) {
                            let normalAngle = obj.angle + 90;
                            let newAngle = (2 * normalAngle - beam.angle) % 360;
                            nextBeams.push({ x: currentX, y: currentY, angle: newAngle, color: beam.color });
                            hit = true; break;
                        }
                        // 2. Prism Dispersion
                        if (obj.type === 'prism' && Math.hypot(obj.x - currentX, obj.y - currentY) < 25) {
                            nextBeams.push({ x: currentX, y: currentY, angle: -20, color: "#ff0055" });
                            nextBeams.push({ x: currentX, y: currentY, angle: 20, color: "#0088ff" });
                            hit = true; break;
                        }
                        // 3. Convex Lens Convergence
                        if (obj.type === 'convex_lens' && Math.hypot(obj.x - currentX, obj.y - currentY) < 25) {
                            nextBeams.push({ x: currentX, y: currentY, angle: beam.angle + 15, color: beam.color });
                            hit = true; break;
                        }
                        // 4. Medium Refraction
                        if (obj.type === 'medium' && currentX > obj.x - obj.w/2 && currentX < obj.x + obj.w/2 &&
                            currentY > obj.y - obj.h/2 && currentY < obj.y + obj.h/2) {
                            // จำลองการหักเหลงด้านล่างเล็กน้อย
                            dirY += 0.05;
                        }
                    }

                    // Check Collision กับเป้าหมาย (Targets)
                    this.levelData.targets.forEach(target => {
                        if (Math.hypot(target.x - currentX, target.y - currentY) < 20) {
                            if (target.color === beam.color || target.color === "#ffffff") {
                                target.active = true;
                            }
                        }
                    });

                    if (hit || currentX < 0 || currentX > 800 || currentY < 0 || currentY > 500) break;
                }
            });
            beams = nextBeams;
        }

        this.checkWinCondition();
    }

    checkWinCondition() {
        const allTargetsHit = this.levelData.targets.every(t => t.active);
        if (allTargetsHit && !state.isLevelComplete) {
            state.isLevelComplete = true;
            sounds.success();
            clearInterval(state.timerInterval);
            
            // เพิ่มคะแนน
            const bonusScore = Math.max(100, 500 - state.timeSeconds * 5);
            state.score += bonusScore;
            document.getElementById("hud-score").innerText = state.score;

            // แสดง Modal ชัยชนะ
            document.getElementById("final-score").innerText = state.score;
            document.getElementById("final-time").innerText = document.getElementById("hud-timer").innerText;
            this.switchScreen("victory-screen");
        }
    }

    render() {
        // Clear screen
        this.ctx.fillStyle = "#070913";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Render Background Grid Sci-Fi
        this.ctx.strokeStyle = "rgba(0, 243, 255, 0.05)";
        this.ctx.lineWidth = 1;
        for (let x = 0; x < 800; x += 40) {
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, 500); this.ctx.stroke();
        }
        for (let y = 0; y < 500; y += 40) {
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(800, y); this.ctx.stroke();
        }

        if (!this.levelData) return;

        // Render Source
        const src = this.levelData.source;
        this.ctx.fillStyle = "#ffffff";
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = src.color;
        this.ctx.beginPath();
        this.ctx.arc(src.x, src.y, 12, 0, Math.PI * 2);
        this.ctx.fill();

        // Render Targets
        this.levelData.targets.forEach(t => {
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = t.active ? "#00ffce" : t.color;
            this.ctx.fillStyle = t.active ? t.color : "transparent";
            this.ctx.shadowBlur = t.active ? 20 : 5;
            this.ctx.shadowColor = t.color;
            this.ctx.beginPath();
            this.ctx.arc(t.x, t.y, 18, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.fill();
        });

        // Render Objects (Mirrors, Prisms, Lenses, Mediums)
        this.levelData.objects.forEach(obj => {
            this.ctx.save();
            this.ctx.translate(obj.x, obj.y);
            
            if (obj.type === 'mirror') {
                this.ctx.rotate((obj.angle || 0) * Math.PI / 180);
                this.ctx.strokeStyle = "#00f3ff";
                this.ctx.lineWidth = 6;
                this.ctx.beginPath();
                this.ctx.moveTo(-20, 0);
                this.ctx.lineTo(20, 0);
                this.ctx.stroke();
            } else if (obj.type === 'prism') {
                this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
                this.ctx.strokeStyle = "#ffffff";
                this.ctx.beginPath();
                this.ctx.moveTo(0, -20);
                this.ctx.lineTo(-20, 20);
                this.ctx.lineTo(20, 20);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
            } else if (obj.type === 'medium') {
                this.ctx.fillStyle = "rgba(0, 150, 255, 0.25)";
                this.ctx.strokeStyle = "rgba(0, 243, 255, 0.8)";
                this.ctx.fillRect(-obj.w/2, -obj.h/2, obj.w, obj.h);
                this.ctx.strokeRect(-obj.w/2, -obj.h/2, obj.w, obj.h);
            } else if (obj.type === 'convex_lens') {
                this.ctx.fillStyle = "rgba(0, 255, 200, 0.3)";
                this.ctx.strokeStyle = "#00ffce";
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, 10, 25, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            } else if (obj.type === 'box') {
                this.ctx.fillStyle = "#334455";
                this.ctx.strokeStyle = "#556677";
                this.ctx.fillRect(-obj.w/2, -obj.h/2, obj.w, obj.h);
                this.ctx.strokeRect(-obj.w/2, -obj.h/2, obj.w, obj.h);
            }

            this.ctx.restore();
        });

        // Process Optics Physics Ray Tracing
        this.traceBeams();

        // Render Player
        this.player.draw(this.ctx);
    }

    loop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.loop());
    }
}

// Start Game Loop เมื่อโหลดหน้าเว็บเสร็จสิ้น
window.onload = () => {
    const game = new Game();
    game.loop();
};
