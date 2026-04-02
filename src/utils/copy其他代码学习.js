// Set up the scene
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 0); // Set camera position 0.1 units above the grid

// Adjust the camera's near clipping plane value
camera.near = 0.015; // Set a smaller value, like 0.1
camera.updateProjectionMatrix();

// Setup Gun Object
var tommyGun;
// 3D Abandoned Building MOdel
var abandonedBuilding;
//Array for bullet hole meshes
let bulletHoles = [];
//Gun Firing Variable to track when gun is firing
let isFiring = false;
// Counter variable to keep track of the number of bullets
var bulletCount = 0;

// Create the renderer
var renderer = new THREE.WebGLRenderer({});
renderer.physicallyCorrectLights;
// Configure renderer settings
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//Create ray caster instance
var raycaster = new THREE.Raycaster();
//Create mouse instance
var mouse = new THREE.Vector2();
//Create array to store bullets
var bullets = [];

// Variables for tracking time and adding bullet hole meshes
let lastMeshAdditionTime = 0;
const meshAdditionInterval = 100; // Interval duration in milliseconds

// Keyboard controls
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;

///flashing light // Create a point light
const tommyGunLight = new THREE.PointLight(0xffffff, 100, 100); // Adjust the light color and intensity as needed
tommyGunLight.position.set(0, 0, 0); // Set the light position
tommyGunLight.visible = false;
// Add the light to the scene initially
scene.add(tommyGunLight);

// Gravity effect variables
var gravity = new THREE.Vector3(0, -0.01, 0); // Adjust the gravity strength as needed
var maxGravityDistance = 2; // Adjust the maximum distance affected by gravity as needed

// Add PointerLockControls
var controls = new THREE.PointerLockControls(camera, document.body);

// Create a grid
var gridHelper = new THREE.GridHelper(20, 20);
scene.add(gridHelper);

// Set up pointer lock controls
var blocker = document.getElementById('blocker');
var instructions = document.getElementById('instructions');
var playButton = document.getElementById('playButton');

playButton.addEventListener('click', function () {
  controls.lock();
});

controls.addEventListener('lock', function () {
  instructions.style.display = 'none';
  blocker.style.display = 'none';
  document.getElementById('crosshair').style.display = 'block'; // Show the crosshair when screen is locked
});

controls.addEventListener('unlock', function () {
  blocker.style.display = 'block';
  instructions.style.display = '';
  document.getElementById('crosshair').style.display = 'none'; // Hide the crosshair when screen is unlocked
});

// Resize renderer when window size changes
window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

scene.add(controls.getObject());

// Create an ambient light with brightness
var ambientLight = new THREE.AmbientLight(0xffffff, 2); // Adjust the color as needed
scene.add(ambientLight);

// Load GLTF model
var loader = new THREE.GLTFLoader();
loader.load('https://www.shanebrumback.com/models/glb/tommy_gun.glb', function (gltf) {
  gltf.scene.scale.set(0.25, 0.25, 0.25);

  // Set the cube's position to be equal to the camera's position
  gltf.scene.position.set(camera.position.x, camera.position.y, camera.position.z);
  tommyGun = gltf.scene;
  scene.add(gltf.scene);

  // Add a point light to the gun
  var tommyGunLight = new THREE.PointLight(0xffffff, 1);
  tommyGunLight.position.set(0.025, -0.15, 0); // Adjust the position of the light relative to the gun
  tommyGun.add(tommyGunLight);
});

//Load building model
loader.load(
  'https://www.shanebrumback.com/models/glb/low_poly_abandoned_brick_room.glb',
  function (gltf) {
    abandonedBuilding = gltf.scene;
    abandonedBuilding.position.y = 0.008;
    scene.add(abandonedBuilding);
  }
);

