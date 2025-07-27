let currentUser = null;

// Initialize auth state listener when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Wait for Firebase to be initialized
  setTimeout(initAuthStateListener, 1000);
});

function initAuthStateListener() {
  // Check if Firebase is loaded
  if (typeof window.auth === 'undefined') {
    console.log('Firebase not loaded yet, retrying...');
    setTimeout(initAuthStateListener, 500);
    return;
  }

  // Listen for authentication state changes
  window.onAuthStateChanged(window.auth, (user) => {
    currentUser = user;
    if (user) {
      console.log('User signed in:', user.displayName);
      showUserInfo(user);
    } else {
      console.log('User signed out');
      showSignInButton();
    }
  });
}

// Real sign in function
async function signInUser() {
  const signInBtn = document.getElementById('sign-in-btn');
  const authLoading = document.getElementById('auth-loading');
  
  if (!signInBtn || !authLoading) {
    console.error('Sign in elements not found');
    return;
  }

  signInBtn.classList.add('hidden');
  authLoading.classList.remove('hidden');
  
  try {
    // Check if Firebase is loaded
    if (!window.auth || !window.googleProvider || !window.signInWithPopup) {
      throw new Error('Firebase not initialized');
    }

    console.log('Attempting to sign in with Google...');
    const result = await window.signInWithPopup(window.auth, window.googleProvider);
    const user = result.user;
    
    console.log('Sign in successful:', user.displayName);
    
    // User info will be shown automatically by the auth state listener
    // But we can also call it directly to ensure immediate update
    showUserInfo(user);
    
  } catch (error) {
    console.error('Sign in error:', error);
    
    // Show user-friendly error messages
    let errorMessage = 'Sign in failed. Please try again.';
    
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        errorMessage = 'Sign in was cancelled.';
        break;
      case 'auth/popup-blocked':
        errorMessage = 'Popup was blocked. Please allow popups and try again.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your connection.';
        break;
      default:
        errorMessage = `Sign in failed: ${error.message}`;
    }
    
    alert(errorMessage);
    
    // Reset UI
    authLoading.classList.add('hidden');
    signInBtn.classList.remove('hidden');
  }
}

// Real sign out function
async function signOutUser() {
  try {
    if (!window.auth || !window.signOut) {
      throw new Error('Firebase not initialized');
    }

    console.log('Signing out...');
    await window.signOut(window.auth);
    
    // UI will be updated automatically by the auth state listener
    showSignInButton();
    
    console.log('Sign out successful');
    
  } catch (error) {
    console.error('Sign out error:', error);
    alert('Sign out failed. Please try again.');
  }
}

// Show user info when signed in
function showUserInfo(user) {
  const signInBtn = document.getElementById('sign-in-btn');
  const authLoading = document.getElementById('auth-loading');
  const userInfo = document.getElementById('user-info');
  const userName = document.getElementById('user-name');
  const userAvatar = document.getElementById('user-avatar');
  
  if (!userInfo || !userName || !userAvatar) {
    console.error('User info elements not found');
    return;
  }

  // Hide sign in button and loading
  if (signInBtn) signInBtn.classList.add('hidden');
  if (authLoading) authLoading.classList.add('hidden');
  
  // Show user info
  userInfo.classList.remove('hidden');
  userName.textContent = user.displayName || 'Anonymous';
  userAvatar.src = user.photoURL || 'https://via.placeholder.com/32/9ca3af/ffffff?text=?';
  userAvatar.alt = user.displayName || 'User Avatar';
  
  // Store user data globally for game use
  currentUser = user;
}

// Show sign in button when signed out
function showSignInButton() {
  const signInBtn = document.getElementById('sign-in-btn');
  const authLoading = document.getElementById('auth-loading');
  const userInfo = document.getElementById('user-info');
  
  if (signInBtn) signInBtn.classList.remove('hidden');
  if (authLoading) authLoading.classList.add('hidden');
  if (userInfo) userInfo.classList.add('hidden');
  
  // Clear user data
  currentUser = null;
}

