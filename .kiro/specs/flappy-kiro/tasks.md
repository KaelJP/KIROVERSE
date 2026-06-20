# Implementation Plan: Flappy Kiro

## Overview

Build a retro-style Flappy Bird clone using HTML5 Canvas and vanilla JavaScript, shipped as a single `index.html` file. The implementation follows a centralized configuration approach with object pooling for performance, circular collision detection, sprite batching for rendering, and a fixed-timestep game loop targeting 60 FPS. Existing assets: `assets/ghosty.png`, `assets/jump.wav`, `assets/game_over.wav`.

## Tasks

- [x] 1. Project scaffold and centralized configuration
  - [x] 1.1 Create `index.html` with Canvas element, basic HTML structure, and embedded `<script>` tag containing the `GAME_CONFIG` object with all subsystem parameters (canvas, physics, difficulty, collision, walls, ghosty, particles, pools, rendering, clouds, audio)
    - Define the complete `GAME_CONFIG` object exactly as specified in the design document
    - Freeze the config with `Object.freeze()` to prevent accidental mutation
    - Set up the Canvas element at 400×600 with viewport scaling and letterboxing CSS
    - _Requirements: 1.1, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [x] 1.2 Implement the `ObjectPool<T>` class (generic reusable object pool)
    - Constructor accepts `factory`, `reset`, and `initialSize` parameters
    - Implement `acquire()` — returns from pool if available, creates overflow instance if empty
    - Implement `release(obj)` — calls reset function, returns object to available pool
    - Implement `releaseAll()`, `getActive()`, `getAvailableCount()`, `getActiveCount()`
    - Maintain invariant: an object cannot be in both `pool` and `active` simultaneously
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x]* 1.3 Write property test for ObjectPool acquire/release invariant
    - **Property 24: Object Pool Acquire-Release Invariant**
    - Test with arbitrary sequences of acquire/release operations
    - Verify total objects never decrease below initial pool size
    - Verify acquired objects not available for re-acquisition until released
    - Verify release resets object to default state
    - Verify acquire from non-empty pool returns existing object without allocation
    - **Validates: Requirements 11.1, 11.2**

