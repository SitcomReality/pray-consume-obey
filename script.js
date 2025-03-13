import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Game state
const gameState = {
  isPlaying: false,
  balloonsPopped: 0,
  meanCommentsMade: 0,
  detectionLevel: 0,
  playerPosition: new THREE.Vector3(0, 1.6, 0),
  targetedBalloon: null,
  balloons: [],
  partyKids: [],
  happiness: 100,
  maxHappiness: 200,
  happinessRecharging: true,
  happinessRechargeTimer: 0,
  isJetpackActive: false,
  projectiles: [],
  isPaused: false,
  meanComments: [
    "You weren't invited because you're always mean!",
    "This is why nobody likes playing with you!",
    "Maybe if you were nicer, you'd have friends too!",
    "You always ruin everyone's fun!",
    "No cake for bullies!",
    "Stop being such a party pooper!",
    "Why can't you just be happy for others?"
  ]
};

// Sound effects
const sounds = {
  ambience: new Howl({
    src: ['data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gQ29ueWFjIFNvdW5kYmFua////0A='],
    volume: 0.3,
    loop: true
  }),
  balloonFloat: new Howl({
    src: ['data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gQ29ueWFjIFNvdW5kYmFua////0A='],
    volume: 0.2,
    loop: true
  }),
  pinShot: new Howl({
    src: ['data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gQ29ueWFjIFNvdW5kYmFua////0A='],
    volume: 0.5
  }),
  balloonPop: new Howl({
    src: ['data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gQ29ueWFjIFNvdW5kYmFua////0A='],
    volume: 0.7
  }),
  jetpack: new Howl({
    src: ['data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gQ29ueWFjIFNvdW5kYmFua////0A='],
    volume: 0.4,
    loop: true
  }),
  detected: new Howl({
    src: ['data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gQ29ueWFjIFNvdW5kYmFua////0A='],
    volume: 0.5
  })
};

// DOM elements
const elements = {
  menu: document.getElementById('menu'),
  gameCanvas: document.getElementById('game-canvas'),
  startButton: document.getElementById('start-game'),
  shopButton: document.getElementById('shop-button'),
  aboutButton: document.getElementById('about-button'),
  shopModal: document.getElementById('shop-modal'),
  closeShop: document.getElementById('close-shop'),
  aboutModal: document.getElementById('about-modal'),
  closeAbout: document.getElementById('close-about'),
  balloonsPopped: document.getElementById('drones-hacked'),
  meanCommentsMade: document.getElementById('scriptures-count'),
  detectionFill: document.getElementById('detection-fill'),
  happinessFill: document.getElementById('faith-fill'),
  targetIndicator: document.getElementById('target-indicator'),
  hackSuccess: document.getElementById('hack-success'),
  gameOver: document.getElementById('game-over'),
  gameOverTitle: document.getElementById('game-over-title'),
  gameOverMessage: document.getElementById('game-over-message'),
  finalBalloons: document.getElementById('final-drones'),
  finalComments: document.getElementById('final-scriptures'),
  restartButton: document.getElementById('restart-game')
};

// THREE.js setup
let scene, camera, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, jetpackActive = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
let clock = new THREE.Clock();
let gravity = 0.08;
let crosshair;

function initThree() {
  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x88ccff, 0.01);
  
  // Camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.copy(gameState.playerPosition);
  
  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: elements.gameCanvas, antialias: true });
  renderer.setSize(elements.gameCanvas.clientWidth, elements.gameCanvas.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // Controls
  controls = new PointerLockControls(camera, document.body);
  
  // Lighting
  const ambientLight = new THREE.AmbientLight(0x88ccff, 2);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 10, 0);
  scene.add(directionalLight);
  
  // Add colored point lights for fun effect
  addPointLight(0xff6b6b, 0, 5, -10, 8);
  addPointLight(0x4ecdc4, 10, 3, 0, 5);
  addPointLight(0xffbe0b, -10, 4, 5, 6);
  
  // Floor - playground ground
  const floorGeometry = new THREE.PlaneGeometry(100, 100, 10, 10);
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x88cc66,
    wireframe: false,
    metalness: 0.1,
    roughness: 0.8
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  
  // Playground tiles pattern
  const gridHelper = new THREE.GridHelper(100, 20, 0xffffff, 0x88cc66);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);
  
  // Create the playground environment
  createEnvironment();
  
  // Create balloons
  createBalloons(15);
  
  // Create party kids
  createPartyKids(5);
  
  // Handle resize
  window.addEventListener('resize', () => {
    camera.aspect = elements.gameCanvas.clientWidth / elements.gameCanvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(elements.gameCanvas.clientWidth, elements.gameCanvas.clientHeight);
  });
  
  // Set up controls
  setupControls();
  
  // Add crosshair
  createCrosshair();
}

