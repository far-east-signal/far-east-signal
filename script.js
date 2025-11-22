const canvas = document.getElementById("particleCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* ============================================
   STAR FIELD SETTINGS
============================================ */
const particleCount = 45;
const particles = [];

function random(min, max) {
    return Math.random() * (max - min) + min;
}

/* ============================================
   STAR CLASS (★①〜③すべて統合済み)
============================================ */
class Particle {
    constructor() {
        this.x = random(0, canvas.width);
        this.y = random(0, canvas.height);
        this.radius = random(0.6, 1.5);

        // ② Color temperature variation
        this.colorShift = Math.random() * 20 - 10;

        // ① Individual twinkle speed
        this.twinkleSpeed = Math.random() * 0.008 + 0.003;

        // Initial brightness
        this.alpha = Math.random() * 0.6 + 0.4;
        this.alphaDirection = Math.random() < 0.5 ? -1 : 1;

        // Movement speed (super slow drift)
        this.speedX = random(-0.05, 0.05);
        this.speedY = random(-0.05, 0.05);
    }

    update() {
        /* ------------------------------
           ① Twinkle up/down
        ------------------------------ */
        this.alpha += this.twinkleSpeed * this.alphaDirection;

        if (this.alpha >= 1) {
            this.alpha = 1;
            this.alphaDirection = -1;
        }
        if (this.alpha <= 0.35) {
            this.alpha = 0.35;
            this.alphaDirection = 1;
        }

        /* ------------------------------
           ③ Micro drift movement
        ------------------------------ */
        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around edges
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    draw() {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${200 + this.colorShift}, ${220 + this.colorShift}, 255, ${this.alpha})`;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

/* ============================================
   CREATE STARS
============================================ */
for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
}

/* ============================================
   ANIMATE LOOP
============================================ */
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}
animate();

/* ============================================
   RESPONSIVE
============================================ */
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

/* ============================================
   FOG — Random Motion System
============================================ */

function randomFogMovement(id) {
    const fog = document.getElementById(id);
    if (!fog) return;

    setInterval(() => {
        const rotate = (Math.random() * 20 - 10);
        const scale = 1 + (Math.random() * 1.02);

        fog.style.transform =
            `translate(-50%, -50%) rotate(${rotate}deg) scale(${scale})`;

    }, 6000);
}

["fog-1", "fog-2", "fog-3", "fog-4", "fog-5"].forEach(id => {
    randomFogMovement(id);
});

/* ============================================
   FOG — Random Drift Motion
============================================ */

function randomFogTransform() {
    const offset = 20;
    const randomX = (Math.random() - 0.5) * offset;
    const randomY = (Math.random() - 0.5) * offset;
    const randomRotate = (Math.random() - 0.5) * 4;
    const randomScale = 1 + (Math.random() - 0.5) * 0.02;

    return `translate(calc(-50% + ${randomX}px), calc(-50% + ${randomY}px)) rotate(${randomRotate}deg) scale(${randomScale})`;
}

function moveFogRandomly() {
    const fogs = document.querySelectorAll(".fog-layer");
    fogs.forEach(fog => {
        fog.style.transform = randomFogTransform();
    });
}

setInterval(moveFogRandomly, 5000);
moveFogRandomly();