- [x] 2. Core game engine and state machine
  - [x] 2.1 Implement the `StateMachine` class with valid state transitions
    - Define `GameState` enum: Menu, Ready, Playing, Paused, Game_Over
    - Implement `transition()`, `canTransition()`, `onEnter()`, `onExit()`
    - Enforce valid transitions: Menu→Ready, Ready→Playing, Playing→Paused, Playing→Game_Over, Paused→Playing, Game_Over→Playing
    - _Requirements: 1.3, 1.8, 6.1, 6.5, 6.8_

  - [x] 2.2 Implement the `InputHandler` class for unified input
    - Handle mouse click, touch start, spacebar for flap action
    - Handle P key and Escape key for pause/resume action
    - Register and unregister event listeners on the Canvas
    - _Requirements: 1.6, 2.2, 2.4, 6.1, 6.5_

  - [x] 2.3 Implement the `GameEngine` class with fixed-timestep game loop targeting 60 FPS
    - Use `requestAnimationFrame` for frame timing
    - Calculate delta-time, cap at `GAME_CONFIG.rendering.deltaTimeCap` (50ms)
    - Implement fixed-timestep accumulator: physics updates at 16.67ms steps
    - Compute interpolation factor for smooth rendering between physics steps
    - Update order: physics → collision → scoring → particles → batched render
    - Continue render loop in non-Playing states without physics/collision updates
    - Auto-pause on `visibilitychange` (tab loses focus)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 3. Physics and ghost character
  - [x] 3.1 Implement the `PhysicsEngine` class reading all parameters from `GAME_CONFIG.physics`
    - `applyGravity()`: increase vy by `gravity * dt`
    - `applyFlap()`: set vy to `flapImpulse` (-300 px/s)
    - `clampVelocity()`: enforce terminal velocity down (500) and up (-400)
    - `clampPosition()`: prevent Ghosty going above canvas top, reset velocity to 0
    - `calculateRotation()`: map vy to rotation angle clamped to ±30 degrees
    - `interpolatePosition()`: compute `prevY + (currentY - prevY) * alpha`
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [x]* 3.2 Write property tests for physics engine
    - **Property 1: Gravity Application** — vy increases by exactly gravity * dt
    - **Property 2: Flap Impulse Assignment** — vy set to flapImpulse regardless of prior velocity
    - **Property 3: Terminal Velocity Clamping** — vy bounded within [-400, 500]
    - **Property 4: Top Boundary Position Constraint** — y clamped to 0, vy reset if negative
    - **Property 5: Movement Interpolation** — rendered position = prevY + (currentY - prevY) * alpha
    - **Property 6: Rotation Angle Clamping** — rotation within [-30, 30] degrees
    - **Validates: Requirements 2.1, 2.2, 2.5, 2.6, 2.7, 2.8, 2.9**

  - [x] 3.3 Implement Ghosty state management and sprite rendering
    - Load `assets/ghosty.png` sprite, handle load failure with error message or white circle fallback
    - Compute hitbox radius at init: `min(spriteWidth, spriteHeight) / 2 * radiusScale`
    - Implement menu bobbing animation using `GAME_CONFIG.ghosty.bobAmplitude/bobFrequency`
    - Handle invincibility timer and pulsing opacity effect
    - _Requirements: 1.7, 1.9, 1.11, 2.4, 6.13, 6.14, 8.1, 8.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Wall generation and difficulty scaling
  - [x] 5.1 Implement the `WallManager` class using ObjectPool for wall pairs
    - Constructor takes `GAME_CONFIG.walls` and an `ObjectPool<WallPair>` instance
    - `spawnWall()`: acquire from pool, randomize gap center within [20%, 80%] of canvas height with 60px margin
    - `update()`: scroll walls left at current speed * dt, spawn new walls at configured spacing
    - `recycleOffscreen()`: release walls past left edge back to pool
    - `reset()`: release all walls back to pool
    - Render walls as green rectangles (#2ecc40) with darker caps (#1a7a1a, 10px overhang)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 11.1, 11.3_

  - [x] 5.2 Implement the `DifficultyScaler` class reading thresholds from `GAME_CONFIG.difficulty`
    - Speed multiplier: `min(1.0 + floor(score/5) * 0.05, 2.0)`
    - Gap height: `max(130 - floor(score/5) * 2, 90)`
    - Spacing: `max(200 - floor(score/10) * 5, 150)`
    - `reset()`: return all values to initial state
    - _Requirements: 3.7, 3.8, 3.9, 3.10_

  - [x]* 5.3 Write property tests for wall management and difficulty
    - **Property 7: Wall Pair Horizontal Spacing** — consecutive pairs separated by current spacing value
    - **Property 8: Wall Scroll Position Update** — new x = x - speed * dt
    - **Property 9: Gap Center Constraint** — center Y within [120, 480] on 600px canvas
    - **Property 10: Offscreen Wall Removal** — no wall with x + width < 0 remains active
    - **Property 11: Difficulty Scaling Formulas** — all three formulas produce correct values for any score
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.7, 3.8, 3.9**

- [x] 6. Collision detection (circle-vs-rectangle)
  - [x] 6.1 Implement the `CollisionDetector` class using circular hitbox for Ghosty and AABB for walls
    - `getCircularHitbox()`: compute circle center at `(x + width/2, y + height/2)` with configured radius
    - `circleRectIntersects()`: find nearest point on rectangle to circle center, collision if distance < radius
      - `closestX = clamp(circle.cx, rect.x, rect.x + rect.width)`
      - `closestY = clamp(circle.cy, rect.y, rect.y + rect.height)`
      - `collided = (dx*dx + dy*dy) < radius*radius`
    - `checkCollision()`: test Ghosty's circular hitbox against all active wall AABBs each frame
    - `checkBoundary()`: detect Ghosty bottom edge reaching score bar top
    - Skip collision checks during invincibility frames
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x]* 6.2 Write property tests for collision detection
    - **Property 12: Circular Hitbox Calculation** — center and radius computed correctly from sprite dimensions
    - **Property 13: Circle-vs-Rectangle Collision Detection Correctness** — collision iff distance from center to nearest rect point < radius
    - **Validates: Requirements 4.1, 4.2**

