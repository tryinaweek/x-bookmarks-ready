// Popup logic for Chrome Extension

async function updateUI() {
  const connectionBadge = document.getElementById("connectionBadge");
  const backendUrlSpan = document.getElementById("backendUrl");
  const instructionsText = document.getElementById("instructionsText");
  const actionBtn = document.getElementById("actionBtn");

  try {
    const data = await chrome.storage.local.get(["firebaseUid", "backendUrl"]);
    const linked = !!data.firebaseUid;
    const backendUrl = data.backendUrl || "http://127.0.0.1:5001";

    if (linked) {
      connectionBadge.className = "status-badge badge-linked";
      connectionBadge.textContent = "Linked";
      backendUrlSpan.textContent = backendUrl.replace(/^https?:\/\//, "");
      instructionsText.textContent = "Ready! Go to twitter.com/i/bookmarks and click the floating 'Sync Bookmarks' panel to synchronize your bookmarks.";
      actionBtn.href = backendUrl;
      actionBtn.textContent = "Go to Dashboard";
    } else {
      connectionBadge.className = "status-badge badge-unlinked";
      connectionBadge.textContent = "Unlinked";
      backendUrlSpan.textContent = "-";
      instructionsText.textContent = "Please log in to your dashboard at http://127.0.0.1:5001 (or your production Vercel app URL) to link this extension automatically.";
      actionBtn.href = backendUrl;
      actionBtn.textContent = "Open Dashboard";
    }
  } catch (err) {
    console.error("Failed to read storage:", err);
  }
}

// Run on popup open
document.addEventListener("DOMContentLoaded", updateUI);
