// Main game class that ties everything together

class Game {
  constructor() {
    // DOM elements
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.scoreDisplay = document.getElementById("score");
    this.finalScoreDisplay = document.getElementById("finalScore");
    this.gameOverScreen = document.getElementById("gameOver");
    this.startMenu = document.getElementById("startMenu");
    this.pauseMenu = document.getElementById("pauseMenu");
    this.startButton = document.getElementById("startButton");
    this.restartButton = document.getElementById("restartButton");
    this.pauseButton = document.getElementById("pauseButton");
    this.resumeButton = document.getElementById("resumeButton");
    this.quitButton = document.getElementById("quitButton");
    this.godModeToggle = document.getElementById("godModeToggle");

    // Mobile controls
    this.mobileControls = document.getElementById("mobileControls");
    this.leftJoystickArea = document.getElementById("leftJoystickArea");
    this.leftJoystick = document.getElementById("leftJoystick");
    this.leftJoystickKnob = document.getElementById("leftJoystickKnob");
    this.rightJoystickArea = document.getElementById("rightJoystickArea");
    this.rightJoystick = document.getElementById("rightJoystick");
    this.rightJoystickKnob = document.getElementById("rightJoystickKnob");
    // this.fireButton = document.getElementById("fireButton");

    // Game state
    this.isRunning = false;
    this.isPaused = false;
    this.godModeEnabled = false;
    this.animationFrameId = null;
    this.lastTime = 0;
    this.fps = 60;
    this.frameTime = 1000 / this.fps;
    this.accumulator = 0;

    // Detect if performance mode is needed
    this.isMobile = this.detectMobile();
    this.performanceMode = this.shouldUsePerformanceMode();

    // Game scale for mobile devices
    this.gameScale = 1;
    if (this.isMobile) {
      // Scale down game elements on small screens
      if (window.innerWidth < 480 || window.innerHeight < 800) {
        this.gameScale = 0.7;
      } else {
        this.gameScale = 0.85;
      }
    }

    // Show mobile controls if on mobile device
    if (this.isMobile) {
      this.mobileControls.classList.remove("hidden");
      this.setupMobileControls();
    }

    // Initialize canvas size
    this.resizeCanvas();

    // Game objects
    this.particles = new ParticleSystem(this.canvas, this.ctx);
    this.grid = new Grid(this.canvas, this.ctx);
    this.player = new Player(
      this.canvas,
      this.ctx,
      this.particles,
      this.gameScale
    );
    this.enemyManager = new EnemyManager(
      this.canvas,
      this.ctx,
      this.particles,
      this.player,
      this.grid,
      this.gameScale
    );

    // Event listeners
    window.addEventListener("resize", () => this.resizeCanvas());
    this.startButton.addEventListener("click", () => this.startGame());
    this.restartButton.addEventListener("click", () => this.restartGame());
    this.pauseButton.addEventListener("click", () => this.togglePause());
    this.resumeButton.addEventListener("click", () => this.resumeGame());
    this.quitButton.addEventListener("click", () => this.quitToMenu());
    this.godModeToggle.addEventListener("click", () => this.toggleGodMode());

    // Keyboard shortcut for pause (Escape key)
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isRunning) {
        this.togglePause();
      }
    });

    // Post-processing effects
    this.bloomCanvas = document.createElement("canvas");
    this.bloomCtx = this.bloomCanvas.getContext("2d");

    // Use lower blur strength in performance mode
    this.blurStrength = this.performanceMode ? 5 : 10;

    // Initialize
    this.showStartMenu();
  }

  // Detect if performance mode is needed based on device capabilities
  shouldUsePerformanceMode() {
    return (
      this.isMobile ||
      (navigator.deviceMemory && navigator.deviceMemory < 4) ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4)
    );
  }

  // Detect mobile devices
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  // Setup mobile controls
  setupMobileControls() {
    // Left joystick variables (movement)
    let leftJoystickActive = false;
    let leftJoystickStartPos = { x: 0, y: 0 };
    let leftCurrentPos = { x: 0, y: 0 };
    let leftJoystickDelta = { x: 0, y: 0 };

    // Right joystick variables (aiming)
    let rightJoystickActive = false;
    let rightJoystickStartPos = { x: 0, y: 0 };
    let rightCurrentPos = { x: 0, y: 0 };
    let rightJoystickDelta = { x: 0, y: 0 };

    const maxJoystickDistance = 40;

    // Fire button variables
    let isFiring = false;

    // Make sure UI buttons work on mobile
    const startButton = document.getElementById("startButton");
    const restartButton = document.getElementById("restartButton");
    const resumeButton = document.getElementById("resumeButton");
    const quitButton = document.getElementById("quitButton");
    const pauseButton = document.getElementById("pauseButton");

    // Add click event for mobile
    startButton.addEventListener("click", () => {
      console.log("Start button clicked");
      this.startGame();
    });

    // Touch event for mobile start button
    startButton.addEventListener("touchend", (e) => {
      e.preventDefault();
      console.log("Start button touched");
      this.startGame();
    });

    // LEFT JOYSTICK - Movement
    this.leftJoystickArea.addEventListener("touchstart", (e) => {
      e.preventDefault();
      leftJoystickActive = true;

      const rect = this.leftJoystickArea.getBoundingClientRect();
      leftJoystickStartPos = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      const touch = e.touches[0];
      leftCurrentPos = {
        x: touch.clientX,
        y: touch.clientY,
      };

      updateLeftJoystickPosition();
    });

    this.leftJoystickArea.addEventListener("touchmove", (e) => {
      if (!leftJoystickActive) return;
      e.preventDefault();

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const rect = this.leftJoystickArea.getBoundingClientRect();

        if (
          touch.clientX >= rect.left - 50 &&
          touch.clientX <= rect.right + 50 &&
          touch.clientY >= rect.top - 50 &&
          touch.clientY <= rect.bottom + 50
        ) {
          leftCurrentPos = {
            x: touch.clientX,
            y: touch.clientY,
          };
          updateLeftJoystickPosition();
          break;
        }
      }
    });

    this.leftJoystickArea.addEventListener("touchend", (e) => {
      // Check if all touches have ended
      let leftTouchStillActive = false;

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const rect = this.leftJoystickArea.getBoundingClientRect();

        if (
          touch.clientX >= rect.left - 50 &&
          touch.clientX <= rect.right + 50 &&
          touch.clientY >= rect.top - 50 &&
          touch.clientY <= rect.bottom + 50
        ) {
          leftTouchStillActive = true;
          break;
        }
      }

      if (!leftTouchStillActive) {
        leftJoystickActive = false;
        this.leftJoystickKnob.style.transform = "translate(-50%, -50%)";
        leftJoystickDelta = { x: 0, y: 0 };

        // Reset player movement input if touch ended
        if (this.player) {
          this.player.keys.up = false;
          this.player.keys.down = false;
          this.player.keys.left = false;
          this.player.keys.right = false;
        }
      }
    });

    // RIGHT JOYSTICK - Aiming & Rotation
    this.rightJoystickArea.addEventListener("touchstart", (e) => {
      e.preventDefault();
      rightJoystickActive = true;

      const rect = this.rightJoystickArea.getBoundingClientRect();
      rightJoystickStartPos = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      const touch = e.touches[0];
      rightCurrentPos = {
        x: touch.clientX,
        y: touch.clientY,
      };

      // Immediately start firing when joystick is touched
      if (this.player) {
        this.player.mouse.shooting = true;
      }

      updateRightJoystickPosition();
    });

    this.rightJoystickArea.addEventListener("touchmove", (e) => {
      if (!rightJoystickActive) return;
      e.preventDefault();

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const rect = this.rightJoystickArea.getBoundingClientRect();

        if (
          touch.clientX >= rect.left - 50 &&
          touch.clientX <= rect.right + 50 &&
          touch.clientY >= rect.top - 50 &&
          touch.clientY <= rect.bottom + 50
        ) {
          rightCurrentPos = {
            x: touch.clientX,
            y: touch.clientY,
          };
          updateRightJoystickPosition();
          break;
        }
      }
    });

    this.rightJoystickArea.addEventListener("touchend", (e) => {
      // Check if all touches have ended
      let rightTouchStillActive = false;

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const rect = this.rightJoystickArea.getBoundingClientRect();

        if (
          touch.clientX >= rect.left - 50 &&
          touch.clientX <= rect.right + 50 &&
          touch.clientY >= rect.top - 50 &&
          touch.clientY <= rect.bottom + 50
        ) {
          rightTouchStillActive = true;
          break;
        }
      }

      if (!rightTouchStillActive) {
        rightJoystickActive = false;
        this.rightJoystickKnob.style.transform = "translate(-50%, -50%)";
        rightJoystickDelta = { x: 0, y: 0 };

        // Keep firing if right joystick was active
        if (this.player) {
          // Stop firing when right joystick is released
          if (
            Math.abs(rightJoystickDelta.x) < 0.1 &&
            Math.abs(rightJoystickDelta.y) < 0.1
          ) {
            this.player.mouse.shooting = false;
          }
        }
      }
    });

    // Fire button events - now optional since right joystick can fire
    // this.fireButton.addEventListener("touchstart", (e) => {
    //   e.preventDefault();
    //   isFiring = true;
    //   if (this.player) {
    //     this.player.mouse.shooting = true;
    //   }
    // });

    // this.fireButton.addEventListener("touchend", (e) => {
    //   e.preventDefault();
    //   isFiring = false;
    //   if (this.player) {
    //     this.player.mouse.shooting = false;
    //   }
    // });

    // Function to update left joystick position and player movement
    const updateLeftJoystickPosition = () => {
      const deltaX = leftCurrentPos.x - leftJoystickStartPos.x;
      const deltaY = leftCurrentPos.y - leftJoystickStartPos.y;

      // Calculate distance from center
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Normalize and limit the joystick movement
      const angle = Math.atan2(deltaY, deltaX);
      const limitedDistance = Math.min(distance, maxJoystickDistance);

      leftJoystickDelta = {
        x: (Math.cos(angle) * limitedDistance) / maxJoystickDistance,
        y: (Math.sin(angle) * limitedDistance) / maxJoystickDistance,
      };

      // Move the joystick knob
      const knobX = Math.cos(angle) * limitedDistance;
      const knobY = Math.sin(angle) * limitedDistance;

      this.leftJoystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

      // Update player movement based on left joystick position
      if (this.player) {
        // Reset keys first
        this.player.keys.up = false;
        this.player.keys.down = false;
        this.player.keys.left = false;
        this.player.keys.right = false;

        // Set keys based on joystick position
        if (leftJoystickDelta.y < -0.3) this.player.keys.up = true;
        if (leftJoystickDelta.y > 0.3) this.player.keys.down = true;
        if (leftJoystickDelta.x < -0.3) this.player.keys.left = true;
        if (leftJoystickDelta.x > 0.3) this.player.keys.right = true;
      }
    };

    // Function to update right joystick position and player aiming
    const updateRightJoystickPosition = () => {
      const deltaX = rightCurrentPos.x - rightJoystickStartPos.x;
      const deltaY = rightCurrentPos.y - rightJoystickStartPos.y;

      // Calculate distance from center
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Only process if the distance is significant enough
      if (distance > 5) {
        // Normalize and limit the joystick movement
        const angle = Math.atan2(deltaY, deltaX);
        const limitedDistance = Math.min(distance, maxJoystickDistance);

        rightJoystickDelta = {
          x: (Math.cos(angle) * limitedDistance) / maxJoystickDistance,
          y: (Math.sin(angle) * limitedDistance) / maxJoystickDistance,
        };

        // Move the joystick knob
        const knobX = Math.cos(angle) * limitedDistance;
        const knobY = Math.sin(angle) * limitedDistance;

        this.rightJoystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

        // Only update if player exists
        if (this.player) {
          // DIRECT ROTATION CONTROL: Set the player's rotation directly based on joystick angle
          // This provides immediate and precise control over ship direction
          this.player.rotation = angle;

          // The player will now always face in the direction of the joystick

          // Enable shooting when joystick is moved beyond threshold
          if (distance > maxJoystickDistance * 0.4) {
            this.player.mouse.shooting = true;
          } else {
            this.player.mouse.shooting = false;
          }
        }
      } else {
        // When joystick is barely moved, don't change rotation but stop firing
        if (this.player) {
          this.player.mouse.shooting = false;
        }
      }
    };

    // Initialize player mouse position
    if (this.player) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      this.player.mouse.x = centerX;
      this.player.mouse.y = centerY;
    }
  }

  // Resize canvas to fill the window
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Update game scaling if window size changes
    if (this.isMobile) {
      if (window.innerWidth < 480 || window.innerHeight < 800) {
        this.gameScale = 0.7;
      } else {
        this.gameScale = 0.85;
      }

      // Update player and enemy sizes if they exist
      if (this.player) {
        this.player.gameScale = this.gameScale;
        this.player.size = 12 * this.gameScale;
        this.player.maxSpeed = 5 * this.gameScale;
      }
    }

    // Resize offscreen canvas too
    if (this.bloomCanvas) {
      this.bloomCanvas.width = this.canvas.width;
      this.bloomCanvas.height = this.canvas.height;
    }

    // Update grid if it exists
    if (this.grid) {
      this.grid.resize(this.canvas.width, this.canvas.height);
    }
  }

  // Show the start menu
  showStartMenu() {
    this.startMenu.classList.remove("hidden");
    this.gameOverScreen.classList.add("hidden");
    this.pauseMenu.classList.add("hidden");
    this.pauseButton.classList.add("hidden");
  }

  // Start a new game
  startGame() {
    console.log("Game starting...");

    this.startMenu.classList.add("hidden");
    this.gameOverScreen.classList.add("hidden");
    this.pauseMenu.classList.add("hidden");
    this.pauseButton.classList.remove("hidden");

    this.isRunning = true;
    this.isPaused = false;
    this.resetGame();
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  // Toggle pause state
  togglePause() {
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  // Pause the game
  pauseGame() {
    if (!this.isRunning || this.isPaused) return;

    this.isPaused = true;
    this.pauseMenu.classList.remove("hidden");

    // Update god mode toggle to match current state
    if (this.godModeToggle) {
      this.godModeToggle.checked = this.godModeEnabled;
    }

    // Stop the animation loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Resume the game
  resumeGame() {
    if (!this.isRunning || !this.isPaused) return;

    this.isPaused = false;
    this.pauseMenu.classList.add("hidden");

    // Restart the animation loop
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  // Quit to main menu
  quitToMenu() {
    this.isRunning = false;
    this.isPaused = false;
    this.pauseMenu.classList.add("hidden");
    this.pauseButton.classList.add("hidden");

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.showStartMenu();
  }

  // Restart the game after game over
  restartGame() {
    this.gameOverScreen.classList.add("hidden");
    this.pauseButton.classList.remove("hidden");
    this.isRunning = true;
    this.isPaused = false;
    this.resetGame();
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  // Reset game state
  resetGame() {
    // Reset god mode in UI
    this.godModeEnabled = false;
    if (this.godModeToggle) {
      this.godModeToggle.checked = false;
    }

    // Reset game objects
    this.player.reset();
    this.enemyManager.reset();
    this.particles.reset();
  }

  // Game loop using fixed time step
  gameLoop(currentTime) {
    if (!this.isRunning) return;

    // Request next frame first
    this.animationFrameId = requestAnimationFrame((time) =>
      this.gameLoop(time)
    );

    // Calculate delta time
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Skip frames if browser tab is not active
    if (deltaTime > 200) {
      return;
    }

    // Accumulate time since last update
    this.accumulator += deltaTime;

    // Update game state in fixed time steps
    while (this.accumulator >= this.frameTime) {
      this.update();
      this.accumulator -= this.frameTime;
    }

    // Mobile aim handling is now done in the right joystick controls
    // The swipe-to-aim logic is no longer needed

    // Render game state
    this.render();

    // Check for game over
    if (!this.player.alive) {
      this.gameOver();
    }

    // Update score display
    this.updateScore();
  }

  // Update game state
  update() {
    this.grid.update();
    this.player.update(this.grid);
    this.enemyManager.update();
    this.particles.update();
  }

  // Render the game
  render() {
    // Render space background first
    this.grid.render();

    // Main rendering pass to bloom canvas
    this.bloomCtx.clearRect(
      0,
      0,
      this.bloomCanvas.width,
      this.bloomCanvas.height
    );

    // Draw entities to bloom canvas
    this.bloomCtx.save();
    this.bloomCtx.globalCompositeOperation = "lighter";

    this.particles.render();
    this.enemyManager.render();
    this.player.render();

    this.bloomCtx.restore();

    // Apply bloom effect
    this.applyBloom();

    // Copy bloom canvas to main canvas
    this.ctx.globalCompositeOperation = "lighter";
    this.ctx.drawImage(this.bloomCanvas, 0, 0);
    this.ctx.globalCompositeOperation = "source-over";
  }

  // Apply bloom (glow) effect to the rendered scene
  applyBloom() {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = this.bloomCanvas.width;
    tempCanvas.height = this.bloomCanvas.height;
    const tempCtx = tempCanvas.getContext("2d");

    // Copy original content
    tempCtx.drawImage(this.bloomCanvas, 0, 0);

    // Reduce blur strength for better performance
    const optimizedBlurStrength = Math.min(this.blurStrength, 6);

    // Apply horizontal blur with fewer iterations
    this.bloomCtx.globalAlpha = 0.5;
    this.bloomCtx.globalCompositeOperation = "lighter";

    for (let i = 1; i <= optimizedBlurStrength; i += 1) {
      const weight = 1.0 - i / optimizedBlurStrength;
      this.bloomCtx.globalAlpha = 0.15 * weight;

      // Use larger offsets for fewer iterations but similar effect
      const offset = i * 2;
      this.bloomCtx.drawImage(tempCanvas, offset, 0);
      this.bloomCtx.drawImage(tempCanvas, -offset, 0);
    }

    // Apply vertical blur with fewer iterations
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(this.bloomCanvas, 0, 0);

    for (let i = 1; i <= optimizedBlurStrength; i += 1) {
      const weight = 1.0 - i / optimizedBlurStrength;
      this.bloomCtx.globalAlpha = 0.15 * weight;

      // Use larger offsets for fewer iterations but similar effect
      const offset = i * 2;
      this.bloomCtx.drawImage(tempCanvas, 0, offset);
      this.bloomCtx.drawImage(tempCanvas, 0, -offset);
    }

    // Reset alpha
    this.bloomCtx.globalAlpha = 1.0;
  }

  // Game over sequence
  gameOver() {
    this.isRunning = false;
    this.isPaused = false;

    // Hide pause button
    this.pauseButton.classList.add("hidden");
    this.pauseMenu.classList.add("hidden");

    // Update final score
    this.finalScoreDisplay.textContent = this.enemyManager.getScore();

    // Show game over screen after a short delay
    setTimeout(() => {
      this.gameOverScreen.classList.remove("hidden");
    }, 1500);
  }

  // Update score display
  updateScore() {
    // Get score and combo data
    const score = this.enemyManager.getScore();
    const comboData = this.enemyManager.getCombo();

    // Update score text
    this.scoreDisplay.textContent = score;

    // Visual effect for multiplier
    if (comboData.multiplier > 1) {
      const color =
        comboData.multiplier >= 3
          ? "#f0f"
          : comboData.multiplier >= 2
          ? "#ff0"
          : "#0ff";

      this.scoreDisplay.style.color = color;
      this.scoreDisplay.style.textShadow = `0 0 10px ${color}, 0 0 20px ${color}`;

      // Add multiplier text
      this.scoreDisplay.textContent += ` x${comboData.multiplier}`;
    } else {
      this.scoreDisplay.style.color = "#0ff";
      this.scoreDisplay.style.textShadow = "0 0 10px #0ff, 0 0 20px #0ff";
    }
  }

  // Toggle god mode
  toggleGodMode() {
    // Get state directly from checkbox
    this.godModeEnabled = this.godModeToggle.checked;

    // Apply god mode to player
    if (this.player) {
      if (this.godModeEnabled) {
        // Enable god mode
        this.player.isInvincible = true;
        this.player.godMode = true;
      } else {
        // Disable god mode
        this.player.isInvincible = false;
        this.player.godMode = false;
      }
    }
  }
}

// Initialize the game when the page loads
window.addEventListener("load", () => {
  const game = new Game();
});