- [x] 7. Scoring system
  - [x] 7.1 Implement the `ScoreManager` class with localStorage persistence
    - Track scored walls with `scored` flag and Set of scored IDs (dual protection)
    - `checkScore()`: increment when Ghosty's center passes wall's right edge, once per wall
    - `loadHighScore()`/`saveHighScore()`: use localStorage with fallback to 0 on errors
    - `updateHighScore()`: high score = max(current, stored)
    - `reset()`: current score to 0, preserve high score
    - Track `isNewRecord` flag and flash timer for gold color effect
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x]* 7.2 Write property tests for scoring
    - **Property 14: Score-Once-Per-Wall Invariant** — score incremented exactly once per wall pair
    - **Property 15: High Score Update** — high score = max(currentScore, storedHighScore)
    - **Validates: Requirements 5.1, 5.5**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Audio, particles, and visual effects
  - [x] 9.1 Implement the `AudioManager` class with preloading and graceful fallback
    - Preload `assets/jump.wav`, `assets/game_over.wav`, and scoring chime
    - `play()`: wrapped in try-catch for browser audio policy
    - Log warning on failed loads, continue without sound
    - Volume levels from `GAME_CONFIG.audio`
    - _Requirements: 2.3, 4.8, 5.3, 7.1, 7.2, 7.3_

  - [x] 9.2 Implement the `ParticleSystem` class using ObjectPool for particles
    - Constructor takes `GAME_CONFIG.particles` and `ObjectPool<Particle>` instance
    - `emitTrail()`: acquire 3-5 particles, white, radius 2-4px, ±3px offset, fade over 400ms
    - `emitBurst()`: acquire 5-8 particles downward on flap
    - `update()`: advance elapsed time, compute opacity = `0.8 * (1 - elapsed/lifetime)`
    - `recycleExpired()`: release particles with opacity <= 0 back to pool
    - _Requirements: 7.4, 7.5, 7.6, 11.2, 11.4_

  - [x]* 9.3 Write property tests for particles
    - **Property 18: Particle Opacity Fade** — opacity = 0.8 * (1 - t/400), released at t >= 400
    - **Property 19: Particle Spawn Constraints** — radius in [2,4], offset in [-3,3]
    - **Property 20: Flap Burst Particle Count** — burst emits [5,8] particles
    - **Validates: Requirements 7.4, 7.5, 7.6**

  - [x] 9.4 Implement game-over effects (screen shake, tumble, white flash, collision animations)
    - Screen shake: 5px amplitude, 300ms duration (from `GAME_CONFIG.rendering`)
    - Tumble rotation: 360 degrees over 500ms
    - White flash: 50% opacity for 100ms
    - Score popup: +1 rising 30px, fading over 600ms
    - _Requirements: 4.9, 4.10, 4.11, 4.12, 5.2_

- [x] 10. Renderer with sprite batching and visual style
  - [x] 10.1 Implement the `Renderer` class with batched draw pipeline
    - Render pipeline order: background → clouds → walls → score bubbles → ghosty → particles → popups → HUD
    - **Batch walls**: set fillStyle to wall color once, draw all wall bodies; then cap color once, draw all caps
    - **Batch particles**: set fillStyle to white once, iterate changing only globalAlpha per particle
    - **Batch UI**: group text draws, minimize font/fillStyle changes
    - Avoid `ctx.save()`/`ctx.restore()` in tight loops; manually restore changed properties
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 11.5, 11.6_

  - [x] 10.2 Implement the `CloudSystem` for parallax background
    - 3+ depth layers with speed factors [0.2, 0.4, 0.6] of wall speed
    - Clouds rendered as semi-transparent white shapes, opacity [0.3, 0.7]
    - Spawn in upper 2/3 of canvas
    - Scroll during Menu, Ready, Playing states
    - _Requirements: 8.6, 8.7, 8.8, 8.9_

  - [x]* 10.3 Write property tests for rendering constraints
    - **Property 21: Canvas Aspect Ratio Preservation** — scaled dimensions maintain 2:3 ratio
    - **Property 22: Cloud System Constraints** — opacity [0.3,0.7], Y ≤ 400, 3+ layers, deeper = slower
    - **Property 23: Delta-Time Capping** — delta-time = min(elapsed, 50)
    - **Validates: Requirements 8.4, 8.6, 8.7, 8.8, 9.2**

