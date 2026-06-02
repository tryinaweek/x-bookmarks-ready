// Content script for scraping Twitter/X bookmarks page

// Injected styling for premium UI elements
const STYLE = `
  .my-sync-panel {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(229, 231, 235, 0.5);
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    padding: 16px;
    width: 280px;
    box-sizing: border-box;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .my-sync-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .my-sync-icon {
    font-size: 20px;
  }
  .my-sync-title {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }
  .my-sync-subtitle {
    font-size: 11px;
    color: #6b7280;
    margin: 0;
  }
  .my-sync-body {
    font-size: 13px;
    color: #374151;
    margin-bottom: 12px;
    line-height: 1.4;
  }
  .my-sync-btn {
    width: 100%;
    border: none;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.2s ease;
  }
  .my-sync-btn-primary {
    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
  }
  .my-sync-btn-primary:hover {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    transform: translateY(-1px);
  }
  .my-sync-btn-secondary {
    background: #ef4444;
    color: #ffffff;
  }
  .my-sync-btn-secondary:hover {
    background: #dc2626;
  }
  .my-sync-progress-bar {
    width: 100%;
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 8px;
    display: none;
  }
  .my-sync-progress-fill {
    height: 100%;
    width: 0%;
    background: #7c3aed;
    transition: width 0.3s ease;
  }
  .my-sync-pulse {
    display: inline-block;
    width: 8px;
    height: 8px;
    background-color: #10b981;
    border-radius: 50%;
    animation: my-pulse 1.5s infinite;
  }
  @keyframes my-pulse {
    0% { transform: scale(0.9); opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
    70% { transform: scale(1); opacity: 0.8; box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
    100% { transform: scale(0.9); opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }
`;

// State variables for the scraper
let isScraping = false;
let scrapedCount = 0;
let parsedIds = new Set();
let scrapedData = [];
let scrollAttempts = 0;
let lastScrollHeight = 0;

// Inject panel styles once
function injectStyles() {
  if (!document.getElementById("myBookmarksSyncStyles")) {
    const styleEl = document.createElement("style");
    styleEl.id = "myBookmarksSyncStyles";
    styleEl.textContent = STYLE;
    document.head.appendChild(styleEl);
  }
}

// Check URL and manage sync panel visibility for Twitter SPA
function checkPageAndInject() {
  const isBookmarksPage = window.location.pathname === "/i/bookmarks" || window.location.pathname.startsWith("/i/bookmarks");
  const existingPanel = document.getElementById("myBookmarksSyncPanel");

  if (isBookmarksPage) {
    injectStyles();
    if (!existingPanel) {
      // Create a temporary placeholder to prevent double calls while checking status async
      const placeholder = document.createElement("div");
      placeholder.id = "myBookmarksSyncPanel";
      placeholder.style.display = "none";
      document.body.appendChild(placeholder);
      
      chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
        const linked = response && response.linked;
        
        // Remove placeholder and render actual panel
        placeholder.remove();
        
        if (!document.getElementById("myBookmarksSyncPanel")) {
          const panel = document.createElement("div");
          panel.id = "myBookmarksSyncPanel";
          panel.className = "my-sync-panel";
          renderInitialState(panel, linked);
          document.body.appendChild(panel);
        }
      });
    } else {
      existingPanel.style.display = "block";
    }
  } else {
    if (existingPanel) {
      existingPanel.style.display = "none";
    }
  }
}

