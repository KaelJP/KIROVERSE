# Requirements Document

## Introduction

Flappy Kiro is a retro-style, endless side-scrolling browser game inspired by Flappy Bird. The player controls a ghost character (Ghosty) that must navigate through gaps between vertically-arranged walls. The game runs entirely in the browser using HTML5 Canvas and JavaScript, features a hand-drawn aesthetic with a light blue background, green walls, and a score tracking system. The game includes a main menu, pause functionality, progressive difficulty scaling, audio/visual feedback systems, and persistent high score storage. Existing assets include a ghost sprite (`assets/ghosty.png`), jump sound (`assets/jump.wav`), and game over sound (`assets/game_over.wav`).

## Glossary

- **Game_Engine**: The core browser-based game loop responsible for updating game state, rendering frames, and handling input
- **Ghosty**: The player-controlled ghost character rendered from the `assets/ghosty.png` sprite
- **Wall_Pair**: A set of two walls (top and bottom) with a gap between them that Ghosty must fly through
- **Wall**: A green rectangular obstacle with a darker green cap, extending from either the top or bottom of the canvas
- **Gap**: The vertical opening between a top Wall and a bottom Wall in a Wall_Pair
- **Score_Display**: The dark bottom bar UI element showing the current score and high score
- **Canvas**: The HTML5 Canvas element used to render all game visuals
- **Collision_Detector**: The subsystem responsible for detecting contact between Ghosty and Walls or boundaries
- **Gravity**: The constant downward acceleration applied to Ghosty each frame, measured in pixels per second squared
- **Flap**: The upward velocity impulse applied to Ghosty when the player provides input
- **Game_State**: The current phase of the game, one of: Menu, Ready, Playing, Paused, or Game_Over
- **Cloud**: A decorative semi-transparent background element rendered at varying depths to create a parallax scrolling effect
- **Score_Bubble**: A white rounded-rectangle visual element displayed between walls as a decorative indicator
- **Terminal_Velocity**: The maximum vertical speed (both upward and downward) that Ghosty cannot exceed
- **Hitbox**: A circular collision boundary for Ghosty (see Circular_Hitbox) that is smaller than the sprite's visual bounding box, providing a forgiving collision margin
- **Difficulty_Scaler**: The subsystem responsible for progressively increasing game speed and reducing gap sizes as the player's score increases
- **Screen_Shake**: A brief rapid displacement of the Canvas rendering offset to provide visual impact feedback on collision
- **Particle_Trail**: A sequence of small fading visual elements emitted behind Ghosty during movement
- **Score_Popup**: A floating "+1" text element that appears near Ghosty when a point is scored, then fades and rises
- **Invincibility_Frame**: A short time window after game restart during which Ghosty cannot collide with walls
- **Movement_Interpolation**: The smoothing of Ghosty's position between physics steps to eliminate visual stuttering
- **Audio_Manager**: The subsystem responsible for loading, playing, and managing all game sound effects and background music
- **Game_Config**: A single centralized configuration object defined at the top of the codebase containing all numerical constants, tuning values, and parameters for physics, difficulty, collision, rendering, audio, and particle systems
- **Object_Pool**: A pre-allocated collection of reusable instances (Wall_Pairs or Particles) that are recycled rather than created and destroyed, minimizing garbage collection pressure
- **Circular_Hitbox**: A circular collision boundary for Ghosty defined as the inscribed circle within the sprite dimensions, where the radius is configurable via Game_Config

## Requirements

### Requirement 1: Game Initialization

**User Story:** As a player, I want the game to load in my browser and display a main menu, so that I know the game is ready to play and I can see my best score.

#### Acceptance Criteria

