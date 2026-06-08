// Content script for scraping LinkedIn saved posts page

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
    background-color: #0a66c2;
    border-radius: 50%;
    animation: my-pulse 1.5s infinite;
  }
  @keyframes my-pulse {
    0% { transform: scale(0.9); opacity: 1; box-shadow: 0 0 0 0 rgba(10, 102, 194, 0.4); }
    70% { transform: scale(1); opacity: 0.8; box-shadow: 0 0 0 6px rgba(10, 102, 194, 0); }
    100% { transform: scale(0.9); opacity: 1; box-shadow: 0 0 0 0 rgba(10, 102, 194, 0); }
  }
`;

// State variables for the scraper
let isScraping = false;
let scrapedCount = 0;
let parsedIds = new Set();
let scrapedData = [];
let scrollAttempts = 0;
let lastScrollHeight = 0;
let isPremium = false;

// Inject panel styles once
function injectStyles() {
  if (!document.getElementById("myLinkedInSyncStyles")) {
    const styleEl = document.createElement("style");
    styleEl.id = "myLinkedInSyncStyles";
    styleEl.textContent = STYLE;
    document.head.appendChild(styleEl);
  }
}

// Check URL and manage sync panel visibility for LinkedIn Saved Posts
function checkPageAndInject() {
  const isSavedPostsPage = window.location.pathname.includes("/my-items/saved-posts");
  const existingPanel = document.getElementById("myLinkedInSyncPanel");

  if (isSavedPostsPage) {
    injectStyles();
    if (!existingPanel) {
      // Create temporary placeholder
      const placeholder = document.createElement("div");
      placeholder.id = "myLinkedInSyncPanel";
      placeholder.style.display = "none";
      document.body.appendChild(placeholder);
      
      chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
        const linked = response && response.linked;
        isPremium = response && response.premium;
        
        placeholder.remove();
        
        if (!document.getElementById("myLinkedInSyncPanel")) {
          const panel = document.createElement("div");
          panel.id = "myLinkedInSyncPanel";
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
          <h4 class="my-sync-title">LinkedIn Scraper</h4>
          <p class="my-sync-subtitle">Status: Extension Unlinked</p>
        </div>
      </div>
      <p class="my-sync-body">Please open your MyBookmarks dashboard page first to automatically link this extension.</p>
      <button class="my-sync-btn my-sync-btn-primary" id="openDashboardBtn">Open Dashboard</button>
    `;
    
    panel.querySelector("#openDashboardBtn").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
        const backendUrl = (response && response.backendUrl) || "http://127.0.0.1:5001";
        window.open(backendUrl, "_blank");
      });
    });
  } else {
    panel.innerHTML = `
      <div class="my-sync-header">
        <span class="my-sync-icon">🔗</span>
        <div>
          <h4 class="my-sync-title">LinkedIn Brain Sync</h4>
          <p class="my-sync-subtitle">Status: Connected <span class="my-sync-pulse"></span></p>
        </div>
      </div>
      <p class="my-sync-body" id="syncStatusText">Sync your LinkedIn saved posts. Scroll page to load more.</p>
      <div class="my-sync-progress-bar" id="syncProgressBar">
        <div class="my-sync-progress-fill" id="syncProgressFill"></div>
      </div>
      <div id="syncButtonContainer" style="width: 100%;">
        <button class="my-sync-btn my-sync-btn-primary" id="syncStartBtn">Sync LinkedIn Saved</button>
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
    isScraping = false;
    btn.disabled = true;
    btn.textContent = "Uploading...";
    statusText.textContent = `Stopping scraper... Processing ${scrapedData.length} items.`;
    await uploadScrapedData();
  } else {
    isScraping = true;
    scrapedCount = 0;
    parsedIds.clear();
    scrapedData = [];
    scrollAttempts = 0;
    lastScrollHeight = document.body.scrollHeight;

    btn.className = "my-sync-btn my-sync-btn-secondary";
    btn.textContent = "Stop & Save Sync";
    statusText.textContent = "Auto-scrolling saved posts...";
    progressBar.style.display = "block";
    progressFill.style.width = "0%";

    runScraperLoop();
  }
}

async function runScraperLoop() {
  if (!isScraping) return;

  const targetLimit = 2500; // Cap at 2500 stored items

  // 1. Find all saved post card containers in the DOM
  // LinkedIn uses .reusable-search__result-container, .entity-result__item, or feed update cards
  const postContainers = document.querySelectorAll(".entity-result, .reusable-search__result-container, .feed-shared-update-v2");
  let newAddedThisStep = 0;

  for (const container of postContainers) {
    try {
      const post = parseLinkedInPost(container);
      if (post && !parsedIds.has(post.id)) {
        parsedIds.add(post.id);
        scrapedData.push(post);
        newAddedThisStep++;
      }
    } catch (e) {
      console.warn("Failed to parse LinkedIn post element:", e);
    }
  }

  scrapedCount = scrapedData.length;
  const progressPercent = Math.min((scrapedCount / targetLimit) * 100, 100);
  
  const progressFill = document.getElementById("syncProgressFill");
  const statusText = document.getElementById("syncStatusText");
  
  if (progressFill) progressFill.style.width = `${progressPercent}%`;
  if (statusText) {
    statusText.textContent = `Scraped ${scrapedCount} saved posts. Scroll down to load more...`;
  }

  // 2. Stop conditions
  if (scrapedCount >= targetLimit) {
    isScraping = false;
    statusText.textContent = `Reached storage limit of ${targetLimit} posts. Uploading...`;
    await uploadScrapedData();
    return;
  }

  // 3. Scroll down to trigger lazy load
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise(resolve => setTimeout(resolve, 2000)); // Yield to network load

  // Check if we hit the bottom
  const currentHeight = document.body.scrollHeight;
  if (currentHeight === lastScrollHeight) {
    scrollAttempts++;
    if (scrollAttempts >= 3) {
      isScraping = false;
      statusText.textContent = `Finished scraping all posts. Found ${scrapedCount} items. Uploading...`;
      await uploadScrapedData();
      return;
    }
  } else {
    scrollAttempts = 0;
    lastScrollHeight = currentHeight;
  }

  runScraperLoop();
}

function parseLinkedInPost(container) {
  // Try to find a unique ID or activity URN
  let urn = container.getAttribute("data-urn") || container.getAttribute("data-activity-id");
  
  // If not found, try to locate update URN in links
  if (!urn) {
    const links = container.querySelectorAll("a");
    for (const a of links) {
      const href = a.href || "";
      const match = href.match(/urn:li:activity:(\d+)/) || href.match(/activity-(\d+)/);
      if (match) {
        urn = `urn:li:activity:${match[1]}`;
        break;
      }
    }
  }

  // Fallback to text content hash if no URN exists
  const textEl = container.querySelector(".entity-result__summary, .feed-shared-update-v2__description, .update-components-text, .feed-shared-text");
  const text = textEl ? textEl.innerText.trim() : "";
  if (!text) return null;

  const id = urn || "li_" + hashCode(text);

  // Author details
  const authorTitleEl = container.querySelector(".entity-result__title-text, .feed-shared-actor__title, .update-components-actor__title");
  let authorName = "LinkedIn User";
  let profileUrl = "https://www.linkedin.com";

  if (authorTitleEl) {
    const a = authorTitleEl.querySelector("a");
    if (a) {
      authorName = a.innerText.trim().split("\n")[0];
      profileUrl = a.href;
    } else {
      authorName = authorTitleEl.innerText.trim().split("\n")[0];
    }
  }

  // External URLs inside text
  const extractedUrls = extractUrls(text);

  // Likes count
  const likesEl = container.querySelector(".social-details-social-counts__reactions-count, .social-details-social-counts__social-action-insight");
  let likes = 0;
  if (likesEl) {
    const likesText = likesEl.innerText.replace(/[^\d]/g, "");
    if (likesText) likes = parseInt(likesText);
  }

  return {
    id: id,
    text: text,
    name: authorName,
    username: authorName.toLowerCase().replace(/\s+/g, ""),
    url: profileUrl,
    date: new Date().toISOString().substring(0, 10),
    likes: likes,
    retweets: 0,
    external_urls: extractedUrls
  };
}

function extractUrls(text) {
  const urlRegex = /https?:\/\/[^\s\)\],]+/g;
  const matches = text.match(urlRegex) || [];
  return matches.filter(url => !url.includes("linkedin.com"));
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function uploadScrapedData() {
  const btn = document.getElementById("syncStartBtn");
  const statusText = document.getElementById("syncStatusText");
  const container = document.getElementById("syncButtonContainer");

  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: "UPLOAD_DATA",
        endpoint: "/api/extension/sync-linkedin",
        payload: { bookmarks: scrapedData }
      }, (res) => resolve(res));
    });

    if (response && response.success) {
      statusText.textContent = `Sync completed! Uploaded ${scrapedCount} LinkedIn bookmarks.`;
      if (container) {
        container.innerHTML = `<button class="my-sync-btn my-sync-btn-primary" onclick="window.location.reload()">Sync Complete ✓</button>`;
      }
    } else {
      statusText.textContent = `Upload failed: ${response ? response.message : 'Unknown error'}`;
      renderResetButton(container);
    }
  } catch (e) {
    statusText.textContent = `Error uploading data: ${e.message}`;
    renderResetButton(container);
  }
}

function renderResetButton(container) {
  if (container) {
    container.innerHTML = `<button class="my-sync-btn my-sync-btn-primary" onclick="window.location.reload()">Retry Sync</button>`;
  }
}

// Initial setup and polling for single page app navigation
checkPageAndInject();

let lastUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    checkPageAndInject();
  }
}, 1000);
