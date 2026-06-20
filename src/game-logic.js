/**
 * Extracted pure game logic from index.html for testing.
 * These classes are duplicated here to be importable by Vitest.
 * Any changes to logic in index.html should be mirrored here and vice versa.
 */

// ============================================================
// GAME_CONFIG - Centralized Configuration
// ============================================================

export const GAME_CONFIG = Object.freeze({
  canvas: Object.freeze({
    width: 400,
    height: 600,
    aspectRatio: 2 / 3,
    backgroundColor: '#87CEEB',
    frameRateTarget: 60,
    frameBudgetMs: 16.67
  }),

  physics: Object.freeze({
    gravity: 980,
    flapImpulse: -300,
    terminalVelocityDown: 500,
    terminalVelocityUp: 400,
    maxRotationDeg: 30,
    physicsStepMs: 16.67
  }),

  difficulty: Object.freeze({
    baseWallSpeed: 120,
    baseSpacing: 200,
    baseGapHeight: 130,
    minGapHeight: 90,
    minSpacing: 150,
    speedIncrementPercent: 5,
    speedThreshold: 5,
    maxSpeedMultiplier: 2.0,
    gapDecrementPx: 2,
    gapThreshold: 5,
    spacingDecrementPx: 5,
    spacingThreshold: 10
  }),

  collision: Object.freeze({
    ghostyHitboxRadius: null,
    ghostyHitboxRadiusScale: 1.0,
    wallBoundingMode: 'aabb'
  }),

  walls: Object.freeze({
    width: 50,
    capOverhang: 10,
    capHeight: 20,
    wallColor: '#2ecc40',
    capColor: '#1a7a1a',
    gapCenterMinPercent: 0.2,
    gapCenterMaxPercent: 0.8,
    gapCenterMinMargin: 60
  }),

  ghosty: Object.freeze({
    spriteWidth: 40,
    spriteHeight: 40,
    startXFraction: 0.33,
    startYFraction: 0.5,
    bobAmplitude: 10,
    bobFrequency: 2
  }),

  particles: Object.freeze({
    trailCountMin: 3,
    trailCountMax: 5,
    burstCountMin: 5,
    burstCountMax: 8,
    radiusMin: 2,
    radiusMax: 4,
    initialOpacity: 0.8,
    lifetimeMs: 400,
    spawnOffsetY: 3,
    color: '#FFFFFF',
    poolSize: 100
  }),

  pools: Object.freeze({
    wallPairPoolSize: 10,
    particlePoolSize: 100
  }),

  rendering: Object.freeze({
    deltaTimeCap: 50,
    screenShakeAmplitude: 5,
    screenShakeDuration: 300,
    tumbleRotation: 360,
    tumbleDuration: 500,
    whiteFlashOpacity: 0.5,
    whiteFlashDuration: 100,
    scorePopupRise: 30,
    scorePopupDuration: 600,
    invincibilityDuration: 1000,
    invincibilityPulseInterval: 100,
    invincibilityMinOpacity: 0.5,
    invincibilityMaxOpacity: 1.0,
    gameOverDebounce: 500,
    newRecordFlashDuration: 500,
    newRecordFlashColor: '#FFD700',
    hudScoreOpacity: 0.3
  }),

  clouds: Object.freeze({
    layerCount: 3,
    speedFactors: Object.freeze([0.2, 0.4, 0.6]),
    minOpacity: 0.3,
    maxOpacity: 0.7,
    spawnRegionFraction: 0.66
  }),

  audio: Object.freeze({
    jumpSound: 'assets/jump.wav',
    gameOverSound: 'assets/game_over.wav',
    scoreSound: null,
    masterVolume: 1.0,
    sfxVolume: 0.8
  })
});

// ============================================================
// ObjectPool<T>
// ============================================================

export class ObjectPool {
  constructor(factory, reset, initialSize) {
    this._factory = factory;
    this._reset = reset;
    this._initialSize = initialSize;
    this._pool = [];
    this._active = [];

    for (let i = 0; i < initialSize; i++) {
      this._pool.push(this._factory());
    }
  }

  acquire() {
    let obj;
    if (this._pool.length > 0) {
      obj = this._pool.pop();
    } else {
      obj = this._factory();
    }
    this._active.push(obj);
    return obj;
  }