var onKeyDown = function (event) {
  switch (event.keyCode) {
    case 38: // up arrow
    case 87: // W key
      moveForward = true;
      break;
    case 37: // left arrow
    case 65: // A key
      moveLeft = true;
      break;
    case 40: // down arrow
    case 83: // S key
      moveBackward = true;
      break;
    case 39: // right arrow
    case 68: // D key
      moveRight = true;
      break;
  }
};

var onKeyUp = function (event) {
  switch (event.keyCode) {
    case 38: // up arrow
    case 87: // W key
      moveForward = false;
      break;
    case 37: // left arrow
    case 65: // A key
      moveLeft = false;
      break;
    case 40: // down arrow
    case 83: // S key
      moveBackward = false;
      break;
    case 39: // right arrow
    case 68: // D key
      moveRight = false;
      break;
  }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// Check collision with the grid
function checkCollision(position) {
  var gridSize = 20;
  var halfGridSize = gridSize / 2;
  var margin = 0.1;

  if (
    position.x < -halfGridSize + margin ||
    position.x > halfGridSize - margin ||
    position.z < -halfGridSize + margin ||
    position.z > halfGridSize - margin
  ) {
    return true; // Collision detected
  }

  return false; // No collision
}

function animate() {
  requestAnimationFrame(animate);

  // Update bullets
  updateBullets();

  //ramp up player movement speed and direction
  if (controls.isLocked) {
    var acceleration = 0.003; // Speed increment per frame
    var maxSpeed = 0.1; // Maximum speed

    if (moveForward) {
      controls.speed = Math.min(controls.speed + acceleration, maxSpeed);
      controls.moveForward(controls.speed);
      if (checkCollision(controls.getObject().position)) {
        controls.moveForward(-controls.speed); // Move back to the previous position
      }
    } else if (moveBackward) {
      controls.speed = Math.min(controls.speed + acceleration, maxSpeed);
      controls.moveForward(-controls.speed);
      if (checkCollision(controls.getObject().position)) {
        controls.moveForward(controls.speed); // Move back to the previous position
      }
    } else if (moveLeft) {
      controls.speed = Math.min(controls.speed + acceleration, maxSpeed);
      controls.moveRight(-controls.speed);
      if (checkCollision(controls.getObject().position)) {
        controls.moveRight(controls.speed); // Move back to the previous position
      }
    } else if (moveRight) {
      controls.speed = Math.min(controls.speed + acceleration, maxSpeed);
      controls.moveRight(controls.speed);
      if (checkCollision(controls.getObject().position)) {
        controls.moveRight(-controls.speed); // Move back to the previous position
      }
    } else {
      controls.speed = 0; // Reset speed when no movement controls are active
    }
  }

  // Set the position and rotation of the tommy gun based on the camera
  if (tommyGun) {
    // Match tommy gun to player camera position
    tommyGun.position.copy(camera.position);
    tommyGun.rotation.copy(camera.rotation);
    tommyGun.updateMatrix();
    tommyGun.translateZ(-0.05);
    tommyGun.translateY(-0.05);
    tommyGun.translateX(-0.025);
    tommyGun.rotateY(Math.PI / 2); // Rotate the model by 180 degrees
  }

  if (isFiring) {
    const currentTime = performance.now();

    // Check if the specified interval has passed since the last mesh addition
    if (currentTime - lastMeshAdditionTime >= meshAdditionInterval) {
      lastMeshAdditionTime = currentTime; // Update the last mesh addition time
      // Get the direction of the ray at the time of creation
      const direction = raycaster.ray.direction.clone();

      // Search for the "barrel_low" mesh within the "tommyGun" object
      //use it as bullet particle start point
      let finLowObject = null;
      tommyGun.traverse(function (object) {
        if (object.name === 'barrel_low') {
          console.log(object.name);
          finLowObject = object;
        }
      });

      const worldPosition = new THREE.Vector3();
      finLowObject.getWorldPosition(worldPosition);

      createBullet(worldPosition, direction);
      updateGunMuzzleFlash(worldPosition);
    }

    //check bullet collision
    checkBulletCollision();
  }

  //face bullet holes
  faceBulletHolesToCamera();

  renderer.render(scene, camera);
}

animate();

// Add event listeners for the mouse down and mouse up events
window.addEventListener('mousedown', onMouseDown, false);
window.addEventListener('mouseup', onMouseUp, false);

function onMouseDown(event) {
  // Check if the left mouse button is pressed (button code 0)
  if (controls.isLocked && event.button === 0 && event.target.id !== 'playButton') {
    // Set isFiring to true
    isFiring = true;
  }
}

function onMouseUp(event) {
  // Check if the left mouse button is released (button code 0)
  if (event.button === 0) {
    // Set isFiring to false
    isFiring = false;
  }
}

function onMouseMove(event) {
  event.preventDefault();

  // Get the image element
  const imageElement = document.getElementById('crosshair');

  // Get the position of the image element on the screen
  const imageRect = imageElement.getBoundingClientRect();
  const imageCenterX = imageRect.left + imageRect.width / 2;
  const imageCenterY = imageRect.top + imageRect.height / 2;

  // Calculate the normalized device coordinates (-1 to 1) from the image center
  const mouse = new THREE.Vector2();
  mouse.x = (imageCenterX / window.innerWidth) * 2 - 1;
  mouse.y = -(imageCenterY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
}

// Mouse click event listener
document.addEventListener('mousemove', onMouseMove, false);

function faceBulletHolesToCamera() {
  bulletHoles.forEach(function (bulletHole) {
    // Calculate the direction from the bullet hole to the camera
    var direction = camera.position.clone().sub(bulletHole.position).normalize();

    // Calculate the rotation quaternion that faces the camera
    var quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      direction
    );

    // Apply the rotation to the bullet hole
    bulletHole.setRotationFromQuaternion(quaternion);
  });
}

function checkBulletCollision() {
  bullets.forEach(function (bullet) {
    var bulletPosition = bullet.position;
    var bulletDirection = bullet.direction; // Assuming each bullet has a direction property

    // Create a raycaster for the current bullet
    var raycaster = new THREE.Raycaster(bulletPosition, bulletDirection);

    // Find intersections between the ray and the abandonedBuilding object
    var intersects = raycaster.intersectObject(abandonedBuilding, true);

    if (intersects.length > 0) {
      // Play the bullet ricochet sound every 5 bullets
      if (bulletCount % 15 === 0) {
        playBulletRicochetSound();
      }
      bulletCount++;

      var intersect = intersects[0];
      var point = intersect.point;
      var faceNormal = intersect.face.normal;

      // Create and position the mesh at the intersection point
      var offset = new THREE.Vector3(0, 0, 0.01); // Increase the offset value to avoid z-fighting
      var insertionOffset = new THREE.Vector3(0, 0.01, 0); // Adjust the insertion offset as needed

      var loader = new THREE.TextureLoader();
      var material = new THREE.MeshBasicMaterial({
        map: loader.load('https://www.shanebrumback.com/images/bullet-hole.png'),
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: true,
      });

      var geometry = new THREE.PlaneGeometry(0.08, 0.08);
      var bulletHoleMesh = new THREE.Mesh(geometry, material);

      var insertionPoint = new THREE.Vector3().copy(point).add(offset).add(insertionOffset);

      bulletHoleMesh.position.copy(insertionPoint);
      scene.add(bulletHoleMesh);
      bulletHoles.push(bulletHoleMesh);

      // Fade out the mesh gradually over time
      var opacity = 1.0;
      var fadeOutDuration = 5000; // 5 seconds
      var fadeOutInterval = 50; // Update every 50 milliseconds

      var fadeOutTimer = setInterval(function () {
        opacity -= fadeOutInterval / fadeOutDuration;
        if (opacity <= 0) {
          opacity = 0;
          clearInterval(fadeOutTimer);
          scene.remove(bulletHoleMesh);
          bulletHoles.splice(bulletHoles.indexOf(bulletHoleMesh), 1);
        }
        bulletHoleMesh.material.opacity = opacity;
      }, fadeOutInterval);
    }
  });
}

// Function to toggle the light on or off based on the isFiring variable
function toggleLight(isFiring) {
  if (isFiring) {
    tommyGunLight.visible = !tommyGunLight.visible; // Toggle the light visibility
  } else {
    tommyGunLight.visible = false; // Ensure the light is off when not firing
  }
}

// Call the function whenever the value of isFiring changes
function updateGunMuzzleFlash(position) {
  toggleLight(isFiring);
  tommyGunLight.position.copy(camera.position);
}

// Function to create a bullets
function createBullet(position, direction) {
  //play machine gun sound bite
  playMachineGunSound();

  const bulletGeometry = new THREE.SphereGeometry(0.01, 8, 8);
  const bulletMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
  });
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
  bullet.position.copy(position);
  bullet.direction = direction.clone().normalize();
  bullet.distanceTraveled = 0;

  // Add a point light to the bullet
  const pointLight = new THREE.PointLight(0xffffff, 10, 100);
  pointLight.position.copy(position);
  bullet.add(pointLight);

  scene.add(bullet);
  bullets.push(bullet);
}