1. WHEN the page loads, THE Game_Engine SHALL render the Canvas at a fixed resolution of 400×600 pixels
2. WHEN the page loads, THE Game_Engine SHALL display the light blue hand-drawn style background on the Canvas
3. WHEN the page loads, THE Game_Engine SHALL set the Game_State to Menu
4. WHILE the Game_State is Menu, THE Game_Engine SHALL display the game title "Flappy Kiro" centered in the upper third of the Canvas
5. WHILE the Game_State is Menu, THE Game_Engine SHALL display the persisted high score below the title in the format "High Score: [value]"
6. WHILE the Game_State is Menu, THE Game_Engine SHALL display text instructions indicating the accepted input methods (click, tap, or spacebar) to start the game
7. WHILE the Game_State is Menu, THE Game_Engine SHALL animate Ghosty with a gentle vertical bobbing motion at the center of the Canvas
8. WHEN the player provides input while Game_State is Menu, THE Game_Engine SHALL transition Game_State to Ready
9. WHILE the Game_State is Ready, THE Game_Engine SHALL display Ghosty vertically centered and positioned in the left third of the Canvas horizontally
10. WHILE the Game_State is Ready, THE Game_Engine SHALL display text instructions indicating "Press Space or Click to Flap"
11. IF the Ghosty sprite image fails to load, THEN THE Game_Engine SHALL display an error message indicating the asset could not be loaded and SHALL NOT transition to the Ready state

### Requirement 2: Physics System and Ghost Movement

**User Story:** As a player, I want smooth and predictable physics for the ghost, so that I can develop skill and timing to navigate through walls.

#### Acceptance Criteria

1. WHILE the Game_State is Playing, THE Game_Engine SHALL apply Gravity to Ghosty each frame at a constant rate of 980 pixels per second squared (scaled by delta-time)
2. WHILE the Game_State is Playing, WHEN the player clicks the mouse, presses the spacebar, or taps the screen, THE Game_Engine SHALL apply a Flap impulse to Ghosty, setting its vertical velocity to -300 pixels per second (upward)
3. WHEN a Flap is applied, THE Audio_Manager SHALL play the `assets/jump.wav` sound effect
4. WHILE the Game_State is Ready, WHEN the player provides input, THE Game_Engine SHALL transition Game_State to Playing and apply the initial Flap impulse simultaneously
5. THE Game_Engine SHALL enforce a downward Terminal_Velocity of 500 pixels per second, preventing Ghosty from falling faster than this limit
6. THE Game_Engine SHALL enforce an upward Terminal_Velocity of 400 pixels per second, preventing Ghosty from moving upward faster than this limit
7. THE Game_Engine SHALL constrain Ghosty's vertical position so that Ghosty cannot move above the top boundary of the Canvas, resetting upward velocity to zero when Ghosty reaches the top edge
8. THE Game_Engine SHALL apply Movement_Interpolation to Ghosty's rendered position, smoothing between physics steps to eliminate visual stuttering at varying frame rates
9. WHILE the Game_State is Playing, THE Game_Engine SHALL rotate the Ghosty sprite to visually reflect its vertical velocity, tilting upward during ascent and downward during descent with a maximum rotation of 30 degrees in either direction

### Requirement 3: Wall Generation and Difficulty Scaling

**User Story:** As a player, I want walls to scroll toward me with gaps to fly through, and I want the game to get progressively harder, so that the game presents an escalating challenge.

#### Acceptance Criteria