  release(obj) {
    const index = this._active.indexOf(obj);
    if (index === -1) return;
    this._active.splice(index, 1);
    this._reset(obj);
    this._pool.push(obj);
  }

  releaseAll() {
    while (this._active.length > 0) {
      const obj = this._active.pop();
      this._reset(obj);
      this._pool.push(obj);
    }
  }

  getActive() {
    return this._active;
  }

  getAvailableCount() {
    return this._pool.length;
  }

  getActiveCount() {
    return this._active.length;
  }
}

// ============================================================
// GameState Enum
// ============================================================

export const GameState = Object.freeze({
  Menu: 'Menu',
  Ready: 'Ready',
  Playing: 'Playing',
  Paused: 'Paused',
  Game_Over: 'Game_Over'
});

// ============================================================
// StateMachine
// ============================================================

export class StateMachine {
  constructor() {
    this.currentState = GameState.Menu;
    this.previousState = null;

    this._transitions = {
      [GameState.Menu]: [GameState.Ready],
      [GameState.Ready]: [GameState.Playing],
      [GameState.Playing]: [GameState.Paused, GameState.Game_Over],
      [GameState.Paused]: [GameState.Playing],
      [GameState.Game_Over]: [GameState.Playing]
    };

    this._onEnterCallbacks = {};
    this._onExitCallbacks = {};
  }

  canTransition(from, to) {
    const allowed = this._transitions[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  transition(newState) {
    if (!this.canTransition(this.currentState, newState)) {
      return false;
    }

    const oldState = this.currentState;
    this.previousState = oldState;
    this.onExit(oldState);
    this.currentState = newState;
    this.onEnter(newState);
    return true;
  }

  onEnter(state) {
    const callback = this._onEnterCallbacks[state];
    if (callback) callback(state);
  }

  onExit(state) {
    const callback = this._onExitCallbacks[state];
    if (callback) callback(state);
  }

  registerOnEnter(state, callback) {
    this._onEnterCallbacks[state] = callback;
  }

  registerOnExit(state, callback) {
    this._onExitCallbacks[state] = callback;
  }
}

// ============================================================
// PhysicsEngine
// ============================================================

export class PhysicsEngine {
  constructor(config) {
    this.config = config;
  }

  applyGravity(ghosty, dt) {
    ghosty.vy += this.config.gravity * dt;
  }

  applyFlap(ghosty) {
    ghosty.vy = this.config.flapImpulse;
  }

  clampVelocity(ghosty) {
    if (ghosty.vy > this.config.terminalVelocityDown) {
      ghosty.vy = this.config.terminalVelocityDown;
    }
    if (ghosty.vy < -this.config.terminalVelocityUp) {
      ghosty.vy = -this.config.terminalVelocityUp;
    }
  }

  clampPosition(ghosty, canvasHeight) {
    if (ghosty.y < 0) {
      ghosty.y = 0;
      if (ghosty.vy < 0) {
        ghosty.vy = 0;
      }
    }
  }

  calculateRotation(vy) {
    const maxDeg = this.config.maxRotationDeg;
    let angle = (vy / this.config.terminalVelocityDown) * maxDeg;
    if (angle > maxDeg) angle = maxDeg;
    if (angle < -maxDeg) angle = -maxDeg;
    return angle;
  }

  interpolatePosition(prevY, currentY, alpha) {
    return prevY + (currentY - prevY) * alpha;
  }

  update(ghosty, dt) {
    this.applyGravity(ghosty, dt);
    this.clampVelocity(ghosty);
    this.clampPosition(ghosty, GAME_CONFIG.canvas.height);
  }
}

// ============================================================
// DifficultyScaler
// ============================================================

export class DifficultyScaler {
  constructor(config) {
    this.config = config;
  }

  calculate(score) {
    const config = this.config;

    const speedMultiplier = Math.min(
      1.0 + Math.floor(score / config.speedThreshold) * (config.speedIncrementPercent / 100),
      config.maxSpeedMultiplier
    );

    const gapHeight = Math.max(
      config.baseGapHeight - Math.floor(score / config.gapThreshold) * config.gapDecrementPx,
      config.minGapHeight
    );

    const spacing = Math.max(
      config.baseSpacing - Math.floor(score / config.spacingThreshold) * config.spacingDecrementPx,
      config.minSpacing
    );

    const currentSpeed = config.baseWallSpeed * speedMultiplier;

    return { speedMultiplier, gapHeight, spacing, currentSpeed };
  }

  reset() {}
}

// ============================================================
// CollisionDetector
// ============================================================

export class CollisionDetector {
  constructor(config) {
    this.config = config;
  }

  getCircularHitbox(ghosty) {
    const cx = ghosty.x + ghosty.width / 2;
    const cy = ghosty.y + ghosty.height / 2;
    const radius = ghosty.hitboxRadius;
    return { cx, cy, radius };
  }

  static circleRectIntersects(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.cx, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.cy, rect.y + rect.height));
    const dx = circle.cx - closestX;
    const dy = circle.cy - closestY;
    return (dx * dx + dy * dy) < (circle.radius * circle.radius);
  }