function addPointLight(color, x, y, z, intensity = 1, distance = 15) {
  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(x, y, z);
  scene.add(light);
  return light;
}

function createEnvironment() {
  // Central playground structure
  const playgroundGeometry = new THREE.BoxGeometry(20, 10, 20);
  const playgroundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x4ecdc4,
    metalness: 0.1,
    roughness: 0.7
  });
  const playground = new THREE.Mesh(playgroundGeometry, playgroundMaterial);
  playground.position.set(0, 5, -20);
  scene.add(playground);
  
  // Slide
  const slideGeometry = new THREE.BoxGeometry(5, 2, 15);
  const slideMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff6b6b,
    metalness: 0.2,
    roughness: 0.5
  });
  
  const slide = new THREE.Mesh(slideGeometry, slideMaterial);
  slide.position.set(10, 1, -20);
  slide.rotation.z = -Math.PI / 8;
  scene.add(slide);
  
  // Balloons banner
  const bannerGeometry = new THREE.BoxGeometry(30, 3, 1);
  const bannerMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffbe0b,
    metalness: 0.2,
    roughness: 0.6
  });
  
  const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
  banner.position.set(0, 12, -30);
  scene.add(banner);
  
  // Add some party decorations
  for (let i = -20; i <= 20; i += 10) {
    if (i === 0) continue; // Skip center
    
    const decorGeometry = new THREE.SphereGeometry(2, 16, 16);
    const decorMaterial = new THREE.MeshStandardMaterial({ 
      color: i % 20 === 0 ? 0xff6b6b : 0xffbe0b,
      metalness: 0.2,
      roughness: 0.6
    });
    
    const decor = new THREE.Mesh(decorGeometry, decorMaterial);
    decor.position.set(i, 5, -15);
    scene.add(decor);
  }
  
  // Add swings
  for (let x = -25; x <= 25; x += 50) {
    const swingPostGeometry = new THREE.CylinderGeometry(0.5, 0.5, 8, 8);
    const swingPostMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8855ff,
      metalness: 0.2,
      roughness: 0.7
    });
    
    const swingPost1 = new THREE.Mesh(swingPostGeometry, swingPostMaterial);
    swingPost1.position.set(x - 3, 4, 15);
    scene.add(swingPost1);
    
    const swingPost2 = new THREE.Mesh(swingPostGeometry, swingPostMaterial);
    swingPost2.position.set(x + 3, 4, 15);
    scene.add(swingPost2);
    
    const swingBarGeometry = new THREE.CylinderGeometry(0.3, 0.3, 7, 8);
    swingBarGeometry.rotateX(Math.PI / 2);
    const swingBar = new THREE.Mesh(swingBarGeometry, swingPostMaterial);
    swingBar.position.set(x, 8, 15);
    scene.add(swingBar);
  }
  
  // Tables with cake and presents
  const tableGeometry = new THREE.CylinderGeometry(3, 3, 1, 8);
  const tableMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.6
  });
  
  const table = new THREE.Mesh(tableGeometry, tableMaterial);
  table.position.set(-15, 0.5, 20);
  scene.add(table);
  
  // Cake
  const cakeBaseGeometry = new THREE.CylinderGeometry(2, 2, 1, 16);
  const cakeBaseMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffbe0b,
    metalness: 0.2,
    roughness: 0.6
  });
  
  const cakeBase = new THREE.Mesh(cakeBaseGeometry, cakeBaseMaterial);
  cakeBase.position.set(-15, 1.5, 20);
  scene.add(cakeBase);
  
  const cakeTopGeometry = new THREE.CylinderGeometry(1.5, 1.5, 1, 16);
  const cakeTopMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff6b6b,
    metalness: 0.2,
    roughness: 0.6
  });
  
  const cakeTop = new THREE.Mesh(cakeTopGeometry, cakeTopMaterial);
  cakeTop.position.set(-15, 2.5, 20);
  scene.add(cakeTop);
}