// Enhanced leaderboard function with Firebase integration
async function showLeaderboard() {
  const leaderboardBtn = document.getElementById('leaderboard-btn');
  
  // Show loading state
  if (leaderboardBtn) {
    leaderboardBtn.innerHTML = '<div class="loading-spinner"></div>Loading...';
    leaderboardBtn.disabled = true;
  }
  
  try {
    let scores = [];
    
    // Fetch scores from Firebase
    if (window.db && window.getDocs && window.collection && window.query && window.orderBy && window.limit) {
      console.log('Fetching leaderboard from Firebase...');
      
      const q = window.query(
        window.collection(window.db, 'scores'),
        window.where('gameMode', '==', 'uplb'),
        window.orderBy('score', 'desc'),
        window.limit(10)
      );
      
      const querySnapshot = await window.getDocs(q);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        scores.push({
          playerName: data.playerName || 'Anonymous',
          score: data.score || 0,
          timestamp: data.timestamp
        });
      });
      
      console.log('Fetched scores:', scores);
    }
    
    // Display leaderboard with scores or empty message
    displayLeaderboard(scores);
    
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    
    // Show empty leaderboard on error
    displayLeaderboard([]);
    
  } finally {
    // Reset button state
    if (leaderboardBtn) {
      leaderboardBtn.innerHTML = '🏆 Leaderboard';
      leaderboardBtn.disabled = false;
    }
  }
}

// Function to save score after game completion
async function saveGameScore(finalScore, gameMode = 'uplb') {
  if (!currentUser) {
    console.log('No user signed in, cannot save score');
    return false;
  }
  
  try {
    if (!window.db || !window.collection || !window.doc || !window.getDoc || !window.setDoc) {
      throw new Error('Firebase Firestore not initialized');
    }

    const scoreRef = window.doc(window.collection(window.db, 'scores'), `${currentUser.uid}_${gameMode}`);
    const scoreDoc = await window.getDoc(scoreRef);
    const scoreData = {
      userId: currentUser.uid,
      playerName: currentUser.displayName || 'Anonymous',
      score: finalScore,
      gameMode: gameMode,
      timestamp: new Date(),
      rounds: 5
    };

    if (scoreDoc.exists()) {
      const existingScore = scoreDoc.data().score;
      if (finalScore > existingScore) {
        console.log(`Updating score for ${currentUser.displayName}: ${existingScore} -> ${finalScore}`);
        await window.setDoc(scoreRef, scoreData);
        console.log('Score updated successfully');
      } else {
        console.log(`New score (${finalScore}) not higher than existing (${existingScore}), skipping update`);
        return false;
      }
    } else {
      console.log('Saving new score:', scoreData);
      await window.setDoc(scoreRef, scoreData);
      console.log('Score saved successfully');
    }
    
    return true;
    
  } catch (error) {
    console.error('Error saving score:', error);
    return false;
  }
}

// Enhanced end game function with score saving
async function endGame() {
  let message = `Game Over! Your total score is ${totalScore}/25000\n`;
  message += `Average: ${Math.round(totalScore/5)} points per round\n\n`;
  
  // Try to save score if user is signed in
  if (currentUser) {
    message += 'Saving your score...\n';
    const saved = await saveGameScore(totalScore, 'uplb');
    
    if (saved) {
      message += '✅ Score saved to leaderboard!\n';
    } else {
      message += '❌ Failed to save score.\n';
    }
  } else {
    message += '💡 Sign in to save your score to the leaderboard!\n';
  }
  
  message += '\nWould you like to view the leaderboard?';
  
  if (confirm(message)) {
    await showLeaderboard();
  }
  
  // Reset game
  document.getElementById("game").classList.add("hidden");
  document.getElementById("loading-screen").classList.remove("hidden");
  initLoadingScreen();
}

// Display leaderboard modal
function displayLeaderboard(scores) {
  let scoresHTML = '';
  
  if (scores.length === 0) {
    scoresHTML = `
      <div class="score-entry">
        <span class="player-name">No one in the leaderboard yet</span>
      </div>
    `;
  } else {
    scoresHTML = scores.map((score, index) => {
      const rank = index + 1;
      const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
      const isCurrentUser = currentUser && score.playerName === currentUser.displayName;
      return `
        <div class="score-entry ${isCurrentUser ? 'current-user' : ''}">
          <div style="display: flex; align-items: center;">
            <span class="rank-emoji">${emoji}</span>
            <span class="player-name">${score.playerName}${isCurrentUser ? ' (You)' : ''}</span>
          </div>
          <span class="player-score">${score.score.toLocaleString()}</span>
        </div>
      `;
    }).join('');
  }
  
  const modalHTML = `
    <div class="leaderboard-modal" id="leaderboard-modal">
      <div class="leaderboard-content">
        <h2 class="leaderboard-title">🏆 Top Iskos</h2>
        <div class="scores-list">
          ${scoresHTML}
        </div>
        <button onclick="closeLeaderboard()" class="close-modal-btn">
          Close
        </button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeLeaderboard() {
  const modal = document.getElementById('leaderboard-modal');
  if (modal) {
    modal.remove();
  }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('leaderboard-modal')) {
    closeLeaderboard();
  }
});

// Utility function to check if user is signed in
function isUserSignedIn() {
  return currentUser !== null;
}

// Utility function to get current user
function getCurrentUser() {
  return currentUser;
}