// Function to update bullets
function updateBullets() {
  const maxDistance = 5; // Maximum distance a bullet can travel before removal

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.position.addScaledVector(bullet.direction, 0.75); // Adjust the speed of the bullet here
    bullet.distanceTraveled += 0.4;

    if (bullet.distanceTraveled >= maxDistance) {
      scene.remove(bullet);
      bullets.splice(i, 1);
    }
  }
}

// Variables for audio context and machine gun sound
let audioContext;
let machineGunSoundBuffer;
let bulletRicochetSoundBuffer;

// Function to load an audio file
function loadAudioFile(url, callback) {
  const request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  request.onload = function () {
    audioContext.decodeAudioData(request.response, function (buffer) {
      if (typeof callback === 'function') {
        callback(buffer);
      }
    });
  };

  request.send();
}

// Function to play a sound from a buffer
function playSound(buffer, volume, loop = false) {
  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();

  // Connect the audio nodes
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Set the buffer, volume, and loop
  source.buffer = buffer;
  gainNode.gain.value = volume;

  // Start playing the sound
  source.start();
}

// Function to play the machine gun sound
function playMachineGunSound() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!machineGunSoundBuffer) {
    loadAudioFile(
      'https://www.shanebrumback.com/sounds/tommy-gun-single-bullet.mp3',
      function (buffer) {
        machineGunSoundBuffer = buffer;
        playSound(buffer, 1, isFiring); // Pass the isFiring value to control continuous playback
      }
    );
  } else {
    playSound(machineGunSoundBuffer, 1, isFiring); // Pass the isFiring value to control continuous playback
  }
}

// Function to play the bullet ricochet sound
function playBulletRicochetSound() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!bulletRicochetSoundBuffer) {
    loadAudioFile('https://www.shanebrumback.com/sounds/bullet-ricochet.mp3', function (buffer) {
      bulletRicochetSoundBuffer = buffer;
      playSound(buffer, 1, false); // Play the sound once, not continuous playback
    });
  } else {
    playSound(bulletRicochetSoundBuffer, 1, false); // Play the sound once, not continuous playback
  }
}

// Event listener for mouse down event
document.addEventListener('mousedown', function (event) {
  // Check if the left mouse button is pressed (button code 0)
  if (controls.isLocked && event.button === 0 && event.target.id !== 'playButton') {
    playMachineGunSound();
  }
});

// Event listener for mouse up event
document.addEventListener('mouseup', function (event) {
  // Check if the left mouse button is released (button code 0)
  if (event.button === 0) {
    tommyGunLight.visible = false;
    isFiring = false;
  }
});
