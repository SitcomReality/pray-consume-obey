import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Game state
const gameState = {
  isPlaying: false,
  dronesHacked: 0,
  scripturesBroadcast: 0,
  detectionLevel: 0,
  playerPosition: new THREE.Vector3(0, 1.6, 0),
  targetedDrone: null,
  drones: [],
  priests: [],
  scriptures: [
    "Blessed are the poor, for theirs is the kingdom of heaven.",
    "It is easier for a camel to go through the eye of a needle than for a rich man to enter the kingdom of God.",
    "You cannot serve both God and money.",
    "Love your neighbor as yourself.",
    "Sell your possessions and give to the poor.",
    "When you pray, do not be like the hypocrites who love to pray in public to be seen by others.",
    "Judge not, lest ye be judged."
  ]
};

// Sound effects
const sounds = {
  ambience: new Howl({
    src: ['data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gQ29ueWFjIFNvdW5kYmFua////0A='],
    volume: 0.3,
    loop: true
  }),
  droneHum: new Howl({
    src: ['data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gQ29ueWFjIFNvdW5kYmFua////0A='],
    volume: 0.2,
    loop: true
  }),
  hack: new Howl({
    src: ['data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gQ29ueWFjIFNvdW5kYmFua////0A='],
    volume: 0.5
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
  dronesHacked: document.getElementById('drones-hacked'),
  scripturesCount: document.getElementById('scriptures-count'),
  detectionFill: document.getElementById('detection-fill'),
  targetIndicator: document.getElementById('target-indicator'),
  hackSuccess: document.getElementById('hack-success'),
  gameOver: document.getElementById('game-over'),
  gameOverTitle: document.getElementById('game-over-title'),
  gameOverMessage: document.getElementById('game-over-message'),
  finalDrones: document.getElementById('final-drones'),
  finalScriptures: document.getElementById('final-scriptures'),
  restartButton: document.getElementById('restart-game')
};

// THREE.js setup
let scene, camera, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
let clock = new THREE.Clock();

function initThree() {
  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.05);
  
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
  const ambientLight = new THREE.AmbientLight(0x333333);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 10, 0);
  scene.add(directionalLight);
  
  // Add colored point lights for neon effect
  addPointLight(0xff00ff, 0, 5, -10, 8);
  addPointLight(0x00ffff, 10, 3, 0, 5);
  addPointLight(0xffcc00, -10, 4, 5, 6);
  
  // Floor
  const floorGeometry = new THREE.PlaneGeometry(100, 100, 10, 10);
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x111111,
    wireframe: false,
    metalness: 0.8,
    roughness: 0.2
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  
  // Grid lines for floor
  const gridHelper = new THREE.GridHelper(100, 100, 0xff00ff, 0x444444);
  scene.add(gridHelper);
  
  // Create the mega-church environment
  createEnvironment();
  
  // Create drones
  createDrones(15);
  
  // Create AI priests
  createPriests(5);
  
  // Handle resize
  window.addEventListener('resize', () => {
    camera.aspect = elements.gameCanvas.clientWidth / elements.gameCanvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(elements.gameCanvas.clientWidth, elements.gameCanvas.clientHeight);
  });
  
  // Set up controls
  setupControls();
}

function addPointLight(color, x, y, z, intensity = 1, distance = 15) {
  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(x, y, z);
  scene.add(light);
  return light;
}