function renderInitialState(panel, linked) {
  if (!linked) {
    panel.innerHTML = `
      <div class="my-sync-header">
        <span class="my-sync-icon">⚠️</span>
        <div>
          <h4 class="my-sync-title">Bookmarks Scraper</h4>
          <p class="my-sync-subtitle">Status: Extension Unlinked</p>
        </div>
      </div>
      <p class="my-sync-body">Please open your MyBookmarks dashboard page first to automatically link this extension.</p>
      <button class="my-sync-btn my-sync-btn-primary" onclick="window.open('http://127.0.0.1:5001', '_blank')">Open Dashboard</button>
    `;
  } else {
    panel.innerHTML = `
      <div class="my-sync-header">
        <span class="my-sync-icon">🔌</span>
        <div>
          <h4 class="my-sync-title">MyBookmarks Ready</h4>
          <p class="my-sync-subtitle">Status: Connected <span class="my-sync-pulse"></span></p>
        </div>
      </div>
      <p class="my-sync-body" id="syncStatusText">Sync your Twitter/X bookmarks locally. Scroll page to load more.</p>
      <div class="my-sync-progress-bar" id="syncProgressBar">
        <div class="my-sync-progress-fill" id="syncProgressFill"></div>
      </div>
      <div id="syncButtonContainer" style="width: 100%;">
        <button class="my-sync-btn my-sync-btn-primary" id="syncStartBtn">Sync Bookmarks</button>
      </div>
    `;

    panel.querySelector("#syncStartBtn").addEventListener("click", toggleScraping);
  }
}

async function toggleScraping() {
  const btn = document.getElementById("syncStartBtn");
  const statusText = document.getElementById("syncStatusText");
  const progressBar = document.getElementById("syncProgressBar");
  const progressFill = document.getElementById("syncProgressFill");

  if (isScraping) {
    // Stop scraping and upload what we have
    isScraping = false;
    btn.disabled = true;
    btn.textContent = "Uploading...";
    statusText.textContent = `Stopping scraper... Processing ${scrapedData.length} items.`;
    await uploadScrapedBookmarks();
  } else {
    // Start scraping
    isScraping = true;
    scrapedCount = 0;
    parsedIds.clear();
    scrapedData = [];
    scrollAttempts = 0;
    lastScrollHeight = document.body.scrollHeight;

    btn.className = "my-sync-btn my-sync-btn-secondary";
    btn.textContent = "Stop & Save Sync";
    statusText.textContent = "Auto-scrolling bookmarks list...";
    progressBar.style.display = "block";
    progressFill.style.width = "0%";

    runScraperLoop();
  }
}

// Scraper Loop using yielding scroll steps
async function runScraperLoop() {
  if (!isScraping) return;

  // 1. Scrape currently visible tweets
  const articles = document.querySelectorAll("article");
  let newAddedThisStep = 0;

  for (const article of articles) {
    try {
      const tweet = parseTweet(article);
      if (tweet && !parsedIds.has(tweet.id)) {
        parsedIds.add(tweet.id);
        scrapedData.push(tweet);
        newAddedThisStep++;
      }
    } catch (e) {
      console.warn("Failed to parse article:", e);
    }
  }

  scrapedCount = scrapedData.length;
  document.getElementById("syncStatusText").textContent = `Syncing bookmarks: ${scrapedCount} loaded...`;
  
  // Simple visual animation for progress
  const progressPercent = Math.min((scrapedCount / 100) * 100, 100);
  document.getElementById("syncProgressFill").style.width = `${progressPercent}%`;

  // 2. Scroll page to trigger pagination
  window.scrollTo(0, document.body.scrollHeight);
  
  // Yield to allow rendering and browser paint
  await new Promise(r => setTimeout(r, 1500));

  const currentHeight = document.body.scrollHeight;
  if (currentHeight === lastScrollHeight && newAddedThisStep === 0) {
    scrollAttempts++;
  } else {
    scrollAttempts = 0;
    lastScrollHeight = currentHeight;
  }

  // 3. Check termination conditions (no new heights or items for 5 retries, or reached bottom)
  if (scrollAttempts >= 5) {
    isScraping = false;
    const btn = document.getElementById("syncStartBtn");
    btn.disabled = true;
    btn.textContent = "Uploading...";
    document.getElementById("syncStatusText").textContent = `Reached end! Syncing ${scrapedCount} items...`;
    await uploadScrapedBookmarks();
  } else {
    // Keep looping
    runScraperLoop();
  }
}

// Upload parsed payload to extension background (which forwards to local backend)
function resetPanelToConnectedState() {
  const panel = document.getElementById("myBookmarksSyncPanel");
  if (panel) {
    renderInitialState(panel, true);
  }
}

