// Content script injected on the dashboard page
// Serves as a bridge to send Firebase Auth credentials to the background worker

window.addEventListener("message", (event) => {
  // Only accept messages from the same window origin
  if (event.source !== window) return;

  if (event.data && event.data.type === "MY_BOOKMARKS_AUTH") {
    const { token, uid } = event.data;
    if (token && uid) {
      chrome.runtime.sendMessage({
        type: "SET_SESSION",
        firebaseIdToken: token,
        firebaseUid: uid,
        backendUrl: window.location.origin
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log("Extension connection error:", chrome.runtime.lastError.message);
        } else if (response && response.status === "success") {
          console.log("MyBookmarks Extension successfully linked via dashboard bridge!");
        }
      });
    }
  }
});