function createEnvironment() {
  // Central mega-church building
  const churchGeometry = new THREE.BoxGeometry(30, 20, 30);
  const churchMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x222222,
    metalness: 0.7,
    roughness: 0.2
  });
  const church = new THREE.Mesh(churchGeometry, churchMaterial);
  church.position.set(0, 10, -30);
  scene.add(church);
  
  // Cross on top
  const crossVertical = new THREE.BoxGeometry(2, 15, 2);
  const crossHorizontal = new THREE.BoxGeometry(10, 2, 2);
  const crossMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff00ff,
    emissive: 0xff00ff,
    emissiveIntensity: 0.5
  });
  
  const crossVert = new THREE.Mesh(crossVertical, crossMaterial);
  crossVert.position.set(0, 27.5, -30);
  scene.add(crossVert);
  
  const crossHorz = new THREE.Mesh(crossHorizontal, crossMaterial);
  crossHorz.position.set(0, 24, -30);
  scene.add(crossHorz);
  
  // Add some blockchain NFT displays
  for (let i = -20; i <= 20; i += 10) {
    if (i === 0) continue; // Skip center
    
    const displayGeometry = new THREE.BoxGeometry(5, 5, 1);
    const displayMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffcc00,
      emissive: 0xffcc00,
      emissiveIntensity: 0.3
    });
    
    const display = new THREE.Mesh(displayGeometry, displayMaterial);
    display.position.set(i, 5, -15);
    scene.add(display);
    
    // NFT frame
    const frameGeometry = new THREE.BoxGeometry(6, 6, 0.5);
    const frameMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(i, 5, -14.5);
    scene.add(frame);
  }
  
  // Add pillars
  for (let x = -25; x <= 25; x += 50) {
    for (let z = -25; z <= 25; z += 10) {
      if (z < -20) continue; // Don't place pillars inside church
      
      const pillarGeometry = new THREE.CylinderGeometry(1, 1, 8, 8);
      const pillarMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        metalness: 0.5,
        roughness: 0.2
      });
      
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      pillar.position.set(x, 4, z);
      scene.add(pillar);
    }
  }
  
  // Gift shop building
  const shopGeometry = new THREE.BoxGeometry(15, 10, 15);
  const shopMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x222255,
    metalness: 0.6,
    roughness: 0.3
  });
  
  const shop = new THREE.Mesh(shopGeometry, shopMaterial);
  shop.position.set(25, 5, 20);
  scene.add(shop);
  
  // Shop sign
  const signGeometry = new THREE.PlaneGeometry(10, 2);
  const signMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 0.7,
    side: THREE.DoubleSide
  });
  
  const sign = new THREE.Mesh(signGeometry, signMaterial);
  sign.position.set(25, 12, 20);
  sign.rotation.y = Math.PI / 2;
  scene.add(sign);
}

function createDrones(count) {
  for (let i = 0; i < count; i++) {
    // Drone body
    const bodyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      metalness: 0.9,
      roughness: 0.1
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Propellers
    const propGeometry = new THREE.BoxGeometry(1.5, 0.05, 0.2);
    const propMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x666666,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const propeller1 = new THREE.Mesh(propGeometry, propMaterial);
    propeller1.position.y = 0.3;
    
    const propeller2 = new THREE.Mesh(propGeometry, propMaterial);
    propeller2.position.y = 0.3;
    propeller2.rotation.y = Math.PI / 2;
    
    // Camera/speaker
    const cameraGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8);
    const cameraMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5
    });
    
    const droneCamera = new THREE.Mesh(cameraGeometry, cameraMaterial);
    droneCamera.position.y = -0.3;
    droneCamera.rotation.x = Math.PI / 2;
    
    // Drone group
    const drone = new THREE.Group();
    drone.add(body, propeller1, propeller2, droneCamera);
    
    // Random position
    const x = Math.random() * 80 - 40;
    const z = Math.random() * 80 - 40;
    drone.position.set(x, 3 + Math.random() * 3, z);
    
    // Add drone data
    drone.userData = {
      id: i,
      isHacked: false,
      originalColor: 0xff0000,
      hackedColor: 0x33ff33,
      speed: 0.02 + Math.random() * 0.03,
      rotationSpeed: 0.01 + Math.random() * 0.02,
      hoverAmplitude: 0.1 + Math.random() * 0.1,
      hoverFrequency: 0.5 + Math.random() * 1,
      targetPosition: new THREE.Vector3(
        Math.random() * 80 - 40,
        3 + Math.random() * 3,
        Math.random() * 80 - 40
      ),
      timeSinceTargetChange: 0
    };
    
    scene.add(drone);
    gameState.drones.push(drone);
  }
}