function createBalloons(count) {
  for (let i = 0; i < count; i++) {
    // Balloon body
    const bodyGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    
    // Bright colorful balloons
    const balloonColors = [0xff6b6b, 0x4ecdc4, 0xffbe0b, 0x8855ff, 0xff8e71];
    const balloonColor = balloonColors[Math.floor(Math.random() * balloonColors.length)];
    
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: balloonColor,
      metalness: 0.1,
      roughness: 0.2,
      emissive: balloonColor,
      emissiveIntensity: 0.2
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Balloon knot
    const knotGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const knotMaterial = new THREE.MeshStandardMaterial({ 
      color: balloonColor,
      metalness: 0.2,
      roughness: 0.8
    });
    
    const knot = new THREE.Mesh(knotGeometry, knotMaterial);
    knot.position.y = -0.8;
    
    // String
    const stringGeometry = new THREE.CylinderGeometry(0.02, 0.02, 2, 3);
    const stringMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.6
    });
    
    const string = new THREE.Mesh(stringGeometry, stringMaterial);
    string.position.y = -1.8;
    
    // Balloon group
    const balloon = new THREE.Group();
    balloon.add(body, knot, string);
    
    // Random position
    const x = Math.random() * 80 - 40;
    const z = Math.random() * 80 - 40;
    balloon.position.set(x, 3 + Math.random() * 5, z);
    
    // Add balloon data
    balloon.userData = {
      id: i,
      isPopped: false,
      originalColor: balloonColor,
      speed: 0.02 + Math.random() * 0.03,
      rotationSpeed: 0.01 + Math.random() * 0.02,
      hoverAmplitude: 0.1 + Math.random() * 0.1,
      hoverFrequency: 0.5 + Math.random() * 1,
      targetPosition: new THREE.Vector3(
        Math.random() * 80 - 40,
        3 + Math.random() * 5,
        Math.random() * 80 - 40
      ),
      timeSinceTargetChange: 0
    };
    
    scene.add(balloon);
    gameState.balloons.push(balloon);
  }
}

function createPartyKids(count) {
  for (let i = 0; i < count; i++) {
    // Kid body
    const bodyGeometry = new THREE.CylinderGeometry(0.6, 0.4, 2, 8);
    const kidColors = [0xff8e71, 0xffbe0b, 0x4ecdc4, 0x8855ff, 0xff6b6b];
    const kidColor = kidColors[Math.floor(Math.random() * kidColors.length)];
    
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: kidColor,
      metalness: 0.1,
      roughness: 0.8
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffdbac,
      metalness: 0.1,
      roughness: 0.7
    });
    
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    
    // Party hat
    const hatGeometry = new THREE.ConeGeometry(0.5, 1, 8);
    const hatMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8855ff,
      metalness: 0.2,
      roughness: 0.6
    });
    
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.set(0, 2.3, 0);
    
    // Kid group
    const kid = new THREE.Group();
    kid.add(body, head, hat);
    
    // Random position
    const x = Math.random() * 70 - 35;
    const z = Math.random() * 70 - 35;
    kid.position.set(x, 1, z);
    
    // Add kid data
    kid.userData = {
      id: i,
      speed: 0.03 + Math.random() * 0.02,
      detectionRange: 10,
      targetPosition: new THREE.Vector3(
        Math.random() * 70 - 35,
        1,
        Math.random() * 70 - 35
      ),
      timeSinceTargetChange: 0
    };
    
    scene.add(kid);
    gameState.partyKids.push(kid);
  }
}