1. WHILE the Game_State is Playing, THE Game_Engine SHALL generate Wall_Pairs at a horizontal spacing of 200 pixels apart, spawning each new Wall_Pair at the right edge of the Canvas
2. WHILE the Game_State is Playing, THE Game_Engine SHALL scroll all Wall_Pairs horizontally from right to left at a base speed of 120 pixels per second (normalized via delta-time)
3. THE Game_Engine SHALL randomize the vertical center of the Gap in each Wall_Pair using a pseudo-random algorithm that constrains the center within 20% to 80% of the Canvas height, ensuring a minimum distance of 60 pixels from both the top and bottom boundaries
4. THE Game_Engine SHALL render each Wall as a green rectangle (color #2ecc40) with a darker green cap (color #1a7a1a) at the opening end, where the cap extends 10 pixels beyond the wall width on each side
5. WHEN a Wall_Pair scrolls completely off the left edge of the Canvas, THE Game_Engine SHALL remove it from active game objects
6. THE Game_Engine SHALL set the initial Gap height to 130 pixels for new game sessions
7. THE Difficulty_Scaler SHALL increase the wall scrolling speed by 5% for every 5 points scored, up to a maximum speed of 200% of the base speed
8. THE Difficulty_Scaler SHALL decrease the Gap height by 2 pixels for every 5 points scored, down to a minimum Gap height of 90 pixels
9. THE Difficulty_Scaler SHALL decrease the horizontal spacing between Wall_Pairs by 5 pixels for every 10 points scored, down to a minimum spacing of 150 pixels
10. WHEN a new game session begins, THE Difficulty_Scaler SHALL reset all difficulty parameters to their initial values

### Requirement 4: Collision Detection and Game Over

**User Story:** As a player, I want fair and precise collision detection with clear visual feedback, so that I feel the game is fair and responsive when I hit an obstacle.

#### Acceptance Criteria

1. THE Collision_Detector SHALL use a Circular_Hitbox for Ghosty defined as the inscribed circle within the sprite dimensions, where the collision radius is configurable via Game_Config
2. THE Collision_Detector SHALL determine collision between Ghosty's Circular_Hitbox and a Wall by computing the distance from the circle center to the nearest point on the Wall's axis-aligned bounding rectangle, and detecting overlap when that distance is less than the collision radius
3. THE Collision_Detector SHALL use axis-aligned bounding rectangles as the collision bounds for all Wall objects
4. WHILE the Game_State is Playing, THE Collision_Detector SHALL check for overlap between Ghosty's Circular_Hitbox and all active Wall bounding rectangles each frame
5. WHEN the Collision_Detector detects any overlap between Ghosty's Circular_Hitbox and a Wall bounding rectangle, THE Game_Engine SHALL transition Game_State to Game_Over
6. WHEN Ghosty's bottom edge (based on full sprite bounds) reaches the top edge of the Score_Display bar, THE Game_Engine SHALL transition Game_State to Game_Over
7. WHEN Ghosty contacts the top boundary of the Canvas, THE Game_Engine SHALL set Ghosty's upward velocity to zero without triggering Game_Over
8. WHEN the Game_State transitions to Game_Over, THE Audio_Manager SHALL play the `assets/game_over.wav` sound effect
9. WHEN the Game_State transitions to Game_Over, THE Game_Engine SHALL apply a Screen_Shake effect with an amplitude of 5 pixels and duration of 300 milliseconds
10. WHEN the Game_State transitions to Game_Over, THE Game_Engine SHALL apply a collision response animation to Ghosty consisting of a brief tumble rotation of 360 degrees over 500 milliseconds
11. WHEN the Game_State transitions to Game_Over, THE Game_Engine SHALL flash the Canvas with a white overlay at 50% opacity for 100 milliseconds
12. WHEN the Game_State transitions to Game_Over, THE Game_Engine SHALL stop Wall scrolling and freeze the game scene after the collision animation completes

### Requirement 5: Scoring System

**User Story:** As a player, I want to earn points for each wall I pass with clear visual and audio feedback, so that I can track my progress and feel rewarded.

#### Acceptance Criteria

1. WHEN Ghosty's horizontal center moves beyond the right edge of a Wall_Pair, THE Game_Engine SHALL increment the current score by exactly one point per Wall_Pair, ensuring each Wall_Pair is only counted once
2. WHEN a point is scored, THE Game_Engine SHALL display a Score_Popup showing "+1" near Ghosty's position that rises 30 pixels and fades out over 600 milliseconds
3. WHEN a point is scored, THE Audio_Manager SHALL play a scoring sound effect (a short chime or ding)
4. THE Score_Display SHALL render the current score and high score in a dark bottom bar in the format "Score: [current] | High: [high]"
5. WHEN the Game_State transitions to Game_Over, THE Game_Engine SHALL compare the current score to the stored high score and update the high score if the current score is greater
6. THE Game_Engine SHALL persist the high score in browser local storage under a defined key so it survives page reloads
7. WHILE the Game_State is Playing, THE Game_Engine SHALL display Score_Bubbles as white rounded rectangles between Wall_Pairs as decorative visual indicators
8. WHEN a new game session begins, THE Game_Engine SHALL reset the current score to zero and load the high score from local storage, defaulting the high score to zero if no stored value exists
9. IF local storage is unavailable or the stored high score value is corrupted, THEN THE Game_Engine SHALL default the high score to zero and continue gameplay without persisting scores

### Requirement 6: Game State Management and Pause

**User Story:** As a player, I want to pause the game and manage different game screens, so that I can take breaks and navigate the game comfortably.

#### Acceptance Criteria

1. WHILE the Game_State is Playing, WHEN the player presses the P key or the Escape key, THE Game_Engine SHALL transition Game_State to Paused
2. WHILE the Game_State is Paused, THE Game_Engine SHALL freeze all physics, wall movement, and collision detection
3. WHILE the Game_State is Paused, THE Game_Engine SHALL display a semi-transparent dark overlay on the Canvas with "PAUSED" text centered on screen
4. WHILE the Game_State is Paused, THE Game_Engine SHALL display instructions to resume ("Press P or Esc to Resume")
5. WHILE the Game_State is Paused, WHEN the player presses the P key or the Escape key, THE Game_Engine SHALL transition Game_State to Playing and resume all updates from where they were frozen
6. WHILE the Game_State is Game_Over, THE Game_Engine SHALL display the final score prominently centered on the Canvas
7. WHILE the Game_State is Game_Over, THE Game_Engine SHALL display the high score below the final score
8. WHILE the Game_State is Game_Over, WHEN the player provides input after a debounce delay of 500 milliseconds, THE Game_Engine SHALL reset the game and transition Game_State to Playing
9. WHEN the game resets, THE Game_Engine SHALL return Ghosty to the default starting position and reset its velocity to zero
10. WHEN the game resets, THE Game_Engine SHALL remove all active Wall_Pairs from the Canvas
11. WHEN the game resets, THE Game_Engine SHALL reset the current score to zero while preserving the high score
12. WHILE the Game_State is Game_Over, THE Game_Engine SHALL display a restart prompt ("Tap to Restart") on the Canvas
13. WHEN the game resets, THE Game_Engine SHALL grant Ghosty Invincibility_Frames for 1000 milliseconds during which collisions with walls are ignored
14. WHILE Invincibility_Frames are active, THE Game_Engine SHALL render Ghosty with a pulsing opacity effect (alternating between 50% and 100% opacity every 100 milliseconds)

### Requirement 7: Audio and Visual Feedback

**User Story:** As a player, I want rich audio and visual feedback for game events, so that the game feels polished and immersive.

#### Acceptance Criteria

1. WHEN the page loads, THE Audio_Manager SHALL preload all sound effect assets (`assets/jump.wav`, `assets/game_over.wav`, and the scoring sound)
2. THE Audio_Manager SHALL support playing background music in a loop while the Game_State is Playing or Paused
3. IF a sound asset fails to load, THEN THE Audio_Manager SHALL log a warning and continue gameplay without that sound effect
4. WHILE the Game_State is Playing, THE Game_Engine SHALL emit a Particle_Trail behind Ghosty consisting of 3 to 5 small circular particles per frame that fade from 80% to 0% opacity over 400 milliseconds
5. THE Game_Engine SHALL render Particle_Trail particles in white with a radius of 2 to 4 pixels, spawned at Ghosty's trailing edge with a slight random vertical offset of plus or minus 3 pixels
6. WHEN a Flap is applied, THE Game_Engine SHALL emit a burst of 5 to 8 particles downward from Ghosty's position to simulate a thrust effect
7. WHILE the Game_State is Playing, THE Game_Engine SHALL display the current score as large semi-transparent text (opacity 0.3) centered in the upper portion of the Canvas for at-a-glance visibility
8. WHEN the current score surpasses the high score during gameplay, THE Game_Engine SHALL briefly flash the score text in a gold color (#FFD700) for 500 milliseconds to indicate a new record

### Requirement 8: Rendering and Visual Style

**User Story:** As a player, I want the game to have a retro hand-drawn look, so that it feels visually charming and distinctive.

#### Acceptance Criteria

1. THE Game_Engine SHALL render Ghosty using the `assets/ghosty.png` sprite image
2. THE Game_Engine SHALL render the background with a light blue color (#87CEEB) and apply a sketchy hand-drawn visual style using subtle procedural line overlays or texture
3. THE Game_Engine SHALL maintain a consistent frame rate of at least 60 frames per second using requestAnimationFrame
4. THE Game_Engine SHALL scale the Canvas rendering to fit the browser viewport while preserving the 400×600 aspect ratio, centering the Canvas horizontally and vertically with a dark background fill for letterboxing
5. IF the Ghosty sprite image (`assets/ghosty.png`) fails to load, THEN THE Game_Engine SHALL render a white circle as a fallback placeholder for Ghosty
6. THE Game_Engine SHALL render Clouds as semi-transparent white shapes (opacity between 0.3 and 0.7) at randomized vertical positions in the upper two-thirds of the Canvas
7. WHILE the Game_State is Playing, THE Game_Engine SHALL scroll each Cloud from right to left at a speed proportional to its assigned depth layer, where farther Clouds move slower than nearer Clouds, creating a parallax perspective effect
8. THE Game_Engine SHALL assign each Cloud to one of at least three depth layers, where each layer scrolls at a distinct speed slower than the Wall scrolling speed
9. WHILE the Game_State is Ready or Menu, THE Game_Engine SHALL scroll Clouds at their respective parallax speeds to provide ambient background motion

### Requirement 9: Game Loop

**User Story:** As a player, I want the game to run smoothly with consistent timing, so that gameplay feels responsive and fair.

#### Acceptance Criteria

1. THE Game_Engine SHALL run the game loop using requestAnimationFrame for frame timing, targeting 60 frames per second
2. THE Game_Engine SHALL calculate delta-time as the elapsed time since the previous frame and cap it to a maximum of 50 milliseconds to prevent physics instability on frame drops or tab switching
3. WHILE the Game_State is Playing, THE Game_Engine SHALL update physics, then collision detection, then rendering each frame in that order
4. WHILE the Game_State is Ready, Menu, Paused, or Game_Over, THE Game_Engine SHALL continue the render loop to display the current visual state without updating physics or collision detection
5. WHEN the browser tab loses focus, THE Game_Engine SHALL automatically transition to Paused state if Game_State is Playing
6. THE Game_Engine SHALL minimize frame time to remain under 16.67 milliseconds per frame to sustain the 60 frames per second target

### Requirement 10: Centralized Configuration

**User Story:** As a developer, I want all numerical constants and tuning values centralized in a single configuration object, so that I can tweak gameplay parameters without modifying logic code.

#### Acceptance Criteria

1. THE Game_Engine SHALL define a single centralized Game_Config object at the top of the codebase containing all numerical constants for physics, difficulty, collision, rendering, audio, and particle systems
2. THE Game_Engine SHALL reference Game_Config values for all physics parameters including Gravity magnitude, Flap impulse velocity, Terminal_Velocity limits, and rotation angle bounds
3. THE Game_Engine SHALL reference Game_Config values for all difficulty parameters including base wall speed, gap height, wall spacing, scaling increments, and minimum/maximum bounds
4. THE Game_Engine SHALL reference Game_Config values for all collision parameters including Ghosty's Circular_Hitbox radius, Wall bounding rectangle dimensions, and boundary offsets
5. THE Game_Engine SHALL reference Game_Config values for all rendering parameters including Canvas dimensions, frame rate target, color values, opacity levels, and animation durations
6. THE Game_Engine SHALL reference Game_Config values for all audio parameters including volume levels and sound asset paths
7. THE Game_Engine SHALL reference Game_Config values for all particle parameters including particle count ranges, sizes, fade durations, and spawn offsets
8. THE Game_Engine SHALL NOT embed numerical constants or tuning values directly in logic code when those values are configurable gameplay parameters

### Requirement 11: Performance Optimization

**User Story:** As a player, I want the game to run without frame drops or stutter, so that gameplay feels smooth and responsive on a wide range of devices.

#### Acceptance Criteria

1. THE Game_Engine SHALL use an Object_Pool for Wall_Pair instances, pre-allocating a pool of reusable Wall_Pair objects and recycling them when they scroll off-screen instead of creating new instances
2. THE Game_Engine SHALL use an Object_Pool for Particle instances, pre-allocating a pool of reusable Particle objects and recycling them when their lifetime expires instead of creating new instances
3. WHEN a Wall_Pair scrolls off the left edge of the Canvas, THE Game_Engine SHALL return the Wall_Pair to the Object_Pool for reuse rather than destroying the instance
4. WHEN a Particle's opacity reaches zero, THE Game_Engine SHALL return the Particle to the Object_Pool for reuse rather than destroying the instance
5. THE Game_Engine SHALL batch similar draw operations during rendering, drawing all Wall objects in sequence, then all Particle objects in sequence, then all UI elements in sequence, to minimize Canvas rendering state changes
6. THE Game_Engine SHALL minimize Canvas context state changes by grouping draw calls that share the same fill color, stroke color, or transformation matrix