function createPriests(count) {
  for (let i = 0; i < count; i++) {
    // Priest body
    const bodyGeometry = new THREE.ConeGeometry(0.8, 2.5, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x000000,
      metalness: 0.7,
      roughness: 0.3
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Head with AI interface
    const headGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xCCCCCC,
      metalness: 0.9,
      roughness: 0.1
    });
    
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    
    // AI face
    const faceGeometry = new THREE.PlaneGeometry(0.8, 0.8);
    const faceMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.7,
      side: THREE.DoubleSide
    });
    
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    face.position.set(0, 1.5, 0.5);
    
    // Priest group
    const priest = new THREE.Group();
    priest.add(body, head, face);
    
    // Random position
    const x = Math.random() * 70 - 35;
    const z = Math.random() * 70 - 35;
    priest.position.set(x, 1.25, z);
    
    // Add priest data
    priest.userData = {
      id: i,
      speed: 0.03 + Math.random() * 0.02,
      detectionRange: 10,
      targetPosition: new THREE.Vector3(
        Math.random() * 70 - 35,
        1.25,
        Math.random() * 70 - 35
      ),
      timeSinceTargetChange: 0
    };
    
    scene.add(priest);
    gameState.priests.push(priest);
  }
}

function setupControls() {
  const onKeyDown = function(event) {
    if (!gameState.isPlaying) return;
    
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
    }
  };
  
  const onClick = function() {
    if (!gameState.isPlaying) return;
    
    if (controls.isLocked) {
      if (gameState.targetedDrone) {
        hackDrone(gameState.targetedDrone);
      }
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
    }
  });
  
  controls.addEventListener('unlock', function() {
    if (gameState.isPlaying) {
      elements.menu.classList.remove('hidden');
    }
  });
}

function updateDrones(delta) {
  gameState.drones.forEach(drone => {
    // Animate propellers
    drone.children[1].rotation.y += 0.2;
    drone.children[2].rotation.y += 0.2;
    
    // Hover effect
    drone.position.y += Math.sin(Date.now() * 0.001 * drone.userData.hoverFrequency) * 0.01 * drone.userData.hoverAmplitude;
    
    // Move towards target
    drone.userData.timeSinceTargetChange += delta;
    
    if (drone.userData.timeSinceTargetChange > 5) {
      drone.userData.targetPosition.set(
        Math.random() * 80 - 40,
        3 + Math.random() * 3,
        Math.random() * 80 - 40
      );
      drone.userData.timeSinceTargetChange = 0;
    }
    
    const directionToTarget = new THREE.Vector3()
      .subVectors(drone.userData.targetPosition, drone.position)
      .normalize();
    
    drone.position.add(directionToTarget.multiplyScalar(drone.userData.speed));
    
    // Rotate to face direction
    const targetRotation = Math.atan2(directionToTarget.x, directionToTarget.z);
    drone.rotation.y = targetRotation;
    
    // Update camera/speaker color based on hack status
    if (drone.userData.isHacked) {
      drone.children[3].material.color.set(drone.userData.hackedColor);
      drone.children[3].material.emissive.set(drone.userData.hackedColor);
    }
  });
}