function setupControls() {
  const onKeyDown = function(event) {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    switch(event.code) {
      case 'KeyW':
        moveForward = true;
        break;
      case 'KeyS':
        moveBackward = true;
        break;
      case 'KeyA':
        moveLeft = true;
        break;
      case 'KeyD':
        moveRight = true;
        break;
      case 'Space':
        jetpackActive = true;
        if (!sounds.jetpack.playing()) {
          sounds.jetpack.play();
        }
        break;
      case 'Escape':
        toggleMenu();
        break;
    }
  };
  
  const onKeyUp = function(event) {
    switch(event.code) {
      case 'KeyW':
        moveForward = false;
        break;
      case 'KeyS':
        moveBackward = false;
        break;
      case 'KeyA':
        moveLeft = false;
        break;
      case 'KeyD':
        moveRight = false;
        break;
      case 'Space':
        jetpackActive = false;
        sounds.jetpack.stop();
        break;
    }
  };
  
  const onClick = function(event) {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    if (controls.isLocked) {
      shootPinProjectile();
    } else {
      controls.lock();
    }
  };
  
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('click', onClick);
  
  controls.addEventListener('lock', function() {
    if (gameState.isPlaying) {
      elements.menu.classList.add('hidden');
      gameState.isPaused = false;
      clock.start();
    }
  });
  
  controls.addEventListener('unlock', function() {
    if (gameState.isPlaying && !gameState.isPaused) {
      elements.menu.classList.remove('hidden');
      gameState.isPaused = true;
      clock.stop();
    }
  });
}

function updateBalloons(delta) {
  gameState.balloons.forEach(balloon => {
    if (balloon.userData.isPopped) return;
    
    // Floating effect
    balloon.position.y += Math.sin(Date.now() * 0.001 * balloon.userData.hoverFrequency) * 0.01 * balloon.userData.hoverAmplitude;
    
    // Move towards target
    balloon.userData.timeSinceTargetChange += delta;
    
    if (balloon.userData.timeSinceTargetChange > 5) {
      balloon.userData.targetPosition.set(
        Math.random() * 80 - 40,
        3 + Math.random() * 5,
        Math.random() * 80 - 40
      );
      balloon.userData.timeSinceTargetChange = 0;
    }
    
    const directionToTarget = new THREE.Vector3()
      .subVectors(balloon.userData.targetPosition, balloon.position)
      .normalize();
    
    balloon.position.add(directionToTarget.multiplyScalar(balloon.userData.speed));
    
    // Gentle rotation
    balloon.rotation.y += balloon.userData.rotationSpeed * delta;
  });
}

function updatePartyKids(delta) {
  gameState.partyKids.forEach(kid => {
    // Move towards target
    kid.userData.timeSinceTargetChange += delta;
    
    if (kid.userData.timeSinceTargetChange > 8) {
      kid.userData.targetPosition.set(
        Math.random() * 70 - 35,
        1,
        Math.random() * 70 - 35
      );
      kid.userData.timeSinceTargetChange = 0;
    }
    
    const directionToTarget = new THREE.Vector3()
      .subVectors(kid.userData.targetPosition, kid.position)
      .normalize();
    
    kid.position.add(directionToTarget.multiplyScalar(kid.userData.speed));
    
    // Rotate to face direction
    const targetRotation = Math.atan2(directionToTarget.x, directionToTarget.z);
    kid.rotation.y = targetRotation;
    
    // Check if kid can detect player
    const distanceToPlayer = kid.position.distanceTo(camera.position);
    if (distanceToPlayer < kid.userData.detectionRange) {
      // Increase detection based on proximity
      const detectionIncrease = (1 - distanceToPlayer / kid.userData.detectionRange) * delta * 10;
      gameState.detectionLevel += detectionIncrease;
      
      // Update UI
      updateDetectionMeter();
      
      // Check for game over
      if (gameState.detectionLevel >= 100) {
        endGame(false);
      }
    }
  });
}

