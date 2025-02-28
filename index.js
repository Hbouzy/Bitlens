
const express = require("express");
const axios = require("axios");
const cron = require("node-cron");
const app = express();
const port = process.env.PORT || 3000;

// Configuration
const path = require("path");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage (replace with database in production)
let alerts = [];
let watchlist = [];
let nextAlertId = 1;

// API Helper
const coinGecko = {
  getMarketData: async (vs_currency = "gbp", per_page = 20, page = 1) => {
    try {
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/coins/markets",
        {
          params: { vs_currency, per_page, page, order: "market_cap_desc" },
        },
      );
      return response.data;
    } catch (error) {
      console.error("API Error:", error.message);
      return [];
    }
  },
  
  getTotalCoins: async () => {
    try {
      // This endpoint gets the list of all coins (just basic info)
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/coins/list"
      );
      return response.data.length;
    } catch (error) {
      console.error("API Error:", error.message);
      return 0;
    }
  },

  getHistoricalData: async (coinId, days = 7) => {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`,
        {
          params: { vs_currency: "gbp", days, interval: "daily" },
        },
      );
      return response.data.prices;
    } catch (error) {
      console.error("API Error:", error.message);
      return [];
    }
  },

  getNews: async () => {
    try {
      // CoinGecko no longer has a free news endpoint, using a mock news array instead
      return [
        {
          title: "Bitcoin Reaches New All-Time High",
          description: "Bitcoin has surpassed previous records as institutional adoption continues to grow.",
          author: "Crypto News",
          thumb_2x: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
          url: "https://www.coingecko.com/en/coins/bitcoin"
        },
        {
          title: "Ethereum Completes Major Network Upgrade",
          description: "The Ethereum network has successfully implemented its latest upgrade, promising improved scalability and reduced fees.",
          author: "Blockchain Times",
          thumb_2x: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
          url: "https://www.coingecko.com/en/coins/ethereum"
        },
        {
          title: "Regulators Announce New Crypto Framework",
          description: "Global financial regulators have proposed a new framework for cryptocurrency oversight and compliance.",
          author: "Crypto Regulatory News",
          thumb_2x: null,
          url: "https://www.coingecko.com"
        },
        {
          title: "DeFi Projects See Record Growth",
          description: "Decentralized finance projects are experiencing unprecedented growth as more users seek alternatives to traditional banking.",
          author: "DeFi Insider",
          thumb_2x: "https://assets.coingecko.com/coins/images/12972/large/defi.png",
          url: "https://www.coingecko.com/en/categories/defi"
        }
      ];
    } catch (error) {
      console.error("API Error:", error.message);
      return [];
    }
  },
};

// Routes
app.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = 20;
    const coins = await coinGecko.getMarketData("gbp", perPage, page);
    const totalCoins = await coinGecko.getTotalCoins();
    const totalPages = Math.ceil(totalCoins / perPage);
    
    res.render("index", { 
      coins,
      pagination: {
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Route Error:", error);
    res.status(500).render("error", { message: "Failed to load market data" });
  }
});

app.get("/search", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = 20;
    const coins = await coinGecko.getMarketData("gbp", perPage, page);
    const totalCoins = await coinGecko.getTotalCoins();
    const totalPages = Math.ceil(totalCoins / perPage);
    
    res.render("search", { 
      coins,
      pagination: {
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Route Error:", error);
    res.status(500).render("error", { message: "Search unavailable" });
  }
});

app.get("/alerts", (req, res) => res.render("alerts", { alerts }));
app.get("/watchlist", async (req, res) => {
  try {
    // If watchlist is empty, just render the empty watchlist page
    if (watchlist.length === 0) {
      return res.render("watchlist", { watchlist: [] });
    }
    
    // Get the latest data for all coins in the watchlist
    const allCoins = await coinGecko.getMarketData();
    const watchlistCoins = allCoins.filter(coin => watchlist.includes(coin.id));
    
    res.render("watchlist", { watchlist: watchlistCoins });
  } catch (error) {
    console.error("Watchlist Error:", error);
    res.status(500).render("error", { message: "Failed to load watchlist data" });
  }
});

// API endpoints for watchlist
app.post("/api/watchlist/:coinId", (req, res) => {
  const { coinId } = req.params;
  if (!watchlist.includes(coinId)) {
    watchlist.push(coinId);
  }
  res.json({ success: true, watchlist });
});

app.delete("/api/watchlist/:coinId", (req, res) => {
  const { coinId } = req.params;
  watchlist = watchlist.filter(id => id !== coinId);
  res.json({ success: true, watchlist });
});

app.get("/api/watchlist", (req, res) => {
  res.json({ watchlist });
});

// Alert API endpoints
app.get("/api/coins", async (req, res) => {
  try {
    const coins = await coinGecko.getMarketData();
    res.json(coins);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Failed to get coins" });
  }
});

app.post("/api/alerts", (req, res) => {
  try {
    const { coinId, coinName, condition, price, pushEnabled } = req.body;
    
    if (!coinId || !condition || !price) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Convert price to number to ensure consistency
    const priceValue = parseFloat(price);
    
    const newAlert = {
      id: nextAlertId++,
      coinId,
      coinName,
      condition,
      price: priceValue,
      pushEnabled: Boolean(pushEnabled),
      createdAt: new Date().toISOString(),
      lastChecked: null,
      currentPrice: null,
      triggered: false
    };
    
    alerts.push(newAlert);
    return res.status(201).json({ success: true, alert: newAlert });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Failed to create alert" });
  }
});

app.delete("/api/alerts/:id", (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    const initialLength = alerts.length;
    
    alerts = alerts.filter(alert => alert.id !== alertId);
    
    if (alerts.length === initialLength) {
      return res.status(404).json({ error: "Alert not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Failed to delete alert" });
  }
});
app.get("/news", async (req, res) => {
  try {
    const news = await coinGecko.getNews();
    res.render("news", { news });
  } catch (error) {
    res.status(500).render("error", { message: "News unavailable" });
  }
});

app.get("/chart/:coinId", async (req, res) => {
  try {
    const prices = await coinGecko.getHistoricalData(req.params.coinId);
    res.json({ prices });
  } catch (error) {
    res.status(500).json({ error: "Chart data unavailable" });
  }
});

// Alert Cron Job to check prices every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    const coins = await coinGecko.getMarketData();
    
    alerts = alerts.map(alert => {
      const coin = coins.find(c => c.id === alert.coinId);
      const currentPrice = coin?.current_price;
      
      // If no price data is available, just update lastChecked
      if (!currentPrice) {
        return { ...alert, lastChecked: new Date() };
      }
      
      let triggered = false;
      
      // Check if alert condition is met
      if (alert.condition === 'above' && currentPrice > alert.price) {
        triggered = true;
      } else if (alert.condition === 'below' && currentPrice < alert.price) {
        triggered = true;
      }
      
      // If alert is newly triggered, log it
      if (triggered && !alert.triggered) {
        console.log(`ALERT TRIGGERED: ${alert.coinName} is ${alert.condition} ${alert.price}£ (Current: ${currentPrice}£)`);
        
        // In a production app, this is where you would send push notifications
        // to the user's mobile device using a service like Firebase Cloud Messaging
      }
      
      return {
        ...alert,
        currentPrice,
        lastChecked: new Date(),
        triggered
      };
    });
    
    console.log(`Checked ${alerts.length} alerts`);
  } catch (error) {
    console.error("Error checking alerts:", error);
  }
});

// Catch-all route to handle client-side routing
app.get('*', (req, res, next) => {
  // Only handle HTML requests, not API requests
  if (!req.path.startsWith('/api/') && req.accepts('html')) {
    res.render("index");
  } else {
    next();
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  
  // Convert error to string to ensure it can be properly processed
  const errorMessage = typeof err === 'object' ? 
    (err.message || 'Internal Server Error') : 
    String(err);
  
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(500).json({ error: errorMessage });
  }
  
  try {
    res.status(500).render("error", { message: errorMessage || "Something went wrong" });
  } catch (renderError) {
    console.error("Error rendering error page:", renderError);
    res.status(500).send("Internal Server Error: " + errorMessage);
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, "0.0.0.0", () => console.log(`Server running on port ${port} (0.0.0.0)`));
}

// For Vercel, we need to export the Express app
module.exports = app;