function updatePriests(delta) {
  gameState.priests.forEach(priest => {
    // Move towards target
    priest.userData.timeSinceTargetChange += delta;
    
    if (priest.userData.timeSinceTargetChange > 8) {
      priest.userData.targetPosition.set(
        Math.random() * 70 - 35,
        1.25,
        Math.random() * 70 - 35
      );
      priest.userData.timeSinceTargetChange = 0;
    }
    
    const directionToTarget = new THREE.Vector3()
      .subVectors(priest.userData.targetPosition, priest.position)
      .normalize();
    
    priest.position.add(directionToTarget.multiplyScalar(priest.userData.speed));
    
    // Rotate to face direction
    const targetRotation = Math.atan2(directionToTarget.x, directionToTarget.z);
    priest.rotation.y = targetRotation;
    
    // Check if priest can detect player
    const distanceToPlayer = priest.position.distanceTo(camera.position);
    if (distanceToPlayer < priest.userData.detectionRange) {
      // Increase detection based on proximity
      const detectionIncrease = (1 - distanceToPlayer / priest.userData.detectionRange) * delta * 10;
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

function checkForTargetableDrones() {
  // Reset previous target
  if (gameState.targetedDrone) {
    gameState.targetedDrone = null;
    elements.targetIndicator.classList.add('hidden');
  }
  
  // Cast ray from camera
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  
  // Check intersections with drones
  const intersects = raycaster.intersectObjects(gameState.drones, true);
  
  if (intersects.length > 0) {
    // Find the drone group that contains the intersected object
    let droneObject = intersects[0].object;
    while (droneObject.parent && !gameState.drones.includes(droneObject)) {
      droneObject = droneObject.parent;
    }
    
    // If we found a drone and it's not already hacked
    if (gameState.drones.includes(droneObject) && !droneObject.userData.isHacked) {
      gameState.targetedDrone = droneObject;
      elements.targetIndicator.classList.remove('hidden');
    }
  }
}

function hackDrone(drone) {
  // Only hack if not already hacked
  if (!drone.userData.isHacked) {
    // Play hack sound
    sounds.hack.play();
    
    // Update drone status
    drone.userData.isHacked = true;
    
    // Show hack success message
    elements.hackSuccess.classList.remove('hidden');
    setTimeout(() => {
      elements.hackSuccess.classList.add('hidden');
    }, 1000);
    
    // Update stats
    gameState.dronesHacked++;
    gameState.scripturesBroadcast++;
    
    // Update UI
    elements.dronesHacked.textContent = gameState.dronesHacked;
    elements.scripturesCount.textContent = gameState.scripturesBroadcast;
    
    // Create a floating scripture text
    createScriptureText(drone.position);
    
    // Check win condition
    if (gameState.dronesHacked >= gameState.drones.length) {
      endGame(true);
    }
  }
}

function createScriptureText(position) {
  // Get a random scripture
  const scripture = gameState.scriptures[Math.floor(Math.random() * gameState.scriptures.length)];
  
  // Create a floating text div
  const textElem = document.createElement('div');
  textElem.classList.add('scripture-text');
  textElem.textContent = scripture;
  textElem.style.position = 'absolute';
  textElem.style.color = '#33ff33';
  textElem.style.fontSize = '14px';
  textElem.style.textShadow = '0 0 5px #33ff33';
  textElem.style.padding = '10px';
  textElem.style.borderRadius = '5px';
  textElem.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
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
  
  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();
  
  const speed = 5.0;
  
  if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
  if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;
  
  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);
  
  // Update player position
  gameState.playerPosition.copy(camera.position);
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
  } else {
    controls.lock();
  }
}

function startGame() {
  // Reset game state
  gameState.isPlaying = true;
  gameState.dronesHacked = 0;
  gameState.scripturesBroadcast = 0;
  gameState.detectionLevel = 0;
  
  // Reset UI
  elements.dronesHacked.textContent = '0';
  elements.scripturesCount.textContent = '0';
  elements.detectionFill.style.width = '0%';
  
  // Hide menu
  elements.menu.classList.add('hidden');
  
  // Lock controls
  controls.lock();
  
  // Start sounds
  sounds.ambience.play();
  sounds.droneHum.play();
  
  // Start animation loop
  animate();
}

function endGame(isVictory) {
  gameState.isPlaying = false;
  controls.unlock();
  
  // Update game over screen
  elements.gameOverTitle.textContent = isVictory ? 'MISSION COMPLETE' : 'MISSION FAILED';
  elements.gameOverMessage.textContent = isVictory 
    ? 'You successfully hacked all drones and spread the forbidden scriptures!'
    : 'You have been detected by the AI priests and excommunicated from SALVATION™.';
  
  elements.finalDrones.textContent = gameState.dronesHacked;
  elements.finalScriptures.textContent = gameState.scripturesBroadcast;
  
  // Stop sounds
  sounds.ambience.stop();
  sounds.droneHum.stop();
  
  // Show game over screen
  elements.gameOver.classList.remove('hidden');
}

function animate() {
  if (!gameState.isPlaying) return;
  
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  
  // Update player movement
  updatePlayerMovement(delta);
  
  // Update drones
  updateDrones(delta);
  
  // Update priests
  updatePriests(delta);
  
  // Check for targetable drones
  checkForTargetableDrones();
  
  // Render scene
  renderer.render(scene, camera);
}

// Event listeners
elements.startButton.addEventListener('click', () => {
  initThree();
  startGame();
});

elements.shopButton.addEventListener('click', () => {
  elements.shopModal.classList.remove('hidden');
});

elements.closeShop.addEventListener('click', () => {
  elements.shopModal.classList.add('hidden');
});

elements.aboutButton.addEventListener('click', () => {
  elements.aboutModal.classList.remove('hidden');
});

elements.closeAbout.addEventListener('click', () => {
  elements.aboutModal.classList.add('hidden');
});

elements.restartButton.addEventListener('click', () => {
  elements.gameOver.classList.add('hidden');
  startGame();
});

// Initialize the menu
elements.menu.classList.remove('hidden');