function shootPinProjectile() {
  if (gameState.happiness < 10) return; // Not enough happiness
  
  // Deduct happiness
  gameState.happiness -= 10;
  updateHappinessMeter();
  startHappinessCooldown();
  
  // Play sound
  sounds.pinShot.play();
  
  // Create projectile in 3D space
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  
  const bolt = {
    position: new THREE.Vector3().copy(camera.position),
    direction: direction,
    speed: 0.5,
    lifeTime: 0,
    maxLife: 3 // seconds
  };
  
  // Add an offset below the camera for bolt origin
  bolt.position.y -= 0.2;
  
  gameState.projectiles.push(bolt);
  
  // Create visual element in 3D space
  const geometry = new THREE.ConeGeometry(0.1, 0.5, 8);
  geometry.rotateX(Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  const meshBolt = new THREE.Mesh(geometry, material);
  
  meshBolt.position.copy(bolt.position);
  meshBolt.quaternion.copy(camera.quaternion);
  scene.add(meshBolt);
  
  bolt.mesh = meshBolt;
}

function updateProjectiles(delta) {
  for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
    const bolt = gameState.projectiles[i];
    
    // Update position
    bolt.position.add(bolt.direction.clone().multiplyScalar(bolt.speed));
    
    // Update 3D mesh position
    if (bolt.mesh) {
      bolt.mesh.position.copy(bolt.position);
    }
    
    // Check for collisions with balloons
    gameState.balloons.forEach(balloon => {
      if (!balloon.userData.isPopped && bolt.position.distanceTo(balloon.position) < 1.2) {
        popBalloon(balloon, bolt.position);
        removeBolt(i);
        return;
      }
    });
    
    // Update lifetime
    bolt.lifeTime += delta;
    if (bolt.lifeTime > bolt.maxLife) {
      removeBolt(i);
    }
  }
}

function removeBolt(index) {
  const bolt = gameState.projectiles[index];
  if (bolt.mesh) {
    scene.remove(bolt.mesh);
  }
  gameState.projectiles.splice(index, 1);
}

function popBalloon(balloon, position) {
  // Only pop if not already popped
  if (!balloon.userData.isPopped) {
    // Play pop sound
    sounds.balloonPop.play();
    
    // Update balloon status
    balloon.userData.isPopped = true;
    
    // Make balloon pieces fall
    balloon.userData.isFalling = true;
    balloon.userData.fallVelocity = 0;
    
    // Create pop effect
    createPopEffect(position);
    
    // Show pop message
    elements.hackSuccess.textContent = "BALLOON POPPED!";
    elements.hackSuccess.classList.remove('hidden');
    elements.hackSuccess.classList.add('drone-destroyed');
    setTimeout(() => {
      elements.hackSuccess.classList.add('hidden');
      elements.hackSuccess.classList.remove('drone-destroyed');
    }, 1000);
    
    // Update stats
    gameState.balloonsPopped++;
    gameState.meanCommentsMade++;
    
    // Update UI
    elements.balloonsPopped.textContent = gameState.balloonsPopped;
    elements.meanCommentsMade.textContent = gameState.meanCommentsMade;
    
    // Create a floating mean comment text
    createMeanCommentText(balloon.position);
    
    // Check win condition
    if (gameState.balloonsPopped >= gameState.balloons.length) {
      endGame(true);
    }
  }
}

function createPopEffect(position) {
  // Create 3D pop effect
  const popLight = new THREE.PointLight(0xffbe0b, 5, 10);
  popLight.position.copy(position);
  scene.add(popLight);
  
  // Remove light after animation
  setTimeout(() => {
    scene.remove(popLight);
  }, 500);
  
  // Create 2D pop element
  const popElem = document.createElement('div');
  popElem.classList.add('explosion');
  popElem.innerHTML = `
    <svg width="100" height="100" viewBox="0 0 100 100">
      <text x="50" y="50" text-anchor="middle" dominant-baseline="middle" fill="#ff6b6b" font-size="24" font-weight="bold">POP!</text>
    </svg>
  `;
  document.getElementById('game-area').appendChild(popElem);
  
  // Position the explosion
  const vector = position.clone();
  vector.project(camera);
  
  const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
  
  popElem.style.left = `${x - 50}px`;
  popElem.style.top = `${y - 50}px`;
  
  // Remove element after animation
  setTimeout(() => {
    if (popElem.parentNode) {
      popElem.parentNode.removeChild(popElem);
    }
  }, 500);
}

function createMeanCommentText(position) {
  // Get a random mean comment
  const comment = gameState.meanComments[Math.floor(Math.random() * gameState.meanComments.length)];
  
  // Create a floating text div
  const textElem = document.createElement('div');
  textElem.classList.add('mean-comment-text');
  textElem.textContent = comment;
  textElem.style.position = 'absolute';
  textElem.style.color = '#ff006e';
  textElem.style.fontSize = '14px';
  textElem.style.textShadow = '0 0 5px #ff006e';
  textElem.style.padding = '10px';
  textElem.style.borderRadius = '5px';
  textElem.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
  textElem.style.zIndex = '5';
  textElem.style.opacity = '0';
  textElem.style.transition = 'opacity 0.5s ease-in-out';
  
  document.body.appendChild(textElem);
  
  // Calculate screen position
  const vector = position.clone();
  vector.project(camera);
  
  const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
  
  textElem.style.left = `${x}px`;
  textElem.style.top = `${y}px`;
  
  // Animate
  setTimeout(() => {
    textElem.style.opacity = '1';
  }, 100);
  
  setTimeout(() => {
    textElem.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(textElem);
    }, 500);
  }, 3000);
}

