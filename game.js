class CatMeetsCatGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameRunning = false;
        this.gamePaused = false;
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.level = 1;
        this.lives = 3;
        this.lastTime = 0;
        this.animationId = null;
        
        // Timer variables
        this.gameTime = 180; // 3 minutes in seconds
        this.timeRemaining = this.gameTime;
        this.lastTimerUpdate = 0;
        
        // Game objects
        this.playerCat = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 100,
            width: 40,
            height: 50,
            speed: 5,
            velocityX: 0
        };
        
        // Input handling
        this.keys = {
            'ArrowLeft': false,
            'ArrowRight': false,
            'Space': false
        };
        
        // Game objects
        this.treats = [];
        this.otherCats = [];
        this.dogs = [];
        this.particles = [];
        this.floatingTexts = []; // For showing point amounts and damage
        this.blasts = []; // For blast graphics
        
        // Mobile controls
        this.targetX = this.canvas.width / 2; // Target position for smooth movement
        this.isMobile = this.detectMobile();
        this.touchActive = false;
        this.lastTouchTime = 0;
        
        // Game timers
        this.treatTimer = 0;
        this.catTimer = 0;
        this.dogTimer = 0;
        
        // Treat types with different points
        this.treatTypes = [
            { emoji: '🥛', color: '#FFFFFF', points: 75 },   // Milk
            { emoji: '🍕', color: '#FF6B6B', points: 50 },   // Pizza
            { emoji: '🍔', color: '#FFD700', points: 25 }    // Burger
        ];
        
        this.init();
    }
    
    init() {
        console.log('Initializing Cat Meets Cat Game...');
        this.bindEvents();
        this.updateUI();
        console.log('Game initialized successfully');
    }
    
    loadHighScore() {
        const savedHighScore = localStorage.getItem('catMeetsCatHighScore');
        return savedHighScore ? parseInt(savedHighScore) : 0;
    }
    
    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('catMeetsCatHighScore', this.highScore.toString());
            return true; // New high score achieved
        }
        return false; // No new high score
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0);
    }
    
    bindEvents() {
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        
        // Pause button
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                e.preventDefault();
                this.keys[e.code] = true;
                
                // Handle spacebar for pause
                if (e.code === 'Space' && this.gameRunning) {
                    this.togglePause();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                e.preventDefault();
                this.keys[e.code] = false;
            }
        });
        
        // Mobile touch controls - smooth movement
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touchActive = true;
            this.isMobile = true;
            this.lastTouchTime = Date.now();
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            
            // Convert touch coordinates to canvas coordinates
            const scaleX = this.canvas.width / rect.width;
            const canvasTouchX = touchX * scaleX;
            
            // Set target position for smooth movement - ensure full range
            const canvasWidth = this.canvas.width;
            const catHalfWidth = this.playerCat.width / 2;
            this.targetX = Math.max(catHalfWidth, Math.min(canvasWidth - catHalfWidth, canvasTouchX));
            

        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.gameRunning || this.gamePaused) return;
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            
            // Convert touch coordinates to canvas coordinates
            const scaleX = this.canvas.width / rect.width;
            const canvasTouchX = touchX * scaleX;
            
            // Update target position for smooth movement - ensure full range
            const canvasWidth = this.canvas.width;
            const catHalfWidth = this.playerCat.width / 2;
            this.targetX = Math.max(catHalfWidth, Math.min(canvasWidth - catHalfWidth, canvasTouchX));
            

        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchActive = false;
        });
        
        // Prevent zoom on double tap for mobile
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // Mouse controls for desktop
        let isMouseDown = false;
        let lastMouseX = 0;
        
        this.canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            const rect = this.canvas.getBoundingClientRect();
            lastMouseX = e.clientX - rect.left;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.gameRunning || this.gamePaused || !isMouseDown) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            
            // Only move if there's significant movement (drag)
            const deltaX = Math.abs(currentX - lastMouseX);
            if (deltaX > 5) { // Minimum movement threshold
                this.playerCat.x = Math.max(this.playerCat.width/2, Math.min(this.canvas.width - this.playerCat.width/2, currentX));
            }
            
            lastMouseX = currentX;
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            isMouseDown = false;
        });
    }
    
    togglePause() {
        if (!this.gameRunning) return;
        
        this.gamePaused = !this.gamePaused;
        const pauseBtn = document.getElementById('pauseBtn');
        const pauseScreen = document.getElementById('pauseScreen');
        const pointsGuide = document.getElementById('gamePointsGuide');
        
        if (this.gamePaused) {
            pauseBtn.textContent = '▶️ RESUME';
            pauseBtn.classList.add('paused');
            pauseScreen.classList.remove('hidden');
            pointsGuide.classList.remove('show');
        } else {
            pauseBtn.textContent = '⏸️ PAUSE';
            pauseBtn.classList.remove('paused');
            pauseScreen.classList.add('hidden');
            pointsGuide.classList.add('show');
        }
    }
    
    startGame() {
        console.log('Starting game...');
        this.gameRunning = true;
        this.gamePaused = false;
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.timeRemaining = this.gameTime;
        this.lastTimerUpdate = 0;
        this.treats = [];
        this.otherCats = [];
        this.dogs = [];
        this.particles = [];
        this.floatingTexts = [];
        this.blasts = [];
        this.treatTimer = 0;
        this.catTimer = 0;
        this.dogTimer = 0;
        
        // Reset pause button
        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.textContent = '⏸️ PAUSE';
        pauseBtn.classList.remove('paused');
        
        // Show game screen, hide all other screens
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('pauseScreen').classList.add('hidden');
        
        // Show points guide during gameplay
        document.getElementById('gamePointsGuide').classList.add('show');
        
        this.updateUI();
        console.log('Starting game loop...');
        
        // Render immediately
        this.render();
        
        this.gameLoop();
    }
    
    restartGame() {
        document.getElementById('gameOverScreen').classList.add('hidden');
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.timeRemaining = this.gameTime;
        this.updateUI(); // Update UI to show reset score but keep high score
        this.startGame();
    }
    
    updatePlayerCat() {
        if (this.gamePaused) return;
        
        // Handle desktop keyboard input
        this.playerCat.velocityX = 0;
        if (this.keys.ArrowLeft) this.playerCat.velocityX = -this.playerCat.speed;
        if (this.keys.ArrowRight) this.playerCat.velocityX = this.playerCat.speed;
        
        // Update position for desktop
        this.playerCat.x += this.playerCat.velocityX;
        
        // Handle mobile smooth movement
        if (this.isMobile && this.touchActive) {
            // Smooth interpolation towards target position
            const smoothingFactor = 0.25; // Increased for more responsive movement
            this.playerCat.x += (this.targetX - this.playerCat.x) * smoothingFactor;
        }
        
        // Keep cat in bounds - allow full movement across canvas
        this.playerCat.x = Math.max(this.playerCat.width/2, Math.min(this.canvas.width - this.playerCat.width/2, this.playerCat.x));
    }
    
    updateTimer(currentTime) {
        if (this.gamePaused) return;
        
        if (currentTime - this.lastTimerUpdate >= 1000) { // Update every second
            this.timeRemaining--;
            this.lastTimerUpdate = currentTime;
            this.updateUI();
            
            if (this.timeRemaining <= 0) {
                this.gameOver();
                return;
            }
        }
    }
    
    getDifficultyMultiplier() {
        const baseMultiplier = 1 + (this.level - 1) * 0.3; // 30% increase per level
        // Slightly faster on mobile to compensate for touch input lag, slower on desktop
        return this.isMobile ? baseMultiplier * 1.1 : baseMultiplier * 0.7;
    }
    
    createFloatingText(x, y, text, color, isPositive = true) {
        const floatingText = {
            x: x,
            y: y,
            text: text,
            color: color,
            life: 60, // 1 second at 60fps
            velocityY: -2,
            velocityX: (Math.random() - 0.5) * 2,
            isPositive: isPositive
        };
        this.floatingTexts.push(floatingText);
    }
    
    updateFloatingTexts() {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const text = this.floatingTexts[i];
            text.y += text.velocityY;
            text.x += text.velocityX;
            text.life--;
            
            if (text.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }
    
    drawFloatingTexts() {
        for (const text of this.floatingTexts) {
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = text.color;
            this.ctx.globalAlpha = text.life / 60;
            
            // Add shadow for better visibility
            this.ctx.shadowColor = 'black';
            this.ctx.shadowBlur = 3;
            this.ctx.fillText(text.text, text.x, text.y);
            
            // Reset shadow
            this.ctx.shadowBlur = 0;
        }
        this.ctx.globalAlpha = 1;
    }
    
    createBlast(x, y) {
        const blast = {
            x: x,
            y: y,
            radius: 30,
            maxRadius: 60,
            life: 30,
            color: '#FF4500'
        };
        this.blasts.push(blast);
    }
    
    updateBlasts() {
        for (let i = this.blasts.length - 1; i >= 0; i--) {
            const blast = this.blasts[i];
            blast.radius += 2;
            blast.life--;
            
            if (blast.life <= 0 || blast.radius >= blast.maxRadius) {
                this.blasts.splice(i, 1);
            }
        }
    }
    
    drawBlasts() {
        for (const blast of this.blasts) {
            this.ctx.globalAlpha = blast.life / 30;
            this.ctx.font = '60px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('💥', blast.x, blast.y);
        }
        this.ctx.globalAlpha = 1;
    }
    
    spawnTreats() {
        if (this.gamePaused) return;
        
        this.treatTimer++;
        const baseSpawnRate = Math.max(60, 120 - (this.level - 1) * 10); // Faster spawning with level
        const spawnRate = this.isMobile ? baseSpawnRate * 0.9 : baseSpawnRate * 1.3; // 10% faster on mobile, 30% slower on desktop
        if (this.treatTimer > spawnRate) {
            const treatType = this.treatTypes[Math.floor(Math.random() * this.treatTypes.length)];
            const treat = {
                x: Math.random() * (this.canvas.width - 20),
                y: -20,
                width: 20,
                height: 20,
                speed: (2 + (this.level - 1) * 0.5) * (this.isMobile ? 1.1 : 0.7), // 10% faster on mobile, 30% slower on desktop
                type: treatType
            };
            this.treats.push(treat);
            this.treatTimer = 0;
        }
    }
    
    updateTreats() {
        if (this.gamePaused) return;
        
        for (let i = this.treats.length - 1; i >= 0; i--) {
            const treat = this.treats[i];
            treat.y += treat.speed;
            
            // Check collision with player cat
            if (this.checkCollision(this.playerCat, treat)) {
                this.treats.splice(i, 1);
                this.score += treat.type.points;
                this.updateUI(); // Update UI immediately
                this.createParticles(treat.x + treat.width/2, treat.y + treat.height/2, treat.type.color);
                this.createFloatingText(treat.x + treat.width/2, treat.y, `+${treat.type.points}`, '#00FF00', true);
                continue;
            }
            
            // Remove treats that go off screen
            if (treat.y > this.canvas.height) {
                this.treats.splice(i, 1);
            }
        }
    }
    
    spawnOtherCats() {
        if (this.gamePaused) return;
        
        this.catTimer++;
        const baseSpawnRate = Math.max(120, 180 - (this.level - 1) * 15); // Faster spawning with level
        const spawnRate = this.isMobile ? baseSpawnRate * 0.9 : baseSpawnRate * 1.3; // 10% faster on mobile, 30% slower on desktop
        if (this.catTimer > spawnRate) {
            const otherCat = {
                x: Math.random() * (this.canvas.width - 30),
                y: -30,
                width: 30,
                height: 40,
                speed: (3 + (this.level - 1) * 0.3) * (this.isMobile ? 1.1 : 0.7) // 10% faster on mobile, 30% slower on desktop
            };
            this.otherCats.push(otherCat);
            this.catTimer = 0;
        }
    }
    
    updateOtherCats() {
        if (this.gamePaused) return;
        
        for (let i = this.otherCats.length - 1; i >= 0; i--) {
            const otherCat = this.otherCats[i];
            otherCat.y += otherCat.speed;
            
            // Check collision with player cat
            if (this.checkCollision(this.playerCat, otherCat)) {
                this.otherCats.splice(i, 1);
                this.score += 100; // Direct cat friendship!
                this.updateUI(); // Update UI immediately
                this.createParticles(otherCat.x + otherCat.width/2, otherCat.y + otherCat.height/2, '#FFB6C1');
                this.createFloatingText(otherCat.x + otherCat.width/2, otherCat.y, '+100', '#FF69B4', true);
                continue;
            }
            
            // Remove other cats that go off screen
            if (otherCat.y > this.canvas.height) {
                this.otherCats.splice(i, 1);
            }
        }
    }
    
    spawnDogs() {
        if (this.gamePaused) return;
        
        this.dogTimer++;
        // Increase dog spawn rate significantly with level
        const baseSpawnRate = 240; // 4 seconds base
        const levelReduction = (this.level - 1) * 30; // 30 frames faster per level
        const baseSpawnRateAdjusted = Math.max(60, baseSpawnRate - levelReduction); // Minimum 1 second
        const spawnRate = this.isMobile ? baseSpawnRateAdjusted * 0.9 : baseSpawnRateAdjusted * 1.3; // 10% faster on mobile, 30% slower on desktop
        
        if (this.dogTimer > spawnRate) {
            // Spawn multiple dogs at higher levels
            const dogCount = Math.min(3, Math.floor(this.level / 3) + 1); // 1 dog at level 1, 2 at level 3, 3 at level 6+
            
            for (let j = 0; j < dogCount; j++) {
                const dog = {
                    x: Math.random() * (this.canvas.width - 25),
                    y: -25 - (j * 20), // Stagger the dogs vertically
                    width: 25,
                    height: 35,
                    speed: (4 + (this.level - 1) * 0.4) * (this.isMobile ? 1.1 : 0.7) // 10% faster on mobile, 30% slower on desktop
                };
                this.dogs.push(dog);
            }
            this.dogTimer = 0;
        }
    }
    
    updateDogs() {
        if (this.gamePaused) return;
        
        for (let i = this.dogs.length - 1; i >= 0; i--) {
            const dog = this.dogs[i];
            dog.y += dog.speed;
            
            // Check collision with player cat
            if (this.checkCollision(this.playerCat, dog)) {
                this.dogs.splice(i, 1);
                this.lives--;
                this.updateUI(); // Update UI immediately
                this.createParticles(dog.x + dog.width/2, dog.y + dog.height/2, '#8B4513');
                this.createFloatingText(dog.x + dog.width/2, dog.y, '-1 LIFE', '#FF0000', false);
                this.createBlast(dog.x + dog.width/2, dog.y + dog.height/2);
                
                if (this.lives <= 0) {
                    this.gameOver();
                    return;
                }
                continue;
            }
            
            // Remove dogs that go off screen
            if (dog.y > this.canvas.height) {
                this.dogs.splice(i, 1);
            }
        }
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x - rect1.width/2 < rect2.x + rect2.width &&
               rect1.x + rect1.width/2 > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const particle = {
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 30,
                color: color
            };
            this.particles.push(particle);
        }
    }
    
    updateParticles() {
        if (this.gamePaused) return;
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    checkLevelUp() {
        const newLevel = Math.floor(this.score / 1000) + 1;
        if (newLevel > this.level && newLevel <= 10) {
            this.level = newLevel;
            this.updateUI();
            this.showLevelUpMessage();
        }
    }
    
    showLevelUpMessage() {
        const levelUpDiv = document.createElement('div');
        levelUpDiv.style.position = 'absolute';
        levelUpDiv.style.top = '50%';
        levelUpDiv.style.left = '50%';
        levelUpDiv.style.transform = 'translate(-50%, -50%)';
        levelUpDiv.style.background = 'rgba(255, 215, 0, 0.2)';
        levelUpDiv.style.color = 'white';
        levelUpDiv.style.padding = this.isMobile ? '10px 20px' : '15px 30px';
        levelUpDiv.style.borderRadius = '15px';
        levelUpDiv.style.fontSize = this.isMobile ? '1.2em' : '1.5em';
        levelUpDiv.style.fontWeight = 'bold';
        levelUpDiv.style.zIndex = '1000';
        levelUpDiv.style.border = '1px solid rgba(255, 255, 255, 0.4)';
        levelUpDiv.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.8)';
        levelUpDiv.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
        levelUpDiv.textContent = `🎉 LEVEL ${this.level} 🎉`;
        
        document.body.appendChild(levelUpDiv);
        
        setTimeout(() => {
            document.body.removeChild(levelUpDiv);
        }, 1200);
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    drawPlayerCat() {
        // Draw cute cat using emoji - larger size
        this.ctx.font = '60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🐱', this.playerCat.x, this.playerCat.y + this.playerCat.height/2);
        
        // Draw direction line for mobile
        if (this.isMobile && this.touchActive) {
            this.drawDirectionLine();
        }
    }
    
    drawDirectionLine() {
        // Draw a horizontal line below the cat for mobile guidance
        const lineY = this.playerCat.y + this.playerCat.height + 10;
        const lineWidth = 300; // Wider line to show full movement range
        const lineX = this.playerCat.x - lineWidth / 2;
        
        // Ensure line doesn't go outside canvas bounds
        const adjustedLineX = Math.max(0, Math.min(this.canvas.width - lineWidth, lineX));
        
        // Draw line background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(adjustedLineX, lineY, lineWidth, 4);
        
        // Draw line border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(adjustedLineX, lineY, lineWidth, 4);
        
        // Draw arrow indicators
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('←', adjustedLineX + 20, lineY + 15);
        this.ctx.fillText('→', adjustedLineX + lineWidth - 20, lineY + 15);
        
        // Draw center indicator
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillText('•', this.playerCat.x, lineY + 15);
    }
    

    
    drawTreats() {
        for (const treat of this.treats) {
            // Draw treat emoji - larger size to match cats and dogs
            this.ctx.font = '50px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(treat.type.emoji, treat.x + treat.width/2, treat.y + treat.height/2);
        }
    }
    
    drawOtherCats() {
        for (const otherCat of this.otherCats) {
            // Draw cute friend cats using same emoji as player cat but larger
            this.ctx.font = '60px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🐱', otherCat.x + otherCat.width/2, otherCat.y + otherCat.height/2);
        }
    }
    
    drawDogs() {
        for (const dog of this.dogs) {
            // Draw brown dog face emoji - larger and clearer
            this.ctx.font = '60px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🐶', dog.x + dog.width/2, dog.y + dog.height/2);
        }
    }
    
    drawParticles() {
        for (const particle of this.particles) {
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.life / 30;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawBackground() {
        // Draw house background
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw some windows
        this.ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 3; i++) {
            const x = (i * 200) + 100;
            this.ctx.fillRect(x, 50, 60, 80);
        }
        
        // Draw some furniture - evenly spaced platforms
        this.ctx.fillStyle = '#8B4513';
        const platformWidth = 100;
        const platformHeight = 40;
        const totalPlatforms = 6;
        const spacing = (this.canvas.width - (totalPlatforms * platformWidth)) / (totalPlatforms + 1);
        
        for (let i = 0; i < totalPlatforms; i++) {
            const x = spacing + (i * (platformWidth + spacing));
            this.ctx.fillRect(x, this.canvas.height - platformHeight, platformWidth, platformHeight);
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.drawBackground();
        
        // Draw game objects
        this.drawTreats();
        this.drawOtherCats();
        this.drawDogs();
        this.drawParticles();
        this.drawFloatingTexts();
        this.drawBlasts();
        this.drawPlayerCat();
        
        // Draw credit
        this.drawCredit();
    }
    
    drawCredit() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('By Samaira Jain', this.canvas.width / 2, this.canvas.height - 10);
    }
    
    update() {
        this.updatePlayerCat();
        this.spawnTreats();
        this.updateTreats();
        this.spawnOtherCats();
        this.updateOtherCats();
        this.spawnDogs();
        this.updateDogs();
        this.updateParticles();
        this.updateFloatingTexts();
        this.updateBlasts();
        this.checkLevelUp();
    }
    
    gameLoop(currentTime = 0) {
        if (!this.gameRunning) return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.updateTimer(currentTime);
        this.update();
        this.render();
        
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    gameOver() {
        this.gameRunning = false;
        this.gamePaused = false;
        
        // Hide points guide
        document.getElementById('gamePointsGuide').classList.remove('show');
        
        // Check for new high score
        const isNewHighScore = this.saveHighScore();
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.level;
        document.getElementById('finalTime').textContent = this.formatTime(this.timeRemaining);
        
        // Show/hide high score message
        const highScoreMessage = document.getElementById('highScoreMessage');
        if (isNewHighScore) {
            highScoreMessage.classList.remove('hidden');
        } else {
            highScoreMessage.classList.add('hidden');
        }
        
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('highScore').textContent = this.highScore;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('timer').textContent = this.formatTime(this.timeRemaining);
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CatMeetsCatGame();
}); 