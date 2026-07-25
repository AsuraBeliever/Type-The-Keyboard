
const FALLBACK_WORDS_ES = [
    "gato", "mesa", "libro", "casa", "perro", "luna", "sol", "agua", "fuego", "tierra",
    "mundo", "tiempo", "vida", "mano", "noche", "dia", "hombre", "mujer", "ola", "puerta",
    "camino", "piedra", "rio", "bosque", "campo", "pluma", "reloj", "cuerpo", "mente", "calle",
    "barco", "juego", "flor", "viento", "lago", "monte", "playa", "hierba", "nube", "roca",
    "silla", "techo", "piso", "carro", "muro", "humo", "pasto", "sombra", "forma", "grupo"
];

const FALLBACK_WORDS_EN = [
    "house", "water", "light", "world", "stone", "dream", "river", "cloud", "flame", "music",
    "plant", "chair", "table", "green", "storm", "brain", "clock", "dance", "earth", "glass",
    "heart", "knife", "lemon", "night", "ocean", "piano", "queen", "robot", "snake", "tower",
    "bread", "candy", "tiger", "whale", "field", "grain", "horse", "judge", "maple", "novel",
    "pearl", "quilt", "train", "voice", "witch", "bloom", "crest", "drift", "frost", "globe"
];

/**
 * Construye oraciones de 5 palabras a partir del banco de palabras de fallback.
 * @param {string} language - 'es' o 'en'
 * @param {string} difficulty - 'easy', 'medium', 'hard'
 * @returns {string[]} Array de oraciones (strings de 5 palabras)
 */
function buildFallbackSentences(language = 'es', difficulty = 'medium') {
    const wordsPool = language === 'en' ? [...FALLBACK_WORDS_EN] : [...FALLBACK_WORDS_ES];
    const wordsPerSentence = 5;
    const sentenceCount = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 6 : 5;

    // Mezclar palabras aleatoriamente
    for (let i = wordsPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wordsPool[i], wordsPool[j]] = [wordsPool[j], wordsPool[i]];
    }

    const sentences = [];
    for (let i = 0; i < sentenceCount; i++) {
        const start = i * wordsPerSentence;
        const chunk = wordsPool.slice(start, start + wordsPerSentence);
        if (chunk.length === wordsPerSentence) {
            sentences.push(chunk.join(' '));
        }
    }

    return sentences;
}

// URL de la API de palabras en español
const SENTENCES_API_URL = 'https://random-word-api.herokuapp.com/word';

/**
 * Verifica si una palabra parece ser español válido para el juego.
 * Filtra palabras en inglés, con mayúsculas raras, espacios, acentos o caracteres no válidos.
 */
function isValidSpanishWord(word) {
    // Rechazar palabras vacías o muy cortas
    if (!word || word.length < 2) return false;
    // Rechazar palabras con espacios (frases compuestas)
    if (word.includes(' ')) return false;
    // Rechazar palabras que empiezan con mayúscula (nombres propios / inglés)
    if (word[0] !== word[0].toLowerCase()) return false;
    // Solo aceptar letras sin acento (a-z, ñ) — sin tildes para facilitar la escritura
    if (!/^[a-zñ]+$/.test(word)) return false;
    // Rechazar palabras con patrones típicos del inglés
    if (/th|sh|wh|ck|ght|ph|ow|aw|ew|wn|wr|kn|oo|ee|tt|ll$/.test(word)) return false;
    // Rechazar terminaciones comunes del inglés
    if (/ing$|tion$|ness$|ment$|ful$|less$|ous$|ive$|ble$|ly$|er$|ed$|ght$|tch$/.test(word)) return false;
    // Rechazar palabras que empiecen con combinaciones raras en español
    if (/^(wh|th|sh|ph|kn|wr|tw|sw|sc|sk|sl|sm|sn|sp|st|str|spr)/.test(word)) return false;
    return true;
}

/**
 * Verifica si una palabra parece ser inglés válido para el juego.
 * Filtra palabras en español, con acentos, ñ, o caracteres no ingleses.
 */
function isValidEnglishWord(word) {
    // Rechazar palabras vacías o muy cortas
    if (!word || word.length < 2) return false;
    // Rechazar palabras con espacios
    if (word.includes(' ')) return false;
    // Rechazar palabras que empiezan con mayúscula (nombres propios)
    if (word[0] !== word[0].toLowerCase()) return false;
    // Solo aceptar letras inglesas (a-z sin ñ ni acentos)
    if (!/^[a-z]+$/.test(word)) return false;
    // Rechazar palabras con ñ o patrones típicos del español
    if (/ñ|ción|mente$|idad$|ismo$|ista$/.test(word)) return false;
    return true;
}

/**
 * Carga palabras desde la API externa y las agrupa en oraciones.
 * Si la API falla, usa el fallback local.
 * @param {string} language - Idioma ('es' o 'en')
 * @param {string} difficulty - Dificultad ('easy', 'medium', 'hard')
 * @returns {Promise<string[]>} Array de oraciones
 */
async function fetchSentences(language = 'es', difficulty = 'medium') {
    if (!SENTENCES_API_URL) {
        console.log('API no configurada, usando oraciones de fallback');
        showApiFallbackNotification(language);
        return buildFallbackSentences(language, difficulty);
    }

    // Determinar cantidad de palabras según dificultad
    const wordsPerSentence = 5;
    const sentenceCount = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 6 : 5;
    const totalWords = wordsPerSentence * sentenceCount;

    // Pedir más palabras de las necesarias para compensar las que se filtren
    const requestCount = totalWords * 3;

    // Seleccionar idioma para la API y filtro correspondiente
    const apiLang = language === 'en' ? 'en' : 'es';
    const wordFilter = language === 'en' ? isValidEnglishWord : isValidSpanishWord;
    const fallback = buildFallbackSentences(language, difficulty);

    try {
        const response = await fetch(`${SENTENCES_API_URL}?lang=${apiLang}&number=${requestCount}`);

        if (!response.ok) {
            throw new Error(`API respondió con status ${response.status}`);
        }

        const words = await response.json();

        if (!Array.isArray(words) || words.length === 0) {
            throw new Error('Formato de respuesta inválido o sin palabras');
        }

        // Filtrar: solo palabras válidas del idioma seleccionado
        const cleanWords = words
            .map(w => w.toLowerCase().trim())
            .filter(wordFilter)
            .slice(0, totalWords);

        if (cleanWords.length < wordsPerSentence) {
            throw new Error(`Solo se obtuvieron ${cleanWords.length} palabras válidas`);
        }

        // Agrupar palabras en oraciones
        const sentences = [];
        for (let i = 0; i < cleanWords.length; i += wordsPerSentence) {
            const chunk = cleanWords.slice(i, i + wordsPerSentence);
            if (chunk.length === wordsPerSentence) {
                sentences.push(chunk.join(' '));
            }
        }

        if (sentences.length === 0) {
            throw new Error('No se pudieron formar oraciones completas');
        }

        console.log(`Cargadas ${sentences.length} oraciones en ${apiLang} desde API (${cleanWords.length} palabras)`);
        return sentences;

    } catch (error) {
        console.warn('Error al cargar palabras desde API:', error.message);
        console.log('Usando oraciones de fallback');
        showApiFallbackNotification(language);
        return fallback;
    }
}

/**
 * Muestra una notificación visual al usuario indicando que la API de palabras
 * no está disponible y se están usando oraciones locales de respaldo.
 * El mensaje se muestra en el idioma seleccionado por el jugador.
 * @param {string} language - 'es' o 'en'
 */
function showApiFallbackNotification(language = 'es') {
    // Evitar duplicados si ya existe una notificación activa
    const existing = document.querySelector('.api-fallback-notification');
    if (existing) existing.remove();

    const messages = {
        es: {
            title: 'API no disponible',
            message: 'Se están usando palabras locales de respaldo. El juego funciona con normalidad.'
        },
        en: {
            title: 'API unavailable',
            message: 'Using local fallback words. The game works normally.'
        }
    };

    const msg = messages[language] || messages.es;

    const notification = document.createElement('div');
    notification.className = 'api-fallback-notification';
    notification.innerHTML = `
        <div class="api-fallback-icon">⚠️</div>
        <div class="api-fallback-content">
            <div class="api-fallback-title">${msg.title}</div>
            <div class="api-fallback-message">${msg.message}</div>
        </div>
        <button class="api-fallback-close" onclick="this.parentElement.remove()">✕</button>
    `;
    document.body.appendChild(notification);

    // Auto-remove después de 6 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) notification.remove();
            }, 500);
        }
    }, 6000);
}

// Variable que almacena las oraciones cargadas para la partida actual
let sentenceBank = buildFallbackSentences('es', 'medium');

