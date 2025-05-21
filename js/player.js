// Player class with movement, shooting and collision

class Player {
  constructor(canvas, ctx, particles, gameScale = 1) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.particles = particles;
    this.gameScale = gameScale; // Scale factor for game elements

    // Player properties
    this.position = new Vector(canvas.width / 2, canvas.height / 2);
    this.velocity = new Vector(0, 0);
    this.acceleration = new Vector(0, 0);
    this.rotation = 0;
    this.size = 12 * this.gameScale;
    this.color = "#0ff";
    this.maxSpeed = 5 * this.gameScale;
    this.friction = 0.92;
    this.alive = true;
    this.invulnerable = false;
    this.invulnerableTimer = 0;
    this.blinkTimer = 0;
    this.visible = true;

    // God mode properties
    this.godMode = false;
    this.isInvincible = false;
    this.shieldRadius = this.size * 2.5; // Reduced shield size
    this.shieldOpacity = 0.25; // Shield opacity

    // Shooting properties
    this.shootCooldown = 0;
    this.shootDelay = 8; // Frames between shots
    this.projectiles = [];
    this.shootSound = null;

    // Input tracking
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
    };

    this.mouse = {
      x: 0,
      y: 0,
      shooting: false,
    };

    // Mobile-specific properties
    this.isMobile = this.detectMobile();
    this.hasGyroscope = false;
    this.gyroEnabled = false;
    this.gyroOrientation = {
      alpha: 0,
      beta: 0,
      gamma: 0,
    };
    this.lastGyroUpdateTime = 0;
    this.gyroUpdateInterval = 16; // ms (60fps)

    // Setup event listeners
    this.setupInput();

    // If on mobile, try to set up gyroscope for aiming
    if (this.isMobile) {
      this.tryEnableGyro();
    }
  }

  // Detect mobile devices
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  // Try to enable gyroscope if available on the device
  tryEnableGyro() {
    if (window.DeviceOrientationEvent) {
      // Check if permission is needed (iOS 13+)
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        // For iOS 13+ devices, we need to request permission
        // Don't request immediately - do it only on first touch
        // This defers it until after user interaction
        this.gyroEnabled = false; // Initially disabled
        console.log("Gyro requires permission, will request on first touch");
      } else {
        // For other devices that support gyroscope
        this.setupGyroscope();
      }
    }
  }

  // Set up gyroscope event listeners
  setupGyroscope() {
    window.addEventListener("deviceorientation", (event) => {
      const now = performance.now();

      // Throttle updates to avoid performance issues
      if (now - this.lastGyroUpdateTime < this.gyroUpdateInterval) {
        return;
      }

      this.lastGyroUpdateTime = now;
      this.hasGyroscope = true;
      this.gyroEnabled = true;

      // Store orientation data
      this.gyroOrientation.alpha = event.alpha || 0; // Z-axis (compass direction)
      this.gyroOrientation.beta = event.beta || 0; // X-axis (-180 to 180) front-back tilt
      this.gyroOrientation.gamma = event.gamma || 0; // Y-axis (-90 to 90) left-right tilt

      // Update aiming based on device orientation
      this.updateGyroAim();
    });
  }

  // Update aim direction based on gyroscope data
  updateGyroAim() {
    if (!this.gyroEnabled || !this.hasGyroscope) return;

    // Use gamma (left/right tilt) and beta (front/back tilt) to calculate aim direction
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Map gyro data to screen coordinates
    // gamma ranges from -90 to 90, beta from -180 to 180
    const sensitivity = 10;
    const aimX = centerX + this.gyroOrientation.gamma * sensitivity;
    const aimY = centerY + (this.gyroOrientation.beta - 45) * sensitivity;

    // Update mouse position for aiming
    this.mouse.x = Math.max(0, Math.min(this.canvas.width, aimX));
    this.mouse.y = Math.max(0, Math.min(this.canvas.height, aimY));
  }

  // Set up event listeners for keyboard and mouse
  setupInput() {
    // Keyboard events
    window.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          this.keys.up = true;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          this.keys.down = true;
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          this.keys.left = true;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          this.keys.right = true;
          break;
      }
    });

    window.addEventListener("keyup", (e) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          this.keys.up = false;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          this.keys.down = false;
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          this.keys.left = false;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          this.keys.right = false;
          break;
      }
    });

    // Mouse events
    window.addEventListener("mousemove", (e) => {
      // Get mouse position relative to canvas
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        // Left mouse button
        this.mouse.shooting = true;
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        // Left mouse button
        this.mouse.shooting = false;
      }
    });

    // Touch events for mobile - only handle touch events on canvas
    this.canvas.addEventListener("touchstart", (e) => {
      // Check if touch is on UI elements - don't prevent default in that case
      const target = e.target;
      if (target === this.canvas) {
        e.preventDefault();
        this.mouse.shooting = true;

        if (e.touches.length > 0) {
          const rect = this.canvas.getBoundingClientRect();
          this.mouse.x = e.touches[0].clientX - rect.left;
          this.mouse.y = e.touches[0].clientY - rect.top;
        }
      }
    });

    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();

      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.touches[0].clientX - rect.left;
        this.mouse.y = e.touches[0].clientY - rect.top;
      }
    });

    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.mouse.shooting = false;
    });
  }

  // Update player state
  update(grid) {
    if (!this.alive) return;

    // Movement control with keys
    this.acceleration.x = 0;
    this.acceleration.y = 0;

    // Calculate acceleration based on keys
    if (this.keys.up) this.acceleration.y -= 0.5;
    if (this.keys.down) this.acceleration.y += 0.5;
    if (this.keys.left) this.acceleration.x -= 0.5;
    if (this.keys.right) this.acceleration.x += 0.5;

    // Apply acceleration
    this.velocity.add(this.acceleration);

    // Apply friction
    this.velocity.multiply(this.friction);

    // Limit speed
    this.velocity.limit(this.maxSpeed);

    // Update position
    this.position.add(this.velocity);

    // Screen wrapping
    this.wrapScreen();

    // Update gyro aiming if on mobile with gyroscope
    if (this.isMobile && this.gyroEnabled) {
      this.updateGyroAim();
    }

    // Note: We don't update rotation based on mouse position anymore
    // as the game.js right joystick control directly sets the rotation
    // This allows for direct control of ship rotation with the right joystick

    // Shooting
    if (this.mouse.shooting && this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = this.shootDelay;
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.position.add(projectile.velocity);

      // Add trail particles
      if (Math.random() < 0.3) {
        this.particles.addTrail(
          projectile.position.x,
          projectile.position.y,
          projectile.color,
          1
        );
      }

      // Remove if off screen
      if (
        projectile.position.x < -20 ||
        projectile.position.x > this.canvas.width + 20 ||
        projectile.position.y < -20 ||
        projectile.position.y > this.canvas.height + 20
      ) {
        this.projectiles.splice(i, 1);
      }
    }

    // Add trail particles behind player if moving
    if (this.velocity.getMagnitude() > 0.2) {
      if (Math.random() < 0.3) {
        const speed = this.velocity.getMagnitude();
        const offset = new Vector()
          .copy(this.velocity)
          .normalize()
          .multiply(-this.size / 2);

        this.particles.addTrail(
          this.position.x + offset.x,
          this.position.y + offset.y,
          this.color,
          2 + speed / 2
        );

        // Grid distortion removed to prevent background movement
      }
    }

    // Handle invulnerability timer
    if (this.invulnerable) {
      this.invulnerableTimer--;

      if (this.invulnerableTimer <= 0) {
        this.invulnerable = false;
      }

      // Blinking effect
      this.blinkTimer++;
      if (this.blinkTimer >= 5) {
        this.visible = !this.visible;
        this.blinkTimer = 0;
      }
    } else {
      this.visible = true;
    }
  }

  // Render the player and projectiles
  render() {
    // Only render if alive and visible (for blinking)
    if (!this.alive || !this.visible) return;

    // Render shield if in god mode
    if (this.godMode) {
      this.ctx.save();
      this.ctx.globalAlpha = this.shieldOpacity;

      // Shield gradient
      const shieldGradient = this.ctx.createRadialGradient(
        this.position.x,
        this.position.y,
        0,
        this.position.x,
        this.position.y,
        this.shieldRadius
      );
      shieldGradient.addColorStop(0, "rgba(255, 215, 0, 0)");
      shieldGradient.addColorStop(0.7, "rgba(255, 215, 0, 0.3)");
      shieldGradient.addColorStop(1, "rgba(255, 215, 0, 0.6)");

      // Draw shield circle
      this.ctx.fillStyle = shieldGradient;
      this.ctx.beginPath();
      this.ctx.arc(
        this.position.x,
        this.position.y,
        this.shieldRadius,
        0,
        Math.PI * 2
      );
      this.ctx.fill();

      // Shield border
      this.ctx.globalAlpha = 0.8;
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = "#ffd700";
      this.ctx.stroke();

      this.ctx.restore();
    }

    // Render projectiles
    this.projectiles.forEach((projectile) => {
      this.ctx.save();
      this.ctx.translate(projectile.position.x, projectile.position.y);

      // Draw glow
      const glow = createGlow(
        this.ctx,
        0,
        0,
        projectile.size * 1.5,
        projectile.color,
        1
      );

      this.ctx.beginPath();
      this.ctx.fillStyle = glow || projectile.color;
      this.ctx.arc(0, 0, projectile.size, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    });

    // Render player
    this.ctx.save();
    this.ctx.translate(this.position.x, this.position.y);
    this.ctx.rotate(this.rotation);

    // Remove the god mode transparency effect
    // Draw X-Wing fighter shape
    const s = this.size;

    // Main fuselage/body
    this.ctx.fillStyle = "#eaeaea";
    this.ctx.beginPath();
    this.ctx.moveTo(s * 2, 0); // Nose
    this.ctx.lineTo(s * 0.8, s * 0.5); // Right side
    this.ctx.lineTo(-s * 0.8, s * 0.5); // Back right
    this.ctx.lineTo(-s * 1.2, 0); // Back center
    this.ctx.lineTo(-s * 0.8, -s * 0.5); // Back left
    this.ctx.lineTo(s * 0.8, -s * 0.5); // Left side
    this.ctx.closePath();
    this.ctx.fill();

    // Cockpit
    this.ctx.fillStyle = "#6ac5fe";
    this.ctx.beginPath();
    this.ctx.ellipse(s * 0.5, 0, s * 0.6, s * 0.25, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Engine glow
    this.ctx.fillStyle = "#ff6a00";
    this.ctx.beginPath();
    this.ctx.arc(-s * 1, 0, s * 0.2, 0, Math.PI * 2);
    this.ctx.fill();

    // Red details
    this.ctx.fillStyle = "#ff3333";
    this.ctx.fillRect(s * 0.8, -s * 0.5, s * 0.4, s);

    // Wings
    const wingLength = s * 2;
    const wingWidth = s * 0.25;

    // Wing color
    this.ctx.fillStyle = "#ccc";

    // Top-right wing
    this.ctx.beginPath();
    this.ctx.moveTo(s * 0.3, -s * 0.25); // Wing base
    this.ctx.lineTo(s * 0.8, -wingLength); // Wing tip
    this.ctx.lineTo(s * 0.3, -wingLength); // Back of wing
    this.ctx.lineTo(0, -s * 0.25); // Connection to body
    this.ctx.closePath();
    this.ctx.fill();

    // Top-left wing
    this.ctx.beginPath();
    this.ctx.moveTo(-s * 0.3, -s * 0.25);
    this.ctx.lineTo(-s * 0.8, -wingLength);
    this.ctx.lineTo(-s * 0.3, -wingLength);
    this.ctx.lineTo(0, -s * 0.25);
    this.ctx.closePath();
    this.ctx.fill();

    // Bottom-right wing
    this.ctx.beginPath();
    this.ctx.moveTo(s * 0.3, s * 0.25);
    this.ctx.lineTo(s * 0.8, wingLength);
    this.ctx.lineTo(s * 0.3, wingLength);
    this.ctx.lineTo(0, s * 0.25);
    this.ctx.closePath();
    this.ctx.fill();

    // Bottom-left wing
    this.ctx.beginPath();
    this.ctx.moveTo(-s * 0.3, s * 0.25);
    this.ctx.lineTo(-s * 0.8, wingLength);
    this.ctx.lineTo(-s * 0.3, wingLength);
    this.ctx.lineTo(0, s * 0.25);
    this.ctx.closePath();
    this.ctx.fill();

    // Wing lasers
    this.ctx.fillStyle = "#333";
    // Top-right laser
    this.ctx.fillRect(s * 0.7, -wingLength, s * 0.2, s * 0.5);
    // Top-left laser
    this.ctx.fillRect(-s * 0.9, -wingLength, s * 0.2, s * 0.5);
    // Bottom-right laser
    this.ctx.fillRect(s * 0.7, wingLength - s * 0.5, s * 0.2, s * 0.5);
    // Bottom-left laser
    this.ctx.fillRect(-s * 0.9, wingLength - s * 0.5, s * 0.2, s * 0.5);

    // Laser tips
    this.ctx.fillStyle = "#f00";
    this.ctx.fillRect(s * 0.7, -wingLength - s * 0.15, s * 0.2, s * 0.15);
    this.ctx.fillRect(-s * 0.9, -wingLength - s * 0.15, s * 0.2, s * 0.15);
    this.ctx.fillRect(s * 0.7, wingLength, s * 0.2, s * 0.15);
    this.ctx.fillRect(-s * 0.9, wingLength, s * 0.2, s * 0.15);

    // Glow effect
    this.ctx.globalAlpha = 0.3;
    this.ctx.shadowColor = this.color;
    this.ctx.shadowBlur = 20;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, s * 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  // Shoot a projectile
  shoot() {
    const speed = 12 * this.gameScale;
    const direction = this.rotation;

    const projectile = {
      position: new Vector(this.position.x, this.position.y),
      velocity: new Vector(
        Math.cos(direction) * speed,
        Math.sin(direction) * speed
      ),
      size: 3 * this.gameScale,
      color: this.color,
    };

    this.projectiles.push(projectile);

    // Add small recoil effect
    this.velocity.add(
      new Vector(
        Math.cos(direction + Math.PI) * 0.2,
        Math.sin(direction + Math.PI) * 0.2
      )
    );

    // Play shoot sound if available
    if (this.shootSound) {
      this.shootSound.currentTime = 0;
      this.shootSound.play().catch((e) => {
        // Ignore autoplay errors
      });
    }
  }

  // Handle wrapping around screen edges
  wrapScreen() {
    if (this.position.x < -this.size) {
      this.position.x = this.canvas.width + this.size;
    } else if (this.position.x > this.canvas.width + this.size) {
      this.position.x = -this.size;
    }

    if (this.position.y < -this.size) {
      this.position.y = this.canvas.height + this.size;
    } else if (this.position.y > this.canvas.height + this.size) {
      this.position.y = -this.size;
    }
  }

  // Check collision with an enemy
  checkCollision(enemy) {
    // Skip collision check if in god mode
    if (this.isInvincible || this.godMode) return false;

    if (!this.alive || this.invulnerable) return false;

    const collided = circleCollision(
      this.position.x,
      this.position.y,
      this.size - 4, // slightly smaller hitbox than visual size
      enemy.position.x,
      enemy.position.y,
      enemy.size
    );

    return collided;
  }

  // Check if any projectile hits an enemy
  checkProjectileCollision(enemy) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      const hit = circleCollision(
        projectile.position.x,
        projectile.position.y,
        projectile.size,
        enemy.position.x,
        enemy.position.y,
        enemy.size
      );

      if (hit) {
        this.projectiles.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  // Handle player death
  die(grid) {
    // Skip death if in god mode
    if (this.isInvincible || this.godMode) return;

    this.alive = false;

    // Create massive explosion effect like in the reference image
    this.particles.createMassiveExplosion(this.position.x, this.position.y);

    // Create additional debris
    this.particles.createDebris(
      this.position.x,
      this.position.y,
      30, // More debris
      this.color,
      8 // Faster debris
    );

    // Camera shake effect
    if (grid.addCameraShake) {
      grid.addCameraShake(15, 0.8); // Duration, intensity
    }
  }

  // Reset player for a new game
  reset() {
    this.position = new Vector(this.canvas.width / 2, this.canvas.height / 2);
    this.velocity = new Vector(0, 0);
    this.acceleration = new Vector(0, 0);
    this.alive = true;
    this.projectiles = [];
    this.invulnerable = true;
    this.invulnerableTimer = 120; // 2 seconds at 60fps

    // Reset god mode - this allows the game to toggle it back on if needed
    this.godMode = false;
    this.isInvincible = false;
    this.shieldRadius = this.size * 2.5; // Reset shield size
  }
}