function updatePlayerMovement(delta) {
  if (!controls.isLocked) return;
  
  // Calculate movement
  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;
  
  // Apply gravity unless jetpack is active
  if (jetpackActive && gameState.happiness > 0) {
    velocity.y += 0.0375; 
    gameState.happiness -= 0.5;
    updateHappinessMeter();
    
    if (gameState.happiness <= 0) {
      jetpackActive = false;
      sounds.jetpack.stop();
      startHappinessCooldown();
    }
  } else {
    velocity.y -= gravity;
  }
  
  // Limit vertical velocity
  velocity.y = Math.max(Math.min(velocity.y, 0.5), -0.5);
  
  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();
  
  const speed = 40.0; 
  
  if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
  if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;
  
  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);
  
  // Apply vertical movement
  camera.position.y += velocity.y;
  
  // Ground check - prevent falling below ground level
  if (camera.position.y < 1.6) {
    camera.position.y = 1.6;
    velocity.y = 0;
  }
  
  // Update player position
  gameState.playerPosition.copy(camera.position);
}

function updateHappinessMeter() {
  // Update UI
  elements.happinessFill.style.width = `${Math.max(0, (gameState.happiness / gameState.maxHappiness) * 100)}%`;
}

function startHappinessCooldown() {
  gameState.happinessRecharging = false;
  gameState.happinessRechargeTimer = 0;
  elements.happinessFill.classList.add('cooldown');
}

function updateHappinessRecharge(delta) {
  if (!gameState.happinessRecharging) {
    gameState.happinessRechargeTimer += delta;
    
    if (gameState.happinessRechargeTimer >= 1) { 
      gameState.happinessRecharging = true;
      elements.happinessFill.classList.remove('cooldown');
    }
  } else if (gameState.happiness < gameState.maxHappiness) {
    gameState.happiness = Math.min(gameState.maxHappiness, gameState.happiness + delta * 30);
    updateHappinessMeter();
  }
}

function updateFallingBalloonPieces(delta) {
  gameState.balloons.forEach(balloon => {
    if (balloon.userData.isFalling) {
      balloon.userData.fallVelocity += gravity * delta * 30;
      balloon.position.y -= balloon.userData.fallVelocity;
      
      // Spin the falling balloon pieces
      balloon.rotation.x += 0.05;
      balloon.rotation.z += 0.03;
      balloon.scale.set(
        balloon.scale.x * 0.97,
        balloon.scale.y * 0.97,
        balloon.scale.z * 0.97
      );
      
      // Remove balloon once it hits the ground
      if (balloon.position.y < 0.5) {
        balloon.position.y = 0.5;
        balloon.userData.isFalling = false;
        scene.remove(balloon);
      }
    }
  });
}

function updateDetectionMeter() {
  // Update UI
  elements.detectionFill.style.width = `${Math.min(gameState.detectionLevel, 100)}%`;
  
  // Change color based on level
  if (gameState.detectionLevel < 33) {
    elements.detectionFill.style.backgroundColor = '#33ff33';
  } else if (gameState.detectionLevel < 66) {
    elements.detectionFill.style.backgroundColor = '#ffcc00';
  } else {
    elements.detectionFill.style.backgroundColor = '#ff3333';
  }
}

function toggleMenu() {
  if (controls.isLocked) {
    controls.unlock();
    gameState.isPaused = true;
    clock.stop();
  } else {
    controls.lock();
    gameState.isPaused = false;
    clock.start();
  }
}

