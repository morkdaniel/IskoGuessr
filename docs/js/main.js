let panorama;
let firebaseLocations = [];
let animationFrameId;
let currentRound = 0;
let totalScore = 0;
let map;
let marker;
let actualMarker;
let actualLocation;
let userGuess = null;
let distanceLine = null;
let mapVisible = true;

// Make map draggable
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

// ===== ADD THIS SECTION: Location Randomization =====
// Define UPLB campus bounds
const UPLB_BOUNDS = {
  north: 14.1700,  // Northern boundary
  south: 14.1600,  // Southern boundary  
  east: 121.2450,  // Eastern boundary
  west: 121.2380   // Western boundary
};

// Generate random coordinates within bounds
function generateRandomLocation(bounds = UPLB_BOUNDS) {
  const lat = bounds.south + (Math.random() * (bounds.north - bounds.south));
  const lng = bounds.west + (Math.random() * (bounds.east - bounds.west));
  return { lat, lng };
}

// Generate multiple random locations for a game session
function generateGameLocations(count = 5, bounds = UPLB_BOUNDS) {
  const locations = [];
  for (let i = 0; i < count; i++) {
    locations.push(generateRandomLocation(bounds));
  }
  return locations;
}

// Validate if location has Street View coverage (optional)
async function validateStreetViewLocation(location) {
  return new Promise((resolve) => {
    const streetViewService = new google.maps.StreetViewService();
    streetViewService.getPanorama({
      location: location,
      radius: 50,
      source: google.maps.StreetViewSource.OUTDOOR
    }, (data, status) => {
      resolve(status === google.maps.StreetViewStatus.OK);
    });
  });
}

// Enhanced location generation with Street View validation
async function generateValidatedLocations(count = 5, bounds = UPLB_BOUNDS, maxAttempts = 20) {
  const validLocations = [];
  let attempts = 0;
  
  while (validLocations.length < count && attempts < maxAttempts) {
    const location = generateRandomLocation(bounds);
    const isValid = await validateStreetViewLocation(location);
    
    if (isValid) {
      validLocations.push(location);
    }
    attempts++;
  }
  
  // Fallback to original hardcoded locations if not enough valid ones found
  const fallbackLocations = [
    { lat: 14.1650, lng: 121.2417 },
    { lat: 14.1642, lng: 121.2405 },
    { lat: 14.1632, lng: 121.2392 },
    { lat: 14.1655, lng: 121.2430 },
    { lat: 14.1640, lng: 121.2400 }
  ];
  
  while (validLocations.length < count) {
    validLocations.push(fallbackLocations[validLocations.length % fallbackLocations.length]);
  }
  
  return validLocations;
}
// ===== END OF LOCATION RANDOMIZATION SECTION =====

function initLoadingScreen() {
  const staticUplbLocations = [
    { lat: 14.1650, lng: 121.2417 },
    { lat: 14.1642, lng: 121.2405 },
    { lat: 14.1632, lng: 121.2392 },
  ];
  const random = staticUplbLocations[Math.floor(Math.random() * staticUplbLocations.length)];

  panorama = new google.maps.StreetViewPanorama(document.getElementById("pano"), {
    position: random,
    pov: { heading: 0, pitch: 0 },
    zoom: 1,
    disableDefaultUI: true,
    visible: true,
  });

  rotatePanorama();
}

function rotatePanorama() {
  if (!panorama) return;
  const pov = panorama.getPov();
  pov.heading = (pov.heading + 0.2) % 360;
  panorama.setPov(pov);

  if (!document.getElementById("loading-screen").classList.contains("hidden")) {
    animationFrameId = requestAnimationFrame(rotatePanorama);
  }
}

// ===== REPLACE YOUR startGame FUNCTION WITH THIS =====
async function startGame(campus) {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  document.getElementById("loading-screen").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  // Generate random locations instead of using hardcoded ones
  if (campus === 'uplb') {
    firebaseLocations = await generateValidatedLocations(5, UPLB_BOUNDS);
  } else {
    // For 'all' campuses, you can define different bounds or use a larger area
    firebaseLocations = await generateValidatedLocations(5, UPLB_BOUNDS);
  }

  console.log("Generated locations:", firebaseLocations); // For debugging

  currentRound = 0;
  totalScore = 0;
  document.getElementById("total-score").textContent = totalScore;
  
  initDraggableMap();
  loadNextRound();
}
// ===== END OF UPDATED startGame FUNCTION =====

