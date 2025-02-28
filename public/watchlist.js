
document.addEventListener('DOMContentLoaded', () => {
  // Check if in watchlist for all buttons
  checkWatchlistStatus();

  // Add event listeners for watchlist buttons
  document.querySelectorAll('.watchlist-btn').forEach(btn => {
    btn.addEventListener('click', toggleWatchlist);
  });

  // For remove buttons on the watchlist page
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', removeFromWatchlist);
  });
});

// Check which coins are in the watchlist and update buttons
async function checkWatchlistStatus() {
  try {
    const response = await fetch('/api/watchlist');
    const data = await response.json();
    
    // Update all watchlist buttons
    document.querySelectorAll('.watchlist-btn').forEach(btn => {
      const coinId = btn.getAttribute('data-id');
      if (data.watchlist.includes(coinId)) {
        btn.classList.add('in-watchlist');
      } else {
        btn.classList.remove('in-watchlist');
      }
    });
  } catch (error) {
    console.error('Error checking watchlist status:', error);
  }
}

// Toggle watchlist status for a coin
async function toggleWatchlist(e) {
  const button = e.currentTarget;
  const coinId = button.getAttribute('data-id');
  
  try {
    if (button.classList.contains('in-watchlist')) {
      // Remove from watchlist
      await fetch(`/api/watchlist/${coinId}`, {
        method: 'DELETE'
      });
      button.classList.remove('in-watchlist');
    } else {
      // Add to watchlist
      await fetch(`/api/watchlist/${coinId}`, {
        method: 'POST'
      });
      button.classList.add('in-watchlist');
    }
    
    // If on watchlist page and removing an item, reload the page
    if (window.location.pathname === '/watchlist' && button.classList.contains('remove-btn')) {
      window.location.reload();
    }
  } catch (error) {
    console.error('Error toggling watchlist:', error);
  }
}

// Remove from watchlist (used on watchlist page)
async function removeFromWatchlist(e) {
  const button = e.currentTarget;
  const coinId = button.getAttribute('data-id');
  
  try {
    await fetch(`/api/watchlist/${coinId}`, {
      method: 'DELETE'
    });
    
    // Animate removal of item
    const listItem = button.closest('.crypto-list-item');
    listItem.style.animation = 'fadeOut 0.3s forwards';
    
    // Remove after animation completes
    setTimeout(() => {
      listItem.remove();
      
      // If no items left, reload to show empty state
      if (document.querySelectorAll('.crypto-list-item').length === 0) {
        window.location.reload();
      }
    }, 300);
  } catch (error) {
    console.error('Error removing from watchlist:', error);
  }
}