- [x] 11. Game state screens and pause/restart
  - [x] 11.1 Implement Menu screen (title, high score, input instructions, Ghosty bobbing)
    - Display "Flappy Kiro" centered in upper third
    - Show persisted high score
    - Show input instructions
    - Animate Ghosty with vertical bob
    - _Requirements: 1.4, 1.5, 1.6, 1.7_

  - [x] 11.2 Implement Ready screen, Pause overlay, and Game Over screen
    - Ready: Ghosty at left-third, "Press Space or Click to Flap" text
    - Pause: semi-transparent dark overlay, "PAUSED" text, resume instructions
    - Game Over: final score, high score, "Tap to Restart" with 500ms debounce
    - _Requirements: 1.9, 1.10, 6.3, 6.4, 6.6, 6.7, 6.12_

  - [x] 11.3 Implement game reset logic and invincibility frames
    - Reset Ghosty position and velocity
    - Release all walls and particles back to pools
    - Reset score to 0, preserve high score
    - Grant 1000ms invincibility with pulsing opacity (50%-100% every 100ms)
    - _Requirements: 6.8, 6.9, 6.10, 6.11, 6.13, 6.14_

  - [x]* 11.4 Write property tests for state management
    - **Property 16: Pause Freezes All State** — no positions/velocities/scores change while paused
    - **Property 17: Game Reset Invariants** — score=0, high score unchanged, invincibility=1000ms, vy=0, no walls
    - **Validates: Requirements 6.2, 6.9, 6.10, 6.11, 6.13**

- [x] 12. Integration, wiring, and HUD
  - [x] 12.1 Wire all subsystems together in `GameEngine.init()` and verify full game loop
    - Instantiate ObjectPools for walls and particles with configured sizes
    - Instantiate all subsystems with config references and pool instances
    - Connect InputHandler callbacks to state machine transitions and physics
    - Wire scoring events to audio, popups, and new-record flash
    - Connect game-over trigger to effects chain (shake, tumble, flash, sound, freeze)
    - Implement Score_Display (dark bottom bar: "Score: X | High: Y")
    - Implement in-game HUD score (large semi-transparent text, opacity 0.3, centered upper canvas)
    - Implement new-record gold flash (#FFD700, 500ms)
    - _Requirements: 5.4, 7.7, 7.8, 8.3_

  - [x]* 12.2 Write integration tests for full game cycle
    - Test Menu → Ready → Playing → Score → Game_Over → Restart loop
    - Verify pool recycling (walls returned on off-screen, particles on expiry)
    - Verify audio plays at correct events (mocked Audio API)
    - _Requirements: All_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All numerical values come from `GAME_CONFIG` — no magic numbers in logic code
- The `ObjectPool` class (task 1.2) must be implemented before WallManager (5.1) and ParticleSystem (9.2)
- Collision detection uses circle-vs-rectangle intersection, not AABB-vs-AABB
- Game loop targets 60 FPS with a 16.67ms frame budget using fixed-timestep accumulator
- Renderer batches draw calls by type to minimize Canvas state changes
- Test framework: Vitest + fast-check, with pure logic extracted into testable functions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.2"] },
    { "id": 2, "tasks": ["1.3", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "5.2"] },
    { "id": 4, "tasks": ["5.1", "6.1", "7.1", "9.1"] },
    { "id": 5, "tasks": ["5.3", "6.2", "7.2", "9.2"] },
    { "id": 6, "tasks": ["9.3", "9.4", "10.1", "10.2"] },
    { "id": 7, "tasks": ["10.3", "11.1", "11.2"] },
    { "id": 8, "tasks": ["11.3", "11.4"] },
    { "id": 9, "tasks": ["12.1"] },
    { "id": 10, "tasks": ["12.2"] }
  ]
}
```