  checkCollision(ghosty, walls) {
    if (ghosty.isInvincible && ghosty.isInvincible()) {
      return { collided: false, type: 'none' };
    }
    if (ghosty.invincibleTimer > 0) {
      return { collided: false, type: 'none' };
    }

    const circle = this.getCircularHitbox(ghosty);

    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];

      const topRect = {
        x: wall.x,
        y: 0,
        width: wall.width,
        height: wall.gapCenterY - wall.gapHeight / 2
      };

      const bottomY = wall.gapCenterY + wall.gapHeight / 2;
      const bottomRect = {
        x: wall.x,
        y: bottomY,
        width: wall.width,
        height: GAME_CONFIG.canvas.height - bottomY
      };

      if (CollisionDetector.circleRectIntersects(circle, topRect) ||
          CollisionDetector.circleRectIntersects(circle, bottomRect)) {
        return { collided: true, type: 'wall', wallPair: wall };
      }
    }

    return { collided: false, type: 'none' };
  }

  checkBoundary(ghosty, scoreBarTop) {
    if (ghosty.y + ghosty.height >= scoreBarTop) {
      return { collided: true, type: 'floor' };
    }
    return { collided: false, type: 'none' };
  }
}

// ============================================================
// WallManager
// ============================================================

export function createWallPair() {
  return {
    id: 0,
    x: 0,
    gapCenterY: 0,
    gapHeight: 0,
    scored: false,
    width: GAME_CONFIG.walls.width,
    active: false
  };
}

export function resetWallPair(wall) {
  wall.id = 0;
  wall.x = 0;
  wall.gapCenterY = 0;
  wall.gapHeight = 0;
  wall.scored = false;
  wall.width = GAME_CONFIG.walls.width;
  wall.active = false;
}

export class WallManager {
  constructor(config, pool) {
    this.config = config;
    this.pool = pool;
    this._nextId = 1;
    this._lastSpawnX = 0;
    this._canvasWidth = GAME_CONFIG.canvas.width;
    this._canvasHeight = GAME_CONFIG.canvas.height;
  }

  spawnWall(canvasHeight, difficulty) {
    const wall = this.pool.acquire();

    wall.id = this._nextId++;
    wall.x = this._lastSpawnX === 0
      ? this._canvasWidth
      : this._lastSpawnX + difficulty.spacing;

    const min = canvasHeight * this.config.gapCenterMinPercent;
    const max = canvasHeight * this.config.gapCenterMaxPercent;
    const clampedMin = Math.max(min, this.config.gapCenterMinMargin);
    const clampedMax = Math.min(max, canvasHeight - this.config.gapCenterMinMargin);
    wall.gapCenterY = clampedMin + Math.random() * (clampedMax - clampedMin);

    wall.gapHeight = difficulty.gapHeight;
    wall.width = this.config.width;
    wall.scored = false;
    wall.active = true;

    this._lastSpawnX = wall.x;

    return wall;
  }