async function uploadScrapedBookmarks() {
  const statusText = document.getElementById("syncStatusText");
  const container = document.getElementById("syncButtonContainer");
  const progressBar = document.getElementById("syncProgressBar");
  if (progressBar) progressBar.style.display = "none";

  chrome.runtime.sendMessage({
    type: "UPLOAD_BOOKMARKS",
    bookmarks: scrapedData
  }, (response) => {
    if (response && response.status === "success") {
      const data = response.data;
      const backendUrl = response.backendUrl || "http://127.0.0.1:5001";
      statusText.innerHTML = `✅ Successfully synced ${data.count} bookmarks! (Total: ${data.total}).`;
      
      if (container) {
        container.innerHTML = `
          <div style="display: flex; gap: 8px; width: 100%; margin-top: 8px;">
            <button id="goToDashboardBtn" class="my-sync-btn my-sync-btn-primary" style="flex: 2; padding: 10px 0;">Go to Dashboard</button>
            <button id="syncAgainBtn" class="my-sync-btn" style="flex: 1.2; background: #e5e7eb; color: #374151; font-weight: 600; border: 1px solid #d1d5db; padding: 10px 0; font-size: 11px;">Sync Again</button>
          </div>
        `;
        
        container.querySelector("#goToDashboardBtn").addEventListener("click", () => {
          window.open(backendUrl, "_blank");
        });
        
        container.querySelector("#syncAgainBtn").addEventListener("click", () => {
          resetPanelToConnectedState();
        });
      }
    } else {
      const errorMsg = (response && response.message) || "Connection error uploading data.";
      statusText.innerHTML = `❌ Error: ${errorMsg}`;
      console.error("Sync failed:", response);
      
      if (container) {
        container.innerHTML = `
          <button class="my-sync-btn my-sync-btn-primary" id="syncStartBtn">Sync Bookmarks</button>
        `;
        container.querySelector("#syncStartBtn").addEventListener("click", toggleScraping);
      }
    }
  });
}

// Twitter DOM tweet parser
function parseTweet(article) {
  // Find tweet URL and metadata
  const links = article.querySelectorAll("a");
  let statusUrl = "";
  let tweetId = "";
  let username = "";
  
  for (const link of links) {
    const href = link.getAttribute("href");
    if (href && href.includes("/status/")) {
      const parts = href.split("/");
      const statusIdx = parts.indexOf("status");
      if (statusIdx !== -1 && parts[statusIdx + 1]) {
        username = parts[statusIdx - 1];
        tweetId = parts[statusIdx + 1];
        statusUrl = `https://x.com/${username}/status/${tweetId}`;
        break;
      }
    }
  }
  
  if (!tweetId) return null;

  // Extract Text content
  const textEl = article.querySelector('[data-testid="tweetText"]');
  const text = textEl ? textEl.innerText : "";

  // Extract display name
  const nameEl = article.querySelector('[data-testid="User-Name"]');
  let name = username;
  if (nameEl) {
    const textContent = nameEl.innerText || "";
    const namePart = textContent.split("\n")[0];
    if (namePart) {
      name = namePart.trim();
    }
  }

  // Extract timestamp (Twitter stores full ISO format in <time datetime="...">)
  const timeEl = article.querySelector("time");
  const dateStr = timeEl ? timeEl.getAttribute("datetime") : new Date().toISOString();
  const date = dateStr.slice(0, 10); // YYYY-MM-DD

  // Parse Likes & Retweets counts from ARIA labels
  let likes = 0;
  let retweets = 0;

  const likeEl = article.querySelector('[data-testid="like"], [aria-label*="like"]');
  if (likeEl) {
    const label = likeEl.getAttribute("aria-label") || "";
    const match = label.match(/(\d+)/);
    if (match) likes = parseInt(match[1]);
  }

  const rtEl = article.querySelector('[data-testid="retweet"], [aria-label*="retweet"]');
  if (rtEl) {
    const label = rtEl.getAttribute("aria-label") || "";
    const match = label.match(/(\d+)/);
    if (match) retweets = parseInt(match[1]);
  }

  return {
    id: tweetId,
    text: text,
    name: name,
    username: username,
    date: date,
    likes: likes,
    retweets: retweets,
    url: statusUrl
  };
}

// Listen for React SPA dynamic navigation changes
let lastUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    checkPageAndInject();
  }
}, 1000);

// Run check on initial script inject
checkPageAndInject();