// --- COMBO MANAGER CLASS ---
class ComboManager {
    constructor() {
        this.comboCount = 0;
        this.multiplier = 1;
        this.highestCombo = 0;
    }

    incrementCombo() {
        this.comboCount++;
        if (this.comboCount > this.highestCombo) {
            this.highestCombo = this.comboCount;
        }
        this.multiplier = this.calculateMultiplier(this.comboCount);
        this.updateUI();
    }

    resetCombo() {
        this.comboCount = 0;
        this.multiplier = 1;
        this.updateUI();
    }

    getCurrentCombo() {
        return this.comboCount;
    }

    getMultiplier() {
        return this.multiplier;
    }

    getHighestCombo() {
        return this.highestCombo;
    }

    calculateMultiplier(combo) {
        if (combo >= 41) return 5;
        if (combo >= 26) return 4;
        if (combo >= 16) return 3;
        if (combo >= 6) return 2;
        return 1;
    }

    onCorrectInput() {
        this.incrementCombo();
    }

    onIncorrectInput() {
        this.resetCombo();
    }

    onWordComplete(basePoints) {
        // Apply multiplier to points (combo continues between words)
        const multipliedPoints = basePoints * this.multiplier;
        // DON'T reset combo here - only reset on errors
        return multipliedPoints;
    }

    updateUI() {
        const comboValue = document.getElementById('comboValue');
        const multiplierValue = document.getElementById('multiplierValue');
        const comboCounter = document.querySelector('.combo-counter');

        if (comboValue) {
            comboValue.textContent = this.comboCount;
        }
        if (multiplierValue) {
            multiplierValue.textContent = `${this.multiplier}x`;
        }

        // Add fire effect for combo 21+
        if (comboCounter) {
            if (this.comboCount >= 21) {
                comboCounter.classList.add('on-fire');
            } else {
                comboCounter.classList.remove('on-fire');
            }
        }
    }

    resetSession() {
        this.comboCount = 0;
        this.multiplier = 1;
        this.highestCombo = 0;
        this.updateUI();
    }
}

// --- CANVAS EFFECTS RENDERER ---
// Foundation for all canvas visual effects. Owns an animation loop, a
// particle collection, a trail collection, and a shake effect. Subsequent
// tasks (11.2 - 11.5) will add the concrete effect trigger methods
// (particleExplosion, neonTrail, screenShake, comboFire).

/**
 * A single short-lived particle used for explosions and other burst effects.
 * update(dt) returns false when the particle has expired.
 */
class Particle {
    constructor(x, y, vx, vy, color, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.lifetime = lifetime; // seconds
        this.age = 0;
        this.size = 3 + Math.random() * 2;
    }

    /**
     * Advance the particle by dt seconds. Returns false when the particle
     * has exceeded its lifetime and should be removed.
     */
    update(dt) {
        this.age += dt;
        if (this.age >= this.lifetime) return false;

        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // simple gravity so particles arc downward

        return true;
    }