  update(dt, difficulty) {
    const activeWalls = this.pool.getActive();

    for (let i = 0; i < activeWalls.length; i++) {
      activeWalls[i].x -= difficulty.currentSpeed * dt;
    }

    if (activeWalls.length === 0) {
      this.spawnWall(this._canvasHeight, difficulty);
    } else {
      let rightmostX = -Infinity;
      for (let i = 0; i < activeWalls.length; i++) {
        if (activeWalls[i].x > rightmostX) {
          rightmostX = activeWalls[i].x;
        }
      }

      if (rightmostX < this._canvasWidth - difficulty.spacing) {
        this._lastSpawnX = rightmostX;
        this.spawnWall(this._canvasHeight, difficulty);
      }
    }

    this.recycleOffscreen();
  }

  recycleOffscreen() {
    const activeWalls = this.pool.getActive();
    for (let i = activeWalls.length - 1; i >= 0; i--) {
      const wall = activeWalls[i];
      if (wall.x + wall.width < 0) {
        this.pool.release(wall);
      }
    }
  }

  reset() {
    this.pool.releaseAll();
    this._lastSpawnX = 0;
    this._nextId = 1;
  }

  getActiveWalls() {
    return this.pool.getActive();
  }
}

// ============================================================
// ScoreManager
// ============================================================

export class ScoreManager {
  constructor(storageKey, storage) {
    this.storageKey = storageKey;
    this._storage = storage || null; // optional mock storage
    this.currentScore = 0;
    this.highScore = this.loadHighScore();
    this.scoredWalls = new Set();
    this.isNewRecord = false;
    this.newRecordFlashTimer = 0;
  }

  checkScore(ghosty, walls) {
    const ghostyCenterX = ghosty.x + ghosty.width / 2;

    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];
      const wallRightEdge = wall.x + wall.width;