function startGame() {
  // Reset game state
  gameState.isPlaying = true;
  gameState.isPaused = false;
  gameState.balloonsPopped = 0;
  gameState.meanCommentsMade = 0;
  gameState.detectionLevel = 0;
  gameState.happiness = gameState.maxHappiness;
  gameState.happinessRecharging = true;
  gameState.projectiles = [];
  
  // Reset UI
  elements.balloonsPopped.textContent = '0';
  elements.meanCommentsMade.textContent = '0';
  elements.detectionFill.style.width = '0%';
  updateHappinessMeter();
  
  // Hide menu
  elements.menu.classList.add('hidden');
  
  // Lock controls
  controls.lock();
  
  // Start sounds
  sounds.ambience.play();
  sounds.balloonFloat.play();
  
  // Reset clock
  clock.start();
  
  // Start animation loop
  animate();
}

function endGame(isVictory) {
  gameState.isPlaying = false;
  gameState.isPaused = true;
  controls.unlock();
  
  // Update game over screen
  elements.gameOverTitle.textContent = isVictory ? 'PARTY RUINED!' : 'YOU GOT CAUGHT!';
  elements.gameOverMessage.textContent = isVictory 
    ? 'You successfully popped all the balloons and ruined the party!'
    : 'The party kids caught you being mean and told their parents!';
  
  elements.finalBalloons.textContent = gameState.balloonsPopped;
  elements.finalComments.textContent = gameState.meanCommentsMade;
  
  // Stop sounds
  sounds.ambience.stop();
  sounds.balloonFloat.stop();
  sounds.jetpack.stop();
  
  // Show game over screen
  elements.gameOver.classList.remove('hidden');
}

function animate() {
  if (!gameState.isPlaying) return;
  
  requestAnimationFrame(animate);
  
  if (gameState.isPaused) return;
  
  const delta = clock.getDelta();
  
  // Update player movement
  updatePlayerMovement(delta);
  
  // Update happiness recharge
  updateHappinessRecharge(delta);
  
  // Update balloons
  updateBalloons(delta);
  
  // Update falling balloon pieces
  updateFallingBalloonPieces(delta);
  
  // Update party kids
  updatePartyKids(delta);
  
  // Update projectiles
  updateProjectiles(delta);
  
  // Render scene
  renderer.render(scene, camera);
}

function createCrosshair() {
  crosshair = document.createElement('div');
  crosshair.id = 'crosshair';
  crosshair.innerHTML = `
    <svg width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r="13" stroke="#ffcc00" stroke-width="1" fill="none" stroke-opacity="0.6" />
      <circle cx="15" cy="15" r="2" fill="#ffcc00" fill-opacity="0.8" />
      <line x1="15" y1="5" x2="15" y2="10" stroke="#ffcc00" stroke-width="1" stroke-opacity="0.6" />
      <line x1="15" y1="20" x2="15" y2="25" stroke="#ffcc00" stroke-width="1" stroke-opacity="0.6" />
      <line x1="5" y1="15" x2="10" y2="15" stroke="#ffcc00" stroke-width="1" stroke-opacity="0.6" />
      <line x1="20" y1="15" x2="25" y2="15" stroke="#ffcc00" stroke-width="1" stroke-opacity="0.6" />
    </svg>
  `;
  document.getElementById('game-area').appendChild(crosshair);
}

// Event listeners
elements.startButton.addEventListener('click', () => {
  initThree();
  startGame();
});

elements.shopButton.addEventListener('click', () => {
  elements.shopModal.classList.remove('hidden');
  gameState.isPaused = true;
});

elements.closeShop.addEventListener('click', () => {
  elements.shopModal.classList.add('hidden');
  if (!elements.menu.classList.contains('hidden')) {
    gameState.isPaused = true;
  } else {
    gameState.isPaused = false;
    if (gameState.isPlaying) controls.lock();
  }
});

elements.aboutButton.addEventListener('click', () => {
  elements.aboutModal.classList.remove('hidden');
  gameState.isPaused = true;
});

elements.closeAbout.addEventListener('click', () => {
  elements.aboutModal.classList.add('hidden');
  if (!elements.menu.classList.contains('hidden')) {
    gameState.isPaused = true;
  } else {
    gameState.isPaused = false;
    if (gameState.isPlaying) controls.lock();
  }
});

elements.restartButton.addEventListener('click', () => {
  elements.gameOver.classList.add('hidden');
  startGame();
});

// Initialize the menu
elements.menu.classList.remove('hidden');