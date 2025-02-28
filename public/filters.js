document.addEventListener('DOMContentLoaded', () => {
  console.log("Filters.js loaded");
  
  // Log filter elements to verify they exist
  console.log("Search input:", document.getElementById('searchInput'));
  console.log("Price filter:", document.getElementById('priceFilter'));
  console.log("Market cap filter:", document.getElementById('marketCapFilter'));
  console.log("Market cap category:", document.getElementById('marketCapCategory'));
  console.log("Price change filter:", document.getElementById('priceChangeFilter'));
  
  // Optimize layout for small screens
  const adjustForMobile = () => {
    // iPhone detection (most iPhone models are 375-428px wide)
    const isIPhone = window.innerWidth <= 428 && window.innerWidth >= 320;

    if (window.innerWidth <= 480) {
      const priceValue = document.getElementById('priceValue');
      if (priceValue) {
        const maxPrice = parseFloat(document.getElementById('priceFilter').value);
        priceValue.textContent = '£' + maxPrice.toLocaleString();
      }

      // Apply specific iPhone tweaks
      if (isIPhone) {
        // Further optimize for iPhone if needed
        document.querySelectorAll('.btn').forEach(btn => {
          btn.classList.add('iphone-sized');
        });
      }
    }
  };

  window.addEventListener('resize', adjustForMobile);
  adjustForMobile();
    // Search by Name/Symbol Functionality
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');

    if (searchInput && searchButton) {
        // Search when button is clicked
        searchButton.addEventListener('click', performSearch);

        // Also search when Enter key is pressed in the input
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        function performSearch() {
            const searchTerm = searchInput.value.toLowerCase();
            document.querySelectorAll('.coin-card').forEach(card => {
                const coinName = card.querySelector('h3').textContent.toLowerCase();
                if (searchTerm === '' || coinName.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    }

    // Price Filter
    const priceFilter = document.getElementById('priceFilter');
    const priceValue = document.getElementById('priceValue');

    if (priceFilter) {
        priceFilter.addEventListener('input', (e) => {
            const maxPrice = parseFloat(e.target.value);
            if (priceValue) {
                priceValue.textContent = '£' + maxPrice.toLocaleString();
            }

            document.querySelectorAll('.coin-card').forEach(card => {
                const price = parseFloat(card.querySelector('p').textContent.replace('$', '').replace(/,/g, ''));
                if (card.style.display !== 'none' || price <= maxPrice) {
                    card.style.display = price <= maxPrice ? 'block' : 'none';
                }
            });
        });
    }

    // Market Cap Filter
    const marketCapFilter = document.getElementById('marketCapFilter');
    const marketCapValue = document.getElementById('marketCapValue');

    if (marketCapFilter) {
        marketCapFilter.addEventListener('input', (e) => {
            const minMarketCap = parseFloat(e.target.value);
            if (marketCapValue) {
                marketCapValue.textContent = '$' + minMarketCap.toLocaleString();
            }

            applyAllFilters();
        });
    }

    // Market Cap Category Filter
    const marketCapCategoryFilter = document.getElementById('marketCapCategory');
    if (marketCapCategoryFilter) {
        marketCapCategoryFilter.addEventListener('change', applyAllFilters);
    }

    // 24h Price Change Filter
    const priceChangeFilter = document.getElementById('priceChangeFilter');
    if (priceChangeFilter) {
        priceChangeFilter.addEventListener('change', applyAllFilters);
    }

    // Apply all filters at once to avoid conflicts
    function applyAllFilters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const maxPrice = parseFloat(document.getElementById('priceFilter').value);
        const minMarketCap = parseFloat(document.getElementById('marketCapFilter').value);
        const marketCapCategory = document.getElementById('marketCapCategory').value;
        const priceChangeFilter = document.getElementById('priceChangeFilter').value;

        document.querySelectorAll('.coin-card').forEach(card => {
            const coinName = card.querySelector('h3').textContent.toLowerCase();
            const price = parseFloat(card.querySelector('.price').textContent.replace('£', '').replace(/,/g, ''));
            const marketCap = parseFloat(card.dataset.marketCap);
            const priceChange = parseFloat(card.dataset.priceChange);

            // Name search filter
            const matchesSearch = searchTerm === '' || coinName.includes(searchTerm);
            
            // Price filter
            const matchesPrice = price <= maxPrice;
            
            // Minimum market cap filter
            const matchesMinMarketCap = marketCap >= minMarketCap;
            
            // Market cap category filter
            let matchesMarketCapCategory = true;
            if (marketCapCategory !== 'all') {
                if (marketCapCategory === 'large') {
                    matchesMarketCapCategory = marketCap >= 10000000000; // $10B
                } else if (marketCapCategory === 'medium') {
                    matchesMarketCapCategory = marketCap >= 1000000000 && marketCap < 10000000000; // $1B-$10B
                } else if (marketCapCategory === 'small') {
                    matchesMarketCapCategory = marketCap >= 100000000 && marketCap < 1000000000; // $100M-$1B
                } else if (marketCapCategory === 'micro') {
                    matchesMarketCapCategory = marketCap < 100000000; // <$100M
                }
            }
            
            // Price change filter
            let matchesPriceChange = true;
            if (priceChangeFilter !== 'all') {
                if (priceChangeFilter === 'positive') {
                    matchesPriceChange = priceChange > 0;
                } else if (priceChangeFilter === 'negative') {
                    matchesPriceChange = priceChange < 0;
                } else if (priceChangeFilter === 'major-gain') {
                    matchesPriceChange = priceChange > 5;
                } else if (priceChangeFilter === 'major-loss') {
                    matchesPriceChange = priceChange < -5;
                }
            }
            
            // Apply all filters
            const shouldDisplay = matchesSearch && matchesPrice && matchesMinMarketCap && 
                                 matchesMarketCapCategory && matchesPriceChange;
            
            card.style.display = shouldDisplay ? 'block' : 'none';
        });
    }
});