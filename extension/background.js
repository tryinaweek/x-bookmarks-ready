// Service worker for MyBookmarks Scraper Helper

// Listen for external messages from the Web Dashboard (e.g. to link credentials)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  (async () => {
    if (request.type === "SET_SESSION") {
      try {
        await chrome.storage.local.set({
          firebaseIdToken: request.firebaseIdToken,
          firebaseUid: request.firebaseUid,
          premium: !!request.premium,
          backendUrl: request.backendUrl || "http://127.0.0.1:5001"
        });
        sendResponse({ status: "success", message: "Successfully linked extension to account!" });
      } catch (err) {
        console.error("Failed to store credentials:", err);
        sendResponse({ status: "error", message: err.message });
      }
    } else {
      sendResponse({ status: "error", message: "Unknown message type" });
    }
  })();
  return true; // Keep message channel open for async response
});

// Listen for internal messages from Content Script or Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    if (request.type === "SET_SESSION") {
      try {
        await chrome.storage.local.set({
          firebaseIdToken: request.firebaseIdToken,
          firebaseUid: request.firebaseUid,
          premium: !!request.premium,
          backendUrl: request.backendUrl || "http://127.0.0.1:5001"
        });
        sendResponse({ status: "success", message: "Successfully linked extension to account!" });
      } catch (err) {
        console.error("Failed to store credentials:", err);
        sendResponse({ status: "error", message: err.message });
      }
    } else if (request.type === "UPLOAD_BOOKMARKS") {
      try {
        const credentials = await chrome.storage.local.get(["firebaseIdToken", "backendUrl"]);
        const token = credentials.firebaseIdToken;
        let backendUrl = credentials.backendUrl || "http://127.0.0.1:5001";
        
        if (!token) {
          sendResponse({ status: "error", message: "Not authenticated. Please log in to your dashboard first." });
          return;
        }

        // Clean up url trailing slash
        if (backendUrl.endsWith("/")) {
          backendUrl = backendUrl.slice(0, -1);
        }

        const response = await fetch(`${backendUrl}/api/extension/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ bookmarks: request.bookmarks })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Server returned ${response.status}: ${errText}`);
        }

        const data = await response.json();
        sendResponse({ status: "success", data, backendUrl });
      } catch (err) {
        console.error("Failed to upload bookmarks:", err);
        sendResponse({ status: "error", message: err.message });
      }
    } else if (request.type === "UPLOAD_TWEETS") {
      try {
        const credentials = await chrome.storage.local.get(["firebaseIdToken", "backendUrl"]);
        const token = credentials.firebaseIdToken;
        let backendUrl = credentials.backendUrl || "http://127.0.0.1:5001";
        
        if (!token) {
          sendResponse({ status: "error", message: "Not authenticated. Please log in to your dashboard first." });
          return;
        }

        if (backendUrl.endsWith("/")) {
          backendUrl = backendUrl.slice(0, -1);
        }

        const response = await fetch(`${backendUrl}/api/extension/sync-tweets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ tweets: request.tweets })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Server returned ${response.status}: ${errText}`);
        }

        const data = await response.json();
        sendResponse({ status: "success", data, backendUrl });
      } catch (err) {
        console.error("Failed to upload tweets:", err);
        sendResponse({ status: "error", message: err.message });
      }
    } else if (request.type === "GET_STATUS") {
      try {
        const credentials = await chrome.storage.local.get(["firebaseUid", "backendUrl", "premium"]);
        sendResponse({
          status: "success",
          linked: !!credentials.firebaseUid,
          premium: !!credentials.premium,
          backendUrl: credentials.backendUrl || "http://127.0.0.1:5001"
        });
      } catch (err) {
        sendResponse({ status: "error", message: err.message });
      }
    }
  })();
  return true; // Keep message channel open for async response
});
