# Chrome Web Store Listing — X-Port: AI Bookmark Sync

> Last Updated: 2026-06-02

## Store Listing

**Extension Name**  
X-Port: AI Bookmark Sync

**Short Description**  
Sync your X/Twitter Bookmarks directly to your MyBookmarks dashboard in one click without developer API keys.

**Detailed Description**  
Save bookmarks on X/Twitter and instantly organize them with AI. 

Most people save hundreds of bookmarks into folders and never visit them again. **X-Port** is the Chrome extension companion that breaks this cycle. It lets you import all your scattered bookmarks into your personal MyBookmarks workspace with a single click—no expensive developer API keys required.

Once imported, our AI-powered dashboard parses your bookmarks, automatically grouping them into clear categories, mapping your learning interests over a visual timeline, and flagging stale or dead links to help you keep your digital space clean. Most importantly, it serves as a content engine: it repurposes the knowledge inside your saved bookmarks into fresh tweet ideas, allowing you to compose and publish tweets directly back to X from your dashboard.

Key Features:
- Direct DOM parsing of your saved Twitter/X bookmarks page.
- Smart auto-scrolling to capture items in bulk.
- Seamless authentication matching: links to your active MyBookmarks account automatically.
- No storage of passwords: uses secure Firebase JWT tokens for authentication.

How to Use:
1. Log in to your personal dashboard on the MyBookmarks web app.
2. Install this extension.
3. Open your bookmarks page at x.com/i/bookmarks or twitter.com/i/bookmarks.
4. Click the "Sync Bookmarks" button in the bottom-right panel to begin downloading and importing.

Privacy Note:
Your bookmarks data is processed entirely in your browser and sent directly to your personal web app database. We do not host central databases for your bookmarks, nor do we track your activity.

**Category**  
Productivity

**Single Purpose**  
Syncs your X/Twitter Bookmarks to your personal dashboard.

**Primary Language**  
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ⬜ Not created | Chrome Web Store default icon is used if omitted |
| Screenshot 1 | 1280×800 or 640×400 | ⬜ Not created | *Capture the Twitter Bookmarks page with the floating sync panel* |
| Screenshot 2 | 1280×800 or 640×400 | ⬜ Not created | *Capture the popup displaying the Linked status status* |

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Required to store the Firebase ID Token and database configurations locally on the browser to authenticate API calls to the server. |
| `https://twitter.com/*` | host_permissions | Required to inject the sync panel and run the DOM crawler on the Twitter bookmarks page. |
| `https://x.com/*` | host_permissions | Required to inject the sync panel and run the DOM crawler on the X bookmarks page. |

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Authentication info | Yes | Yes (to the user's dashboard) | Used to authenticate and authorize bookmark imports into Firestore. | No |
| Personal communications (Tweets) | Yes | Yes (to the user's dashboard) | Scrapes bookmarks data (text, user, link) to populate the user's personal archive. | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL**  
`https://github.com/tryinaweek/x-bookmark-exporter/blob/main/PRIVACY.md` *(or your custom domain url)*

---

## Distribution

**Visibility**: Public (or Unlisted if only shared with private beta testers)  
**Regions**: All regions  
**Pricing**: Free

---

## Developer Info

** publisher Name**  
*Your Name / Organization Name*

**Contact Email**  
*Your Email Address*

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-06-02 | Initial release supporting local DOM scraping on X/Twitter and direct Vercel API syncing. | Draft |