      if (ghostyCenterX > wallRightEdge && !wall.scored && !this.scoredWalls.has(wall.id)) {
        wall.scored = true;
        this.scoredWalls.add(wall.id);
        this.currentScore++;

        if (this.currentScore > this.highScore) {
          this.isNewRecord = true;
          this.newRecordFlashTimer = GAME_CONFIG.rendering.newRecordFlashDuration;
        }

        return true;
      }
    }

    return false;
  }

  loadHighScore() {
    try {
      if (this._storage) {
        return parseInt(this._storage.getItem(this.storageKey)) || 0;
      }
      return 0;
    } catch (e) {
      return 0;
    }
  }

  saveHighScore() {
    try {
      if (this._storage) {
        this._storage.setItem(this.storageKey, this.highScore.toString());
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  updateHighScore() {
    this.highScore = Math.max(this.currentScore, this.highScore);
    this.saveHighScore();
  }

  reset() {
    this.currentScore = 0;
    this.scoredWalls.clear();
    this.isNewRecord = false;
    this.newRecordFlashTimer = 0;
    this.highScore = this.loadHighScore();
  }

  updateFlashTimer(dt) {
    if (this.newRecordFlashTimer > 0) {
      this.newRecordFlashTimer -= dt * 1000;
      if (this.newRecordFlashTimer < 0) {
        this.newRecordFlashTimer = 0;
      }
    }
  }
}

// ============================================================
// ParticleSystem
// ============================================================

export function createParticle() {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 2,
    opacity: 0,
    lifetime: 400,
    elapsed: 0,
    active: false
  };
}

export function resetParticle(p) {
  p.x = 0;
  p.y = 0;
  p.vx = 0;
  p.vy = 0;
  p.radius = 2;
  p.opacity = 0;
  p.lifetime = 400;
  p.elapsed = 0;
  p.active = false;
}

export class ParticleSystem {
  constructor(config, pool) {
    this.config = config;
    this.pool = pool;
  }

  emitTrail(x, y) {
    const config = this.config;
    const count = Math.floor(Math.random() * (config.trailCountMax - config.trailCountMin + 1)) + config.trailCountMin;

    for (let i = 0; i < count; i++) {
      const particle = this.pool.acquire();
      particle.x = x;
      particle.y = y + (Math.random() * 2 - 1) * config.spawnOffsetY;
      particle.vx = -20;
      particle.vy = Math.random() * 20 - 10;
      particle.radius = Math.random() * (config.radiusMax - config.radiusMin) + config.radiusMin;
      particle.opacity = config.initialOpacity;
      particle.lifetime = config.lifetimeMs;
      particle.elapsed = 0;
      particle.active = true;
    }
  }

  emitBurst(x, y) {
    const config = this.config;
    const count = Math.floor(Math.random() * (config.burstCountMax - config.burstCountMin + 1)) + config.burstCountMin;

    for (let i = 0; i < count; i++) {
      const particle = this.pool.acquire();
      particle.x = x;
      particle.y = y;
      particle.vx = Math.random() * 60 - 30;
      particle.vy = Math.random() * 40 + 20;
      particle.radius = Math.random() * (config.radiusMax - config.radiusMin) + config.radiusMin;
      particle.opacity = config.initialOpacity;
      particle.lifetime = config.lifetimeMs;
      particle.elapsed = 0;
      particle.active = true;
    }
  }

  update(dt) {
    const dtMs = dt * 1000;
    const config = this.config;
    const activeParticles = this.pool.getActive();

    for (let i = 0; i < activeParticles.length; i++) {
      const particle = activeParticles[i];
      if (!particle.active) continue;

      particle.elapsed += dtMs;
      particle.opacity = config.initialOpacity * (1 - particle.elapsed / particle.lifetime);
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }

    this.recycleExpired();
  }

  recycleExpired() {
    const activeParticles = this.pool.getActive();

    for (let i = activeParticles.length - 1; i >= 0; i--) {
      const particle = activeParticles[i];
      if (particle.elapsed >= particle.lifetime || particle.opacity <= 0) {
        this.pool.release(particle);
      }
    }
  }

  reset() {
    this.pool.releaseAll();
  }

  getActiveParticles() {
    return this.pool.getActive();
  }
}

// ============================================================
// CloudSystem
// ============================================================

export class CloudSystem {
  constructor(config) {
    this.config = config;
    this.clouds = [];
    this._canvasWidth = GAME_CONFIG.canvas.width;
    this._canvasHeight = GAME_CONFIG.canvas.height;
    this._initializeClouds();
  }

  _initializeClouds() {
    this.clouds = [];

    for (let layer = 0; layer < this.config.layerCount; layer++) {
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const cloud = this.spawnCloud(layer);
        cloud.x = Math.random() * this._canvasWidth;
        this.clouds.push(cloud);
      }
    }
  }

  spawnCloud(layer) {
    const config = this.config;
    const x = this._canvasWidth + Math.random() * 100;
    const y = Math.random() * (this._canvasHeight * config.spawnRegionFraction);
    const width = 60 + Math.random() * 60;
    const height = 20 + Math.random() * 20;
    const opacity = config.minOpacity + Math.random() * (config.maxOpacity - config.minOpacity);
    const speedFactor = config.speedFactors[layer];

    return { x, y, width, height, layer, opacity, speedFactor };
  }

  update(dt, wallSpeed) {
    for (let i = 0; i < this.clouds.length; i++) {
      const cloud = this.clouds[i];
      cloud.x -= wallSpeed * cloud.speedFactor * dt;

      if (cloud.x + cloud.width < 0) {
        cloud.x = this._canvasWidth + Math.random() * 100;
        cloud.y = Math.random() * (this._canvasHeight * this.config.spawnRegionFraction);
        cloud.width = 60 + Math.random() * 60;
        cloud.height = 20 + Math.random() * 20;
        cloud.opacity = this.config.minOpacity + Math.random() * (this.config.maxOpacity - this.config.minOpacity);
      }
    }
  }

  reset() {
    this.clouds = [];
    this._initializeClouds();
  }
}

// ============================================================
// Utility: Canvas Aspect Ratio Scaling
// ============================================================

export function calculateScaledDimensions(viewportWidth, viewportHeight, aspectRatio) {
  // aspectRatio = width / height = 2/3
  const targetRatio = aspectRatio;

  let scaledWidth, scaledHeight;

  if (viewportWidth / viewportHeight < targetRatio) {
    // Viewport is taller than target — width-constrained
    scaledWidth = viewportWidth;
    scaledHeight = viewportWidth / targetRatio;
  } else {
    // Viewport is wider than target — height-constrained
    scaledHeight = viewportHeight;
    scaledWidth = viewportHeight * targetRatio;
  }

  return { width: scaledWidth, height: scaledHeight };
}

// ============================================================
// Utility: Delta-Time Capping
// ============================================================

export function capDeltaTime(elapsed, cap) {
  return Math.min(elapsed, cap);
}