    render(ctx) {
        const alpha = Math.max(0, 1 - (this.age / this.lifetime));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

/**
 * A fading polyline that traces a series of points. Used for neon trails
 * behind moving objects. update(dt) returns false when the alpha decays
 * to zero.
 */
class Trail {
    constructor(points, color, fadeSpeed = 0.03) {
        // Copy points so the caller can safely mutate its own array.
        this.points = Array.isArray(points) ? points.map(p => ({ x: p.x, y: p.y })) : [];
        this.color = color;
        this.fadeSpeed = fadeSpeed;
        this.alpha = 1.0;
    }

    /**
     * Decay the alpha. Returns false once the trail has faded out.
     * dt is accepted for API symmetry but the current fade model is
     * per-frame; multiplying by dt*60 keeps it approximately frame-rate
     * independent.
     */
    update(dt) {
        this.alpha -= this.fadeSpeed * (dt > 0 ? dt * 60 : 1);
        return this.alpha > 0;
    }

    render(ctx) {
        if (this.points.length < 2) return;

        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}

/**
 * A stateful screen-shake generator. update(dt) returns an {x,y} offset
 * every frame while the shake is active. Intensity decays linearly across
 * the duration.
 */
class ShakeEffect {
    constructor() {
        this.intensity = 0;
        this.duration = 0;
        this.elapsed = 0;
    }

    /**
     * Start (or restart) a shake for `duration` seconds with the given
     * peak intensity in pixels.
     */
    start(intensity, duration) {
        this.intensity = intensity;
        this.duration = duration;
        this.elapsed = 0;
    }

    /**
     * Advance the shake and return the current per-frame offset. When the
     * shake has expired the returned offset is {0, 0}.
     */
    update(dt) {
        if (this.duration <= 0 || this.elapsed >= this.duration) {
            this.intensity = 0;
            return { x: 0, y: 0 };
        }

        this.elapsed += dt;

        const progress = Math.min(1, this.elapsed / this.duration);
        const currentIntensity = this.intensity * (1 - progress);

        return {
            x: (Math.random() - 0.5) * currentIntensity * 2,
            y: (Math.random() - 0.5) * currentIntensity * 2
        };
    }

    isActive() {
        return this.intensity > 0 && this.elapsed < this.duration;
    }
}

/**
 * CanvasEffectsRenderer
 * ---------------------
 * Owns the effects canvas and drives an animation loop that updates and
 * renders all active particles and trails. Exposes start()/stop() to
 * control the loop lifecycle. Concrete effect triggers (particleExplosion,
 * neonTrail, screenShake, comboFire) will be added by subsequent subtasks.
 */
class CanvasEffectsRenderer {
    // --- Performance tuning constants ---
    // Hard ceiling on live particles. When the effective budget (which
    // shrinks under adaptive quality reduction) is exceeded, the oldest
    // particles are released to the pool to make room.
    static MAX_PARTICLES = 500;
    // Soft cap on the pool itself so it never grows unbounded even if a
    // gameplay burst releases far more particles than we'll ever reuse.
    static POOL_CAP = 600;
    // Rolling window (in frames) used to estimate the current FPS.
    static FPS_WINDOW = 30;
    // Number of consecutive frames below / above threshold before the
    // qualityLevel changes. Kept short so the game stays responsive
    // to sustained drops without flickering on brief hitches.
    static LOW_FPS_STREAK = 20;
    static HIGH_FPS_STREAK = 60;
    static LOW_FPS_THRESHOLD = 45;
    static HIGH_FPS_THRESHOLD = 55;

    constructor(canvasElement) {
        if (!canvasElement) {
            throw new Error('CanvasEffectsRenderer requires a canvas element');
        }
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');

        this.particles = [];
        this.trails = [];
        this.shake = new ShakeEffect();

        // Object pool for particle reuse. Freed particles from update()
        // are pushed here and popped by _acquireParticle() before we fall
        // back to allocating a new Particle.
        this._particlePool = [];

        // Adaptive quality: 0 = full budget, 1 = half, 2 = quarter.
        // Updated by _sampleFps() as the observed frame rate rises or falls.
        this._qualityLevel = 0;
        this._currentFps = 60;
        // Ring buffer of recent per-frame dt values (in seconds).
        this._fpsSamples = [];
        this._fpsSampleIndex = 0;
        // Consecutive-frame counters that drive quality transitions.
        this._lowFpsFrames = 0;
        this._highFpsFrames = 0;
        // Toggle for skipping alternate neonTrail spawns under quality
        // reduction. Incremented every call regardless of quality so the
        // spawn pattern stays deterministic when quality changes.
        this._neonTrailToggle = 0;

        // Lazily-resolved reference to the game container DOM node whose
        // transform is offset by the active screen-shake. Looked up on
        // first use in update() so we don't query the DOM every frame or
        // require the container to exist at construction time.
        this._shakeTarget = null;
        // Tracks whether the previous frame applied a non-zero shake so
        // we can reset the transform exactly once on the trailing edge.
        this._shakeWasActive = false;

        this.animationId = null;
        this.lastFrameTime = 0;
        this.running = false;

        // Bind so we can add/remove the resize listener cleanly.
        this._onResize = this._resizeCanvas.bind(this);
        this._resizeCanvas();
        window.addEventListener('resize', this._onResize);
    }

    /**
     * Rolling-average FPS observed over the last ~30 frames. Public so a
     * dev overlay can read it, but the class itself uses it only to drive
     * adaptive quality reduction.
     */
    get currentFps() {
        return this._currentFps;
    }

    /**
     * Current quality tier. 0 = full particle budget, 1 = half, 2 = quarter.
     * Exposed for tests / dev overlays.
     */
    get qualityLevel() {
        return this._qualityLevel;
    }

    /**
     * Effective particle budget for the current quality tier.
     * Level 0 → MAX_PARTICLES, level 1 → MAX_PARTICLES/2, level 2 → /4.
     */
    _effectiveMaxParticles() {
        return CanvasEffectsRenderer.MAX_PARTICLES >> this._qualityLevel;
    }

    /**
     * Pop a Particle from the pool (re-initializing its fields) or allocate
     * a fresh one when the pool is empty. Callers must go through this
     * helper instead of `new Particle(...)` so recycled objects get reused.
     */
    _acquireParticle(x, y, vx, vy, color, lifetime) {
        const p = this._particlePool.pop();
        if (p) {
            p.x = x;
            p.y = y;
            p.vx = vx;
            p.vy = vy;
            p.color = color;
            p.lifetime = lifetime;
            p.age = 0;
            p.size = 3 + Math.random() * 2;
            return p;
        }
        return new Particle(x, y, vx, vy, color, lifetime);
    }

    /**
     * Return a spent Particle to the pool. Silently drops it if the pool
     * has hit its soft cap so the pool itself can't grow unbounded.
     */
    _releaseParticle(p) {
        if (this._particlePool.length < CanvasEffectsRenderer.POOL_CAP) {
            this._particlePool.push(p);
        }
    }

    /**
     * Push a particle into the live particle array, enforcing the effective
     * MAX_PARTICLES budget. When the budget is exceeded, the oldest particle
     * is released back to the pool to make room (FIFO eviction so bursts
     * from a single call all stay together for as long as possible).
     */
    _addParticle(p) {
        const max = this._effectiveMaxParticles();
        if (this.particles.length >= max) {
            const oldest = this.particles.shift();
            if (oldest) this._releaseParticle(oldest);
        }
        this.particles.push(p);
    }

    /**
     * Feed the FPS rolling average with the latest frame delta and update
     * the quality tier when the observed FPS has been below / above the
     * threshold for enough consecutive frames.
     */
    _sampleFps(dt) {
        if (dt <= 0) return;
        const WINDOW = CanvasEffectsRenderer.FPS_WINDOW;
        if (this._fpsSamples.length < WINDOW) {
            this._fpsSamples.push(dt);
        } else {
            this._fpsSamples[this._fpsSampleIndex] = dt;
            this._fpsSampleIndex = (this._fpsSampleIndex + 1) % WINDOW;
        }

        // Average dt across the window, then invert to get FPS.
        let sum = 0;
        for (let i = 0; i < this._fpsSamples.length; i++) sum += this._fpsSamples[i];
        const avgDt = sum / this._fpsSamples.length;
        this._currentFps = avgDt > 0 ? 1 / avgDt : 60;

        // Adaptive quality transitions. Uses simple hysteresis: LOW streak
        // to step down, longer HIGH streak to step back up. This makes us
        // quick to protect frame rate but slow to relax so we don't yo-yo.
        if (this._currentFps < CanvasEffectsRenderer.LOW_FPS_THRESHOLD) {
            this._lowFpsFrames++;
            this._highFpsFrames = 0;
            if (this._lowFpsFrames >= CanvasEffectsRenderer.LOW_FPS_STREAK && this._qualityLevel < 2) {
                this._qualityLevel++;
                this._lowFpsFrames = 0;
            }
        } else if (this._currentFps > CanvasEffectsRenderer.HIGH_FPS_THRESHOLD) {
            this._highFpsFrames++;
            this._lowFpsFrames = 0;
            if (this._highFpsFrames >= CanvasEffectsRenderer.HIGH_FPS_STREAK && this._qualityLevel > 0) {
                this._qualityLevel--;
                this._highFpsFrames = 0;
            }
        } else {
            // Between the two thresholds: hold current tier, decay streaks.
            this._lowFpsFrames = 0;
            this._highFpsFrames = 0;
        }
    }

    /**
     * Resize the canvas backing store to match the window (or its parent
     * client rect when the window is unavailable). Uses devicePixelRatio
     * for crisp rendering on high-DPI displays.
     */
    _resizeCanvas() {
        const width = window.innerWidth || document.documentElement.clientWidth || this.canvas.clientWidth || 1200;
        const height = window.innerHeight || document.documentElement.clientHeight || this.canvas.clientHeight || 800;
        const dpr = window.devicePixelRatio || 1;

        // Set the CSS size so the canvas actually covers the viewport.
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        // Set the backing store size and scale the context so drawing
        // commands use CSS pixels.
        this.canvas.width = Math.floor(width * dpr);
        this.canvas.height = Math.floor(height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /**
     * Begin the animation loop. Idempotent - a second call is a no-op.
     */
    start() {
        if (this.running) return;
        this.running = true;
        this.lastFrameTime = performance.now();
        const loop = (now) => {
            if (!this.running) return;
            const dt = (now - this.lastFrameTime) / 1000; // seconds
            this.lastFrameTime = now;

            // Sample the observed dt before we clamp it inside update() so
            // a real drop shows up in the rolling average.
            this._sampleFps(dt);

            this.update(dt);
            this.render();

            this.animationId = requestAnimationFrame(loop);
        };
        this.animationId = requestAnimationFrame(loop);
    }

    /**
     * Stop the animation loop and clear any active particles/trails so
     * the next start() begins from a clean slate.
     */
    stop() {
        this.running = false;
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // Recycle live particles into the pool before clearing so the
        // next start() session gets a warm pool and doesn't re-allocate.
        for (let i = 0; i < this.particles.length; i++) {
            this._releaseParticle(this.particles[i]);
        }
        this.particles.length = 0;
        this.trails.length = 0;
        // Clear the canvas one last time so no stale pixels remain.
        if (this.ctx && this.canvas.width > 0 && this.canvas.height > 0) {
            this.ctx.save();
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }
    }

    /**
     * Advance simulation by dt seconds. Removes dead particles/trails.
     * Also drives the ShakeEffect: consumes its per-frame {x,y} offset
     * and writes it to the #gameContainer transform so the whole game
     * jitters briefly on player errors.
     */
    update(dt) {
        // Cap dt so a paused tab doesn't cause a large jump when resumed.
        const clampedDt = Math.min(dt, 0.1);

        // Update particles, keep only those still alive. Dead particles
        // are released to the pool before being spliced out so they can
        // be re-acquired on the next burst without allocating.
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (!p.update(clampedDt)) {
                this._releaseParticle(p);
                this.particles.splice(i, 1);
            }
        }

        // Update trails, keep only those still visible.
        for (let i = this.trails.length - 1; i >= 0; i--) {
            if (!this.trails[i].update(clampedDt)) {
                this.trails.splice(i, 1);
            }
        }

        // Drive the screen-shake. Lazily resolve the container once so
        // we don't hit the DOM every frame.
        if (this._shakeTarget === null && typeof document !== 'undefined') {
            this._shakeTarget = document.getElementById('gameContainer');
        }

        if (this._shakeTarget) {
            const shakeActive = this.shake.isActive();
            if (shakeActive) {
                const offset = this.shake.update(clampedDt);
                this._shakeTarget.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
                this._shakeWasActive = true;
            } else if (this._shakeWasActive) {
                // Trailing edge: clear the transform exactly once when the
                // shake finishes so we don't leave the container offset.
                this._shakeTarget.style.transform = 'translate(0, 0)';
                this._shakeWasActive = false;
            }
        }
    }

    /**
     * Clear the canvas and draw all active effects. Uses a single
     * save/restore around each pass (trails, then particles) and groups
     * particles by color so we only set fillStyle once per color instead
     * of once per particle.
     */
    render() {
        const ctx = this.ctx;
        if (!ctx) return;

        // Clear the visible area (accounting for the DPR transform).
        const cssWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const cssHeight = this.canvas.height / (window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, cssWidth, cssHeight);

        // --- Trail pass ---
        // Trails set their own shadowBlur / strokeStyle per instance; one
        // save/restore around the whole loop keeps that state contained
        // without paying per-particle save cost.
        if (this.trails.length > 0) {
            ctx.save();
            for (let i = 0; i < this.trails.length; i++) {
                this.trails[i].render(ctx);
            }
            ctx.restore();
        }

        // --- Particle pass (batched by color) ---
        // Particles fade individually (globalAlpha per particle) but share
        // fillStyle within a color group, so we bin them by color and set
        // fillStyle once per group. This turns N fillStyle string sets
        // into K (colors) plus reduces state churn on the 2D context.
        if (this.particles.length > 0) {
            ctx.save();

            // Bin particles by color. Map keeps insertion order so we
            // draw in a stable sequence regardless of how JS engines
            // hash the color strings.
            const byColor = new Map();
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                let group = byColor.get(p.color);
                if (!group) {
                    group = [];
                    byColor.set(p.color, group);
                }
                group.push(p);
            }

            for (const [color, group] of byColor) {
                ctx.fillStyle = color;
                for (let i = 0; i < group.length; i++) {
                    const p = group[i];
                    const alpha = Math.max(0, 1 - (p.age / p.lifetime));
                    if (alpha <= 0) continue;
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }

    /**
     * Trigger a radial particle burst at (x, y). Spawns 30 particles evenly
     * distributed around a circle, each with a randomized speed (2-5) and
     * lifetime (0.5-1s). Gravity is applied by Particle.update, so the
     * particles arc downward as they fade out.
     */
    particleExplosion(x, y, color) {
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 2 + Math.random() * 3; // 2-5
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const lifetime = 0.5 + Math.random() * 0.5; // 0.5-1s
            this._addParticle(this._acquireParticle(x, y, vx, vy, color, lifetime));
        }
    }

    /**
     * Push a neon trail into the effects queue. `points` is an array of
     * {x, y} CSS-pixel coordinates in viewport space (the canvas covers
     * the full viewport). Renders as a smooth polyline with a glow via
     * shadowBlur and fades out per Trail.update. Points fewer than two
     * are ignored by Trail.render, so we still enqueue them defensively.
     */
    neonTrail(points, color = '#89b4fa') {
        if (!Array.isArray(points) || points.length < 2) return;

        // Under adaptive quality reduction, drop every other trail spawn.
        // We still count every call so the pattern stays deterministic
        // regardless of which frames are skipped.
        const toggle = this._neonTrailToggle++;
        if (this._qualityLevel >= 1 && (toggle & 1) === 0) return;

        this.trails.push(new Trail(points, color));
    }

    /**
     * Kick off a screen shake. `intensity` is the peak per-frame offset
     * in pixels; `duration` is the total shake time in seconds. The
     * ShakeEffect decays intensity linearly across the duration, and
     * update() applies the current {x,y} offset to the game container's
     * transform each frame.
     */
    screenShake(intensity, duration) {
        this.shake.start(intensity, duration);
    }

    /**
     * Spawn a small burst of fire particles rising upward from (x, y).
     * Intended to be called every few frames from the animation loop while
     * the player's combo is >= 21. Each call spawns 3-5 particles with a
     * small upward velocity, slight horizontal jitter, a short lifetime,
     * and one of three warm fire colors chosen at random. Does NOT use
     * setInterval - the caller drives the cadence from requestAnimationFrame.
     */
    comboFire(x, y) {
        const fireColors = ['#fab387', '#f38ba8', '#f9e2af']; // orange, red, yellow
        const count = 3 + Math.floor(Math.random() * 3); // 3-5 particles per burst
        for (let i = 0; i < count; i++) {
            const vx = (Math.random() - 0.5) * 1.0;    // -0.5 .. 0.5
            const vy = -3 + Math.random() * 1.5;       // -3 .. -1.5 (upward)
            const color = fireColors[Math.floor(Math.random() * fireColors.length)];
            const lifetime = 0.6 + Math.random() * 0.4; // ~0.6-1.0s (avg ~0.8s)
            // Slight positional jitter so particles don't all start at the exact same pixel.
            const px = x + (Math.random() - 0.5) * 6;
            const py = y + (Math.random() - 0.5) * 4;
            this._addParticle(this._acquireParticle(px, py, vx, vy, color, lifetime));
        }
    }

    /**
     * Tear down listeners. Currently only invoked by tests, but keeps the
     * class self-contained.
     */
    destroy() {
        this.stop();
        window.removeEventListener('resize', this._onResize);
    }
}

// --- STATE ---
let gameActive = false;
let gameStartTime = null;
let currentWordIndex = 0;
let currentTypedText = '';
let words = [];
let wordStates = []; // Track Y position and status for each word
let animationFrameId = null;
let animationFrameCount = 0; // Monotonic frame counter for effect throttling
let currentDifficulty = 'medium';

// Stats tracking
let correctWords = 0;
let missedWords = 0;
let totalScore = 0;
let completedSentences = 0;
let accumulatedWords = []; // Words that have been typed correctly

// Combo manager instance
let comboManager = null;

// Audio engine instance
let audioEngine = null;

// Keyboard visualizer instance
let keyboardVisualizer = null;

// Stats tracker instance
let statsTracker = null;

// Canvas effects renderer instance
let canvasEffects = null;

// Game configuration
let WORD_SPEED = 1.5; // pixels per frame (adjusted per difficulty)
const WORD_SPACING = 120; // vertical spacing between words
const HIT_LINE_Y_RATIO = 1.0; // Hit line at the very bottom of container
let HIT_LINE_Y = 400; // Will be recalculated on init
const START_Y = -50; // Words start above the visible area

// Scoring
const POINTS_PER_WORD = 10;
const SENTENCE_BONUS = 100;

// --- ELEMENTS ---
const textDisplay = document.getElementById('textDisplay');
const accumulatedSentences = document.getElementById('accumulatedSentences');
const startHint = document.getElementById('startHint');
const statsBar = document.getElementById('statsBar');
const liveWpm = document.getElementById('liveWpm');
const liveAcc = document.getElementById('liveAcc');
const liveTimer = document.getElementById('liveTimer');
const liveScore = document.getElementById('liveScore');
const liveSentences = document.getElementById('liveSentences');
const resultsDiv = document.getElementById('results');
const gameContainer = document.getElementById('gameContainer');
const menuScreen = document.getElementById('menuScreen');

// --- CLEAN PREVIOUS GAME STATE ---
function cleanGameState() {
    // Cancel any running animation
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Reset all state variables
    gameActive = false;
    gameStartTime = null;
    currentWordIndex = 0;
    currentTypedText = '';
    words = [];
    wordStates = [];
    correctWords = 0;
    missedWords = 0;
    totalScore = 0;
    completedSentences = 0;
    accumulatedWords = [];

    // Reset combo manager
    if (comboManager) {
        comboManager.resetSession();
    }

    // Clear DOM elements
    if (textDisplay) {
        textDisplay.innerHTML = '';
    }
    if (accumulatedSentences) {
        accumulatedSentences.innerHTML = '';
    }

    // Hide/reset UI elements
    if (startHint) startHint.classList.remove('hidden');
    if (statsBar) statsBar.classList.remove('visible');
    if (resultsDiv) resultsDiv.classList.remove('active');
}

// --- INITIALIZE GAME ---
async function initGame() {
    // CRITICAL: Clean all previous state first
    cleanGameState();

    // Initialize combo manager if not exists
    if (!comboManager) {
        comboManager = new ComboManager();
    }

    // Initialize audio engine if not exists
    if (!audioEngine) {
        audioEngine = new AudioEngine();
    }

    // Initialize stats tracker if not exists
    if (!statsTracker) {
        statsTracker = new StatsTracker();
        statsTracker.initialize().catch(error => {
            console.error('Failed to initialize stats tracker:', error);
        });
    }

    // Initialize keyboard visualizer if not exists
    if (!keyboardVisualizer) {
        const visualKeyboardContainer = document.getElementById('visualKeyboard');
        if (visualKeyboardContainer) {
            keyboardVisualizer = new KeyboardVisualizer(visualKeyboardContainer);

            // Detect and render keyboard layout
            keyboardVisualizer.detectLayout().then(layout => {
                keyboardVisualizer.render(layout);
                console.log('Keyboard layout rendered:', layout.name);
            }).catch(error => {
                console.error('Failed to detect keyboard layout:', error);
                // Fallback: render default Spanish layout if detection fails
                keyboardVisualizer.render(KeyboardVisualizer.LAYOUTS.QWERTY_ES);
                console.log('Keyboard rendered with fallback layout: QWERTY Spanish');
            });
        }
    }

    // Initialize canvas effects renderer if not exists.
    // Concrete effect triggers are added in later subtasks (11.2 - 11.5);
    // this task only stands up the class and its animation loop.
    if (!canvasEffects) {
        const effectsCanvasEl = document.getElementById('effectsCanvas');
        if (effectsCanvasEl) {
            try {
                canvasEffects = new CanvasEffectsRenderer(effectsCanvasEl);
            } catch (error) {
                console.error('Failed to initialize canvas effects renderer:', error);
            }
        } else {
            console.warn('#effectsCanvas element not found - canvas effects disabled');
        }
    }

    // Hide menu, show game
    if (menuScreen) menuScreen.style.display = 'none';
    if (gameContainer) gameContainer.style.display = '';

    // Cargar oraciones desde la API (o fallback)
    sentenceBank = await fetchSentences(currentLanguage, currentDifficulty);

    // Generate sentences from bank
    const fullText = sentenceBank.join(' ');
    words = fullText.split(' ').filter(w => w.length > 0);

    // Initialize word states with staggered Y positions
    wordStates = words.map((word, index) => ({
        y: START_Y - (index * WORD_SPACING),
        status: 'pending', // pending, active, completed, missed
        element: null
    }));

    // Setup UI
    textDisplay.style.position = 'relative';
    textDisplay.style.overflow = 'hidden';
    textDisplay.style.display = '';

    // Calculate hit line based on actual container height
    HIT_LINE_Y = Math.floor(textDisplay.clientHeight * HIT_LINE_Y_RATIO);

    // Create hit line
    createHitLine();

    // Create word elements
    createWordElements();

    // Show start hint
    startHint.textContent = 'Presiona Enter para iniciar...';
    startHint.classList.remove('hidden');

    // Reset stats display
    liveWpm.textContent = '0';
    liveAcc.textContent = '100';
    liveTimer.textContent = '0';
    liveScore.textContent = '0';
    liveSentences.textContent = '0';

    // Focus for input
    textDisplay.focus();
}

// --- CREATE HIT LINE ---
function createHitLine() {
    // Hit line removed - the container border serves as the visual limit
}

// --- CREATE WORD ELEMENTS ---
function createWordElements() {
    wordStates.forEach((state, index) => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'falling-word';
        wordDiv.dataset.index = index;

        // Create character spans
        words[index].split('').forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.className = 'char';
            charSpan.textContent = char;
            wordDiv.appendChild(charSpan);
        });

        wordDiv.style.position = 'absolute';
        wordDiv.style.left = '50%';
        wordDiv.style.transform = 'translateX(-50%)';
        wordDiv.style.fontSize = '1.8rem';
        wordDiv.style.fontWeight = '600';
        wordDiv.style.whiteSpace = 'nowrap';
        wordDiv.style.visibility = 'hidden';

        textDisplay.appendChild(wordDiv);
        state.element = wordDiv;
    });
}

// --- START GAME ---
function startGame() {
    if (gameActive) return;

    gameActive = true;
    gameStartTime = Date.now();
    startHint.classList.add('hidden');
    statsBar.classList.add('visible');

    // Start stats tracking session
    if (statsTracker) {
        statsTracker.startSession();
    }

    // Initialize audio engine (requires user gesture)
    if (audioEngine && !audioEngine.isInitialized) {
        audioEngine.initialize().then(success => {
            if (success) {
                console.log('Audio initialized successfully');
                // Wire up the genre-change notification
                audioEngine.setGenreChangeCallback((newGenre) => {
                    showGenreChangeNotification(newGenre);
                });
                // Start with beat layer
                audioEngine.updateLayers(0);
            } else {
                console.warn('Audio initialization failed - continuing without audio');
            }
        }).catch(error => {
            console.error('Audio initialization error:', error);
        });
    } else if (audioEngine && audioEngine.isInitialized) {
        // Already initialized (previous game ended and called stopAll()) —
        // restart the transport, rebuild layers and reset to the initial genre
        audioEngine.restart();

        // Re-attach the callback in case it was cleared
        audioEngine.setGenreChangeCallback((newGenre) => {
            showGenreChangeNotification(newGenre);
        });
    }

    // Show keyboard visualizer
    if (keyboardVisualizer) {
        keyboardVisualizer.show();

        // Highlight the first expected key
        if (currentWordIndex < words.length && words[currentWordIndex].length > 0) {
            keyboardVisualizer.highlightKey(words[currentWordIndex][0], 'expected');
        }
    }

    // Start the canvas effects animation loop. No effects are triggered
    // yet - later subtasks will hook effect calls into gameplay events.
    if (canvasEffects) {
        canvasEffects.start();
    }

    // Show all words
    wordStates.forEach(state => {
        if (state.element) state.element.style.visibility = 'visible';
    });

    // Start animation loop
    animate();
}

// --- ANIMATION LOOP ---
function animate() {
    if (!gameActive) return;

    // Update word positions
    let allWordsFinished = true;

    wordStates.forEach((state, index) => {
        if (state.status === 'pending' || state.status === 'active') {
            state.y += WORD_SPEED;
            allWordsFinished = false;

            // If word reached the hit line, mark as missed immediately (don't render below)
            if (state.y >= HIT_LINE_Y) {
                if (index === currentWordIndex) {
                    markWordAsMissed(index);
                } else {
                    state.status = 'missed';
                    missedWords++;
                    if (state.element) state.element.style.display = 'none';
                }
                return;
            }

            // Update visual position (only if still above hit line)
            if (state.element) {
                state.element.style.top = state.y + 'px';
            }

            // Check if word has reached hit line area
            if (state.status === 'pending' && Math.abs(state.y - HIT_LINE_Y) < 30) {
                state.status = 'active';
                if (index === currentWordIndex) {
                    state.element.style.color = '#89b4fa';
                }
            }
        } else {
            // Word is completed or missed, check if all are done
            if (state.status !== 'completed' && state.status !== 'missed') {
                allWordsFinished = false;
            }
        }
    });

    // Advance the frame counter used by throttled effects below (combo
    // fire uses `animationFrameCount % 3`). The neon-trail spawn loop
    // that previously ran here was removed - the descending blue trails
    // read as "piano tutorial" guides and distracted from the falling
    // words. The Trail class and CanvasEffectsRenderer.neonTrail() are
    // preserved for potential future use.
    animationFrameCount++;

    // Task 11.5: continuous combo fire particles while the combo is >= 21.
    // The effects canvas is viewport-fixed, so we position bursts at the
    // combo display's viewport center via getBoundingClientRect. Throttled
    // to every 3 frames so we don't flood the particle array.
    if (canvasEffects && comboManager && comboManager.getCurrentCombo() >= 21) {
        if (animationFrameCount % 3 === 0) {
            const comboEl = document.getElementById('comboValue')
                || document.getElementById('comboDisplay');
            if (comboEl) {
                const rect = comboEl.getBoundingClientRect();
                if (rect.width > 0 || rect.height > 0) {
                    const fx = rect.left + rect.width / 2;
                    // Spawn near the bottom of the element so particles rise
                    // through and past the combo counter for a flame look.
                    const fy = rect.top + rect.height * 0.85;
                    canvasEffects.comboFire(fx, fy);
                }
            }
        }
    }

    // Update live stats
    updateLiveStats();

    // Check if game is complete
    if (allWordsFinished && currentWordIndex >= words.length) {
        endGame();
        return;
    }

    // Continue animation
    animationFrameId = requestAnimationFrame(animate);
}

// --- ADD WORD TO ACCUMULATED AREA ---
function addWordToAccumulated(word) {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word-accumulated';
    wordSpan.textContent = word;

    // Check if word ends with period (sentence end)
    if (word.endsWith('.')) {
        // Remove period from word and add separately
        wordSpan.textContent = word.slice(0, -1);
        accumulatedSentences.appendChild(wordSpan);

        const periodSpan = document.createElement('span');
        periodSpan.className = 'period';
        periodSpan.textContent = '.';
        accumulatedSentences.appendChild(periodSpan);

        // Mark sentence as complete and award bonus
        completedSentences++;
        totalScore += SENTENCE_BONUS;

        // Sentence bonus can push the score across a genre threshold too
        if (audioEngine && audioEngine.isInitialized) {
            audioEngine.updateGenre(totalScore);
        }

        // Track sentence completion (perfect if no errors in this sentence)
        if (statsTracker) {
            const hasErrors = false; // We'd need to track this per sentence
            statsTracker.trackSentenceCompleted(hasErrors);
        }

        // Play sentence complete sound
        if (audioEngine && audioEngine.isInitialized) {
            audioEngine.playSentenceComplete();
        }

        // Particle explosion at the completed word position (viewport coords
        // align with the fixed, viewport-sized effects canvas).
        if (canvasEffects) {
            const completedState = wordStates[currentWordIndex];
            let ex, ey;
            if (completedState && completedState.element) {
                const rect = completedState.element.getBoundingClientRect();
                ex = rect.left + rect.width / 2;
                ey = rect.top + rect.height / 2;
            } else if (completedState && typeof completedState.y === 'number') {
                // Fallback: use the last known state.y and horizontal center.
                ex = (window.innerWidth || document.documentElement.clientWidth || 800) / 2;
                ey = completedState.y;
            } else {
                ex = (window.innerWidth || document.documentElement.clientWidth || 800) / 2;
                ey = (window.innerHeight || document.documentElement.clientHeight || 600) / 2;
            }
            canvasEffects.particleExplosion(ex, ey, '#f9e2af');
        }

        // Animate the completed sentence
        setTimeout(() => {
            const allWords = accumulatedSentences.querySelectorAll('.word-accumulated');
            allWords.forEach(w => w.classList.add('sentence-complete'));
            setTimeout(() => {
                allWords.forEach(w => w.classList.remove('sentence-complete'));
            }, 600);
        }, 100);
    } else {
        accumulatedSentences.appendChild(wordSpan);
    }

    // Add space after word
    const space = document.createTextNode(' ');
    accumulatedSentences.appendChild(space);
}

// --- MARK WORD AS MISSED ---
function addMissedWordToAccumulated(word) {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word-accumulated';
    wordSpan.textContent = word;
    wordSpan.style.color = '#f38ba8';
    accumulatedSentences.appendChild(wordSpan);

    // Add space after word
    const space = document.createTextNode(' ');
    accumulatedSentences.appendChild(space);
}

function markWordAsMissed(index) {
    const state = wordStates[index];
    if (state.status === 'missed' || state.status === 'completed') return;

    state.status = 'missed';
    missedWords++;

    // Track word error
    if (statsTracker) {
        statsTracker.trackWordError(words[index]);
    }

    // Reset combo on missed word
    comboManager.onIncorrectInput();

    // Play error sound and remove layers
    if (audioEngine && audioEngine.isInitialized) {
        audioEngine.playErrorSound();
        audioEngine.removeLayers();
    }

    // Screen shake to emphasize the missed word
    if (canvasEffects) {
        canvasEffects.screenShake(10, 0.35);
    }

    // Visual feedback
    if (state.element) {
        state.element.style.display = 'none';
    }

    // Add missed word to accumulated area in red
    addMissedWordToAccumulated(words[index]);

    // Clear keyboard highlights
    if (keyboardVisualizer) {
        keyboardVisualizer.clearHighlights();
    }

    // Move to next word
    currentWordIndex++;
    currentTypedText = '';

    // Highlight next active word
    if (currentWordIndex < words.length) {
        const nextState = wordStates[currentWordIndex];
        if (nextState.element) {
            nextState.element.style.color = '#89b4fa';
        }

        // Highlight first key of next word
        if (keyboardVisualizer && words[currentWordIndex].length > 0) {
            keyboardVisualizer.highlightKey(words[currentWordIndex][0], 'expected');
        }
    }
}

// --- MARK WORD AS COMPLETED ---
function markWordAsCompleted(index) {
    const state = wordStates[index];
    if (state.status === 'completed') return;

    state.status = 'completed';
    correctWords++;

    // Track word completion in stats tracker
    if (statsTracker) {
        statsTracker.trackWordCompleted(Date.now());
    }

    // Calculate points with multiplier from ComboManager
    const basePoints = POINTS_PER_WORD;
    const multipliedPoints = comboManager.onWordComplete(basePoints);
    totalScore += multipliedPoints;

    // Notify audio engine of new total score so it can update the genre
    if (audioEngine && audioEngine.isInitialized) {
        audioEngine.updateGenre(totalScore);
    }

    // Add word to accumulated area
    addWordToAccumulated(words[index]);

    // Visual success effect
    if (state.element) {
        state.element.style.display = 'none';
    }

    // Clear keyboard highlights
    if (keyboardVisualizer) {
        keyboardVisualizer.clearHighlights();
    }

    // Move to next word
    currentWordIndex++;
    currentTypedText = '';

    // Highlight next active word
    if (currentWordIndex < words.length) {
        const nextState = wordStates[currentWordIndex];
        if (nextState.element) {
            nextState.element.style.color = '#89b4fa';
        }

        // Highlight first key of next word
        if (keyboardVisualizer && words[currentWordIndex].length > 0) {
            keyboardVisualizer.highlightKey(words[currentWordIndex][0], 'expected');
        }
    }
}

// --- INPUT HANDLER ---
document.addEventListener('keydown', function (e) {
    // If the results screen is visible, Enter restarts the game
    if (resultsDiv.classList.contains('active')) {
        if (e.key === 'Enter') {
            e.preventDefault();
            restartGame();
        }
        return; // Ignore all other input while results are visible
    }

    if (!gameActive && !resultsDiv.classList.contains('active')) {
        // Start game only on Enter
        if (e.key === 'Enter') {
            startGame();
        }
        return;
    }

    if (!gameActive || resultsDiv.classList.contains('active')) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (['Shift', 'CapsLock', 'Escape', 'Enter', 'Tab'].includes(e.key)) return;

    e.preventDefault();

    // Get current word
    if (currentWordIndex >= words.length) return;
    const currentWord = words[currentWordIndex];
    const state = wordStates[currentWordIndex];

    // Ignore input if the word hasn't appeared on screen yet
    if (state.y < 0) return;

    // Handle backspace
    if (e.key === 'Backspace') {
        if (currentTypedText.length > 0) {
            currentTypedText = currentTypedText.slice(0, -1);
            updateWordDisplay(currentWordIndex);
        }
        return;
    }

    // Handle space (word completion attempt)
    if (e.key === ' ') {
        if (currentTypedText === currentWord) {
            markWordAsCompleted(currentWordIndex);
        } else {
            // Failed - mark as missed
            markWordAsMissed(currentWordIndex);
        }
        return;
    }

    // Handle character input
    if (e.key.length === 1) {
        currentTypedText += e.key;
        updateWordDisplay(currentWordIndex);

        // Check if character is correct
        const currentWord = words[currentWordIndex];
        const charIndex = currentTypedText.length - 1;
        const isCorrect = charIndex < currentWord.length &&
            currentTypedText[charIndex] === currentWord[charIndex];

        if (isCorrect) {
            // Correct character - increment combo
            comboManager.onCorrectInput();

            // Highlight key as correct
            if (keyboardVisualizer) {
                keyboardVisualizer.highlightKey(e.key, 'correct');
            }

            // Play correct note and update audio layers
            if (audioEngine && audioEngine.isInitialized) {
                audioEngine.playCorrectNote(comboManager.getCurrentCombo());
                audioEngine.updateLayers(comboManager.getCurrentCombo());
            }

            // Highlight next expected key
            if (currentTypedText.length < currentWord.length) {
                if (keyboardVisualizer) {
                    setTimeout(() => {
                        keyboardVisualizer.highlightKey(currentWord[currentTypedText.length], 'expected');
                    }, 150);
                }
            }
        } else {
            // Incorrect character - reset combo
            comboManager.onIncorrectInput();

            // Track key error
            if (statsTracker) {
                statsTracker.trackKeyError(e.key);
            }

            // Highlight key as incorrect
            if (keyboardVisualizer) {
                keyboardVisualizer.highlightKey(e.key, 'incorrect');
            }

            // Play error sound and remove layers
            if (audioEngine && audioEngine.isInitialized) {
                audioEngine.playErrorSound();
                audioEngine.removeLayers();
            }

            // Punchy screen shake on wrong keystroke
            if (canvasEffects) {
                canvasEffects.screenShake(8, 0.25);
            }
        }

        // Auto-complete if word matches fully
        if (currentTypedText === currentWord) {
            markWordAsCompleted(currentWordIndex);
        }
        // Auto-fail if typed text is longer than word or doesn't match
        else if (currentTypedText.length >= currentWord.length ||
            !currentWord.startsWith(currentTypedText)) {
            markWordAsMissed(currentWordIndex);
        }
    }
});

// --- UPDATE WORD DISPLAY ---
function updateWordDisplay(index) {
    const state = wordStates[index];
    if (!state.element) return;

    const currentWord = words[index];
    const chars = state.element.querySelectorAll('.char');

    chars.forEach((charEl, charIndex) => {
        charEl.classList.remove('correct', 'incorrect');

        if (charIndex < currentTypedText.length) {
            if (currentTypedText[charIndex] === currentWord[charIndex]) {
                charEl.classList.add('correct');
                charEl.style.color = '#a6e3a1';
            } else {
                charEl.classList.add('incorrect');
                charEl.style.color = '#f38ba8';
            }
        } else {
            charEl.style.color = '#89b4fa';
        }
    });
}

// --- UPDATE LIVE STATS ---
function updateLiveStats() {
    if (!gameStartTime) return;

    const elapsedSeconds = (Date.now() - gameStartTime) / 1000;
    const elapsedMinutes = elapsedSeconds / 60;

    // WPM calculation - use stats tracker if available
    let wpm = 0;
    if (statsTracker) {
        wpm = statsTracker.getCurrentWPM();
    } else {
        // Fallback calculation
        wpm = elapsedMinutes > 0 ? Math.round(correctWords / elapsedMinutes) : 0;
    }
    liveWpm.textContent = wpm;

    // Accuracy calculation
    const totalWords = correctWords + missedWords;
    const accuracy = totalWords > 0
        ? Math.round((correctWords / totalWords) * 100)
        : 100;
    liveAcc.textContent = accuracy;

    // Timer (elapsed time)
    liveTimer.textContent = Math.floor(elapsedSeconds);

    // Score
    liveScore.textContent = totalScore;

    // Sentences
    liveSentences.textContent = completedSentences;
}

// --- END GAME ---
function endGame() {
    gameActive = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Stop all audio playback
    if (audioEngine && audioEngine.isInitialized) {
        audioEngine.stopAll();
    }

    // Clear keyboard highlights and hide keyboard
    if (keyboardVisualizer) {
        keyboardVisualizer.clearHighlights();
        keyboardVisualizer.hide();
    }

    // Stop the canvas effects animation loop.
    if (canvasEffects) {
        canvasEffects.stop();
    }

    // Calculate session data and save to IndexedDB
    if (statsTracker) {
        const elapsedSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
        const totalWords = correctWords + missedWords;
        const accuracy = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 100;
        const wpm = statsTracker.getCurrentWPM();

        const sessionData = {
            timestamp: Date.now(),
            wpm: wpm,
            accuracy: accuracy,
            totalWords: totalWords,
            correctWords: correctWords,
            missedWords: missedWords,
            duration: elapsedSeconds,
            highestCombo: comboManager ? comboManager.getHighestCombo() : 0,
            difficulty: currentDifficulty,
            language: currentLanguage,
            sentencesCompleted: completedSentences
        };

        statsTracker.saveSession(sessionData).then(() => {
            console.log('Session saved successfully');
        }).catch(error => {
            console.error('Failed to save session:', error);
        });
    }

    // Hide game elements
    statsBar.classList.remove('visible');
    textDisplay.style.display = 'none';

    // Show results
    document.getElementById('resultScore').textContent = totalScore;
    document.getElementById('resultSentences').textContent = completedSentences;
    document.getElementById('resultWords').textContent = correctWords;
    document.getElementById('resultMissed').textContent = missedWords;
    document.getElementById('resultCombo').textContent = comboManager ? comboManager.getHighestCombo() : 0;

    resultsDiv.classList.add('active');

    // Hide overlapping UI elements during results screen so they don't
    // cover the "Regresar" / "Reiniciar" buttons or the results grid.
    const comboDisplay = document.getElementById('comboDisplay');
    if (comboDisplay) comboDisplay.style.display = 'none';

    const effectsCanvas = document.getElementById('effectsCanvas');
    if (effectsCanvas) effectsCanvas.style.display = 'none';

    const gameArea = document.querySelector('.game-area');
    if (gameArea) gameArea.style.display = 'none';

    const accumulatedSentencesEl = document.getElementById('accumulatedSentences');
    if (accumulatedSentencesEl) accumulatedSentencesEl.style.display = 'none';
}

// --- RESTORE UI ELEMENTS AFTER RESULTS ---
// Undoes the inline `display:none` we set in endGame() so the next game
// (or the menu) shows the full UI again. Kept as a single helper so
// restartGame() and goToMenu() stay in sync.
function restoreGameUI() {
    const comboDisplay = document.getElementById('comboDisplay');
    if (comboDisplay) comboDisplay.style.display = '';

    const effectsCanvas = document.getElementById('effectsCanvas');
    if (effectsCanvas) effectsCanvas.style.display = '';

    const gameArea = document.querySelector('.game-area');
    if (gameArea) gameArea.style.display = '';

    const accumulatedSentencesEl = document.getElementById('accumulatedSentences');
    if (accumulatedSentencesEl) accumulatedSentencesEl.style.display = '';

    // endGame() also hid the text display via inline style. Restore it
    // so initGame() can size it correctly on the next session.
    if (textDisplay) textDisplay.style.display = '';
}

// --- RESTART GAME ---
async function restartGame() {
    // Restore any UI elements that endGame() hid before we start over
    restoreGameUI();
    resultsDiv.classList.remove('active');
    await initGame();
}

// --- GO TO MENU ---
function goToMenu() {
    // Stop any music/SFX that was still playing when the user backed out
    // of a live game. Placed here (not inside cleanGameState) because
    // cleanGameState() is also called at the start of initGame(), and we
    // don't want to tear down audio right before starting a new game.
    if (audioEngine && audioEngine.isInitialized) {
        audioEngine.stopAll();
    }
    // Restore hidden UI so the next game session starts in a clean state
    restoreGameUI();
    resultsDiv.classList.remove('active');
    cleanGameState();
    if (gameContainer) gameContainer.style.display = 'none';
    if (menuScreen) menuScreen.style.display = '';
}

// --- DIFFICULTY SELECTION ---
async function selectDifficulty(level) {
    currentDifficulty = level;

    // Set speed based on difficulty
    switch (level) {
        case 'easy':
            WORD_SPEED = 1.0;
            break;
        case 'medium':
            WORD_SPEED = 1.5;
            break;
        case 'hard':
            WORD_SPEED = 2.5;
            break;
    }

    // Initialize game with selected difficulty
    await initGame();
}

// --- FOCUS MANAGEMENT ---
if (textDisplay) {
    textDisplay.addEventListener('click', () => textDisplay.focus());
}

// --- SHOW MENU ON LOAD ---
window.addEventListener('load', () => {
    if (menuScreen) menuScreen.style.display = '';
    if (gameContainer) gameContainer.style.display = 'none';
});

// --- ABOUT GAME ---
function showAboutGame() {
    const aboutDashboard = document.getElementById('aboutDashboard');
    const menuScreen = document.getElementById('menuScreen');

    if (!aboutDashboard || !menuScreen) return;

    // Only push state if not already on #about
    if (location.hash !== '#about') {
        history.pushState({ view: 'about' }, '', '#about');
    }

    menuScreen.style.display = 'none';
    aboutDashboard.style.display = 'block';
}

function closeAboutGame() {
    const aboutDashboard = document.getElementById('aboutDashboard');
    const menuScreen = document.getElementById('menuScreen');

    if (!aboutDashboard || !menuScreen) return;

    aboutDashboard.style.display = 'none';
    menuScreen.style.display = '';

    // Go back in history to clean the hash
    if (location.hash === '#about') {
        history.back();
    }
}

// --- HANDLE TAB VISIBILITY FOR AUDIO CONTEXT ---
document.addEventListener('visibilitychange', () => {
    if (audioEngine) {
        audioEngine.handleVisibilityChange();
    }
});

// --- LANGUAGE TOGGLE (frontend only) ---
let currentLanguage = 'es';
function toggleLanguage() {
    currentLanguage = currentLanguage === 'es' ? 'en' : 'es';
    const ball = document.getElementById('toggleBall');
    const langEs = document.getElementById('langEs');
    const langEn = document.getElementById('langEn');

    if (currentLanguage === 'en') {
        ball.classList.add('right');
        langEs.classList.remove('lang-active');
        langEn.classList.add('lang-active');
    } else {
        ball.classList.remove('right');
        langEn.classList.remove('lang-active');
        langEs.classList.add('lang-active');
    }
}

// --- STATISTICS DASHBOARD ---

// Show statistics dashboard
async function showStatsDashboard() {
    const dashboard = document.getElementById('statsDashboard');
    const menuScreen = document.getElementById('menuScreen');

    if (!dashboard || !menuScreen) return;

    // Push state so browser back button closes the dashboard
    if (location.hash !== '#stats') {
        history.pushState({ view: 'stats' }, '', '#stats');
    }

    // Hide menu
    menuScreen.style.display = 'none';

    // Show dashboard
    dashboard.style.display = 'block';

    // Load statistics
    await loadDashboardStatistics();
}

// Close statistics dashboard
function closeStatsDashboard() {
    const dashboard = document.getElementById('statsDashboard');
    const menuScreen = document.getElementById('menuScreen');

    if (!dashboard || !menuScreen) return;

    // Hide dashboard
    dashboard.style.display = 'none';

    // Show menu
    menuScreen.style.display = '';

    // Go back in history to clean the hash
    if (location.hash === '#stats') {
        history.back();
    }
}

// Handle browser back/forward button for stats dashboard and about panel
window.addEventListener('popstate', function (e) {
    const dashboard = document.getElementById('statsDashboard');
    const aboutDashboard = document.getElementById('aboutDashboard');
    const menuScreen = document.getElementById('menuScreen');

    if (!menuScreen) return;

    if (!e.state || (!e.state.view)) {
        // Going back to menu — close any open panel
        if (dashboard) dashboard.style.display = 'none';
        if (aboutDashboard) aboutDashboard.style.display = 'none';
        menuScreen.style.display = '';
    } else if (e.state.view === 'stats') {
        // Going forward to stats → show dashboard
        if (aboutDashboard) aboutDashboard.style.display = 'none';
        menuScreen.style.display = 'none';
        if (dashboard) {
            dashboard.style.display = 'block';
            loadDashboardStatistics();
        }
    } else if (e.state.view === 'about') {
        // Going forward to about → show about panel
        if (dashboard) dashboard.style.display = 'none';
        menuScreen.style.display = 'none';
        if (aboutDashboard) aboutDashboard.style.display = 'block';
    }
});

// Load and display all dashboard statistics
async function loadDashboardStatistics() {
    if (!statsTracker || !statsTracker.isInitialized) {
        console.warn('StatsTracker not initialized');
        showEmptyState();
        return;
    }

    try {
        // Get overall stats
        const overallStats = await statsTracker.getOverallStats();

        // Update overall stat cards
        updateOverallStatsDisplay(overallStats);

        // Generate historical accuracy chart
        await generateAccuracyChart();

        // Generate keyboard heatmap
        await generateKeyboardHeatmap();

        // Display top difficult words
        await displayTopDifficultWords();
    } catch (error) {
        console.error('Failed to load dashboard statistics:', error);
        showEmptyState();
    }
}

// Update overall statistics display
function updateOverallStatsDisplay(stats) {
    document.getElementById('dashTotalWords').textContent = stats.totalWords || 0;
    document.getElementById('dashTotalTime').textContent = Math.round((stats.totalTime || 0) / 60) || 0;
    document.getElementById('dashBestWpm').textContent = stats.bestWpm || 0;
    document.getElementById('dashBestCombo').textContent = stats.bestCombo || 0;
}

// Generate historical accuracy chart using Canvas API
async function generateAccuracyChart() {
    const canvas = document.getElementById('accuracyChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const accuracies = await statsTracker.getHistoricalAccuracy();

    if (accuracies.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#585b70';
        ctx.font = '16px "Roboto Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('No hay datos históricos disponibles', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // Draw grid lines
    ctx.strokeStyle = '#313244';
    ctx.lineWidth = 1;

    // Horizontal grid lines (every 20%)
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();

        // Y-axis labels
        ctx.fillStyle = '#585b70';
        ctx.font = '12px "Roboto Mono"';
        ctx.textAlign = 'right';
        ctx.fillText(`${100 - i * 20}%`, padding - 10, y + 4);
    }

    // Draw line chart
    if (accuracies.length > 1) {
        ctx.strokeStyle = '#89b4fa';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(137, 180, 250, 0.5)';

        ctx.beginPath();

        accuracies.forEach((accuracy, index) => {
            const x = padding + (chartWidth / (accuracies.length - 1)) * index;
            const y = padding + chartHeight - (accuracy / 100) * chartHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw data points
        ctx.fillStyle = '#89b4fa';
        accuracies.forEach((accuracy, index) => {
            const x = padding + (chartWidth / (accuracies.length - 1)) * index;
            const y = padding + chartHeight - (accuracy / 100) * chartHeight;

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Draw axes
    ctx.strokeStyle = '#45475a';
    ctx.lineWidth = 2;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // X-axis label
    ctx.fillStyle = '#585b70';
    ctx.font = '14px "Roboto Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('Sesiones →', canvas.width / 2, canvas.height - 10);

    // Y-axis label
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Precisión (%)', 0, 0);
    ctx.restore();
}

// Generate keyboard heatmap visualization
async function generateKeyboardHeatmap() {
    const heatmapContainer = document.getElementById('keyboardHeatmap');
    const problematicKeysList = document.getElementById('problematicKeysList');

    if (!heatmapContainer || !problematicKeysList) return;

    const problematicKeys = await statsTracker.getProblematicKeys();

    if (problematicKeys.size === 0) {
        heatmapContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎉</div><div class="empty-state-text">¡Sin errores registrados!</div><div class="empty-state-hint">Sigue practicando para mantener este nivel</div></div>';
        problematicKeysList.innerHTML = '';
        return;
    }

    // Get max error count for color gradient
    const maxErrors = Math.max(...Array.from(problematicKeys.values()));

    // Define keyboard layout (QWERTY Spanish)
    const keyboardLayout = [
        ['º', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', "'", '¡'],
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '`', '+'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ', '´', 'ç'],
        ['<', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-']
    ];

    // Render heatmap keyboard
    const heatmapKeyboard = document.createElement('div');
    heatmapKeyboard.className = 'heatmap-keyboard';

    keyboardLayout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'heatmap-row';

        row.forEach(key => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'heatmap-key';
            keyDiv.textContent = key;

            const errorCount = problematicKeys.get(key) || 0;
            if (errorCount > 0) {
                keyDiv.setAttribute('data-errors', errorCount);

                // Calculate color intensity (green to red gradient)
                const intensity = errorCount / maxErrors;
                const hue = (1 - intensity) * 120; // 120 = green, 0 = red
                keyDiv.style.backgroundColor = `hsl(${hue}, 70%, 40%)`;
                keyDiv.style.color = '#1e1e2e';
                keyDiv.style.borderColor = `hsl(${hue}, 70%, 30%)`;
            }

            rowDiv.appendChild(keyDiv);
        });

        heatmapKeyboard.appendChild(rowDiv);
    });

    heatmapContainer.innerHTML = '';
    heatmapContainer.appendChild(heatmapKeyboard);

    // Display top 10 problematic keys
    const sortedKeys = Array.from(problematicKeys.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    problematicKeysList.innerHTML = '';
    sortedKeys.forEach(([key, count]) => {
        const keyItem = document.createElement('div');
        keyItem.className = 'problematic-key-item';

        keyItem.innerHTML = `
            <div class="problematic-key-char">${key}</div>
            <div>
                <div class="problematic-key-count">${count}</div>
                <div class="problematic-key-label">errores</div>
            </div>
        `;

        problematicKeysList.appendChild(keyItem);
    });
}

// Display top difficult words
async function displayTopDifficultWords() {
    const difficultWordsList = document.getElementById('difficultWordsList');
    if (!difficultWordsList) return;

    const topWords = await statsTracker.getTopDifficultWords();

    if (topWords.length === 0) {
        difficultWordsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✨</div><div class="empty-state-text">¡Sin palabras difíciles!</div><div class="empty-state-hint">Todas las palabras se escriben perfectamente</div></div>';
        return;
    }

    difficultWordsList.innerHTML = '';
    topWords.forEach((item, index) => {
        const wordItem = document.createElement('div');
        wordItem.className = 'difficult-word-item';

        wordItem.innerHTML = `
            <div class="difficult-word-rank">#${index + 1}</div>
            <div class="difficult-word-text">${item.word}</div>
            <div class="difficult-word-errors">
                <div class="difficult-word-count">${item.errors}</div>
                <div class="difficult-word-label">intentos</div>
            </div>
        `;

        difficultWordsList.appendChild(wordItem);
    });
}

// Show empty state when no data available
function showEmptyState() {
    const emptyHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No hay estadísticas disponibles</div><div class="empty-state-hint">Juega algunas partidas para ver tus estadísticas</div></div>';

    document.getElementById('dashTotalWords').textContent = '0';
    document.getElementById('dashTotalTime').textContent = '0';
    document.getElementById('dashBestWpm').textContent = '0';
    document.getElementById('dashBestCombo').textContent = '0';

    const canvas = document.getElementById('accuracyChart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#585b70';
        ctx.font = '16px "Roboto Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('No hay datos disponibles', canvas.width / 2, canvas.height / 2);
    }

    const heatmapContainer = document.getElementById('keyboardHeatmap');
    if (heatmapContainer) heatmapContainer.innerHTML = emptyHTML;

    const difficultWordsList = document.getElementById('difficultWordsList');
    if (difficultWordsList) difficultWordsList.innerHTML = emptyHTML;
}

// --- GENRE CHANGE NOTIFICATION ---
// Shows a large, animated banner announcing the new music genre.
// Triggered by the audio engine callback when the total score crosses a threshold.
function showGenreChangeNotification(genre) {
    const displayNames = {
        trap: '🎤 TRAP',
        lofi: '🌙 LO-FI HIP HOP',
        synthwave: '🕹️ SYNTHWAVE',
        dnb: '🎧 DRUM & BASS',
        futurebass: '🚀 FUTURE BASS'
    };

    const genreColors = {
        trap: '#f38ba8',
        lofi: '#cba6f7',
        synthwave: '#f9e2af',
        dnb: '#89b4fa',
        futurebass: '#a6e3a1'
    };

    const label = displayNames[genre] || String(genre || '').toUpperCase();
    const color = genreColors[genre] || '#89b4fa';

    // Remove any existing notification so back-to-back changes don't stack
    const existing = document.querySelector('.genre-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'genre-notification';
    notification.style.borderColor = color;
    notification.style.color = color;
    notification.innerHTML = `
        <div class="genre-label">NEW BEAT UNLOCKED</div>
        <div class="genre-name">${label}</div>
    `;
    document.body.appendChild(notification);

    // Auto-remove after ~5s with a fade-out animation
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, 500);
    }, 5000);
}