function initDraggableMap() {
  const mapWindow = document.getElementById("map-window");
  const mapHeader = mapWindow.querySelector(".map-header");

  mapHeader.addEventListener("mousedown", dragStart);
  document.addEventListener("mousemove", dragMove);
  document.addEventListener("mouseup", dragEnd);

  // Initialize map
  map = new google.maps.Map(document.getElementById("game-map"), {
    center: { lat: 14.1650, lng: 121.2417 },
    zoom: 16,
    mapTypeId: 'hybrid'
  });

  marker = new google.maps.Marker({
    map: map,
    draggable: true,
    title: "Your guess"
  });

  actualMarker = new google.maps.Marker({
    map: map,
    icon: {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
          <circle cx="15" cy="15" r="12" fill="#ff0000" stroke="#ffffff" stroke-width="3"/>
          <text x="15" y="20" text-anchor="middle" fill="white" font-size="16" font-weight="bold">★</text>
        </svg>
      `),
      scaledSize: new google.maps.Size(30, 30)
    },
    title: "Actual location",
    visible: false
  });

  google.maps.event.addListener(map, 'click', function(event) {
    marker.setPosition(event.latLng);
    userGuess = event.latLng;
    document.getElementById("submit-guess").classList.remove("hidden");
  });

  google.maps.event.addListener(marker, 'dragend', function() {
    userGuess = marker.getPosition();
    document.getElementById("submit-guess").classList.remove("hidden");
  });
}

function dragStart(e) {
  initialX = e.clientX - xOffset;
  initialY = e.clientY - yOffset;
  if (e.target === e.currentTarget) {
    isDragging = true;
  }
}

function dragMove(e) {
  if (isDragging) {
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    xOffset = currentX;
    yOffset = currentY;
    
    const mapWindow = document.getElementById("map-window");
    mapWindow.style.transform = `translate(${currentX}px, ${currentY}px)`;
  }
}

function dragEnd() {
  isDragging = false;
}

function loadNextRound() {
  currentRound++;
  document.getElementById("round-number").textContent = currentRound;

  // Hide UI elements
  document.getElementById("submit-guess").classList.add("hidden");
  document.getElementById("next-round").classList.add("hidden");
  document.getElementById("end-game").classList.add("hidden");

  if (currentRound > 5) {
    endGame();
    return;
  }

  // Clear previous round
  if (marker) marker.setVisible(true);
  if (actualMarker) actualMarker.setVisible(false);
  if (distanceLine) distanceLine.setMap(null);
  userGuess = null;
  document.getElementById("round-score").textContent = "0";

  // Select random location
  const random = firebaseLocations[Math.floor(Math.random() * firebaseLocations.length)];
  actualLocation = { lat: random.lat, lng: random.lng };

  // Update Street View
  panorama = new google.maps.StreetViewPanorama(document.getElementById("street-view"), {
    position: actualLocation,
    pov: { heading: Math.random() * 360, pitch: Math.random() * 20 - 10 },
    zoom: 1,
    disableDefaultUI: true,
    visible: true,
  });

  // Center map on general area (not exact location)
  if (map) {
    map.setCenter({ lat: 14.1650, lng: 121.2417 });
    marker.setPosition({ lat: 14.1650, lng: 121.2417 });
    actualMarker.setPosition(actualLocation);
  }
}

function submitGuess() {
  if (!userGuess) return;

  // Show actual location
  actualMarker.setVisible(true);
  
  // Draw line between guessed and actual location
  distanceLine = new google.maps.Polyline({
    path: [userGuess, actualLocation],
    geodesic: true,
    strokeColor: '#FF0000',
    strokeOpacity: 1.0,
    strokeWeight: 3,
    map: map
  });

  // Calculate and show score
  const score = calculateScore(userGuess);
  document.getElementById("round-score").textContent = Math.round(score);
  
  totalScore += Math.round(score);
  document.getElementById("total-score").textContent = totalScore;

  // Show next round button
  document.getElementById("submit-guess").classList.add("hidden");
  document.getElementById("next-round").classList.remove("hidden");
  
  if (currentRound === 5) {
    document.getElementById("end-game").classList.remove("hidden");
  }

  // Fit map to show both markers
  const bounds = new google.maps.LatLngBounds();
  bounds.extend(userGuess);
  bounds.extend(actualLocation);
  map.fitBounds(bounds);
}

function calculateScore(guessedLocation) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(guessedLocation.lat() - actualLocation.lat);
  const dLng = toRad(guessedLocation.lng() - actualLocation.lng);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(actualLocation.lat)) * Math.cos(toRad(guessedLocation.lat())) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c * 1000; // Distance in meters

  let score = 5000;
  if (distance > 0) {
    score = Math.max(0, 5000 - (distance * 2)); // 2 points per meter penalty
  }
  return score;
}

function toRad(deg) {
  return deg * Math.PI / 180;
}

function toggleMap() {
  const mapWindow = document.getElementById("map-window");
  mapVisible = !mapVisible;
  mapWindow.style.display = mapVisible ? "block" : "none";
}

function endGame() {
  alert(`Game Over! Your total score is ${totalScore}/25000\n\nAverage: ${Math.round(totalScore/5)} points per round`);
  document.getElementById("game").classList.add("hidden");
  document.getElementById("loading-screen").classList.remove("hidden");
  initLoadingScreen();
}

// Make functions globally available
window.initLoadingScreen = initLoadingScreen;
window.startGame = startGame;
window.loadNextRound = loadNextRound;
window.submitGuess = submitGuess;
window.endGame = endGame;
window.toggleMap = toggleMap;