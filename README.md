# FullSnap

**FullSnap** is a lightweight, privacy-first **Chrome Manifest V3** extension for capturing seamless, high-resolution **full-page** and **visible-area** screenshots as PNG or JPEG.

Unlike basic scrolling screenshot tools that break on modern SPAs or full-screen modals, FullSnap automatically detects active inner scrollable containers, hides repeating sticky/fixed bars, and aligns consecutive frames pixel-by-pixel for clean stitching—even under smooth scrolling or 125% display scaling.

## Features

- **Full-Page & Visible-Area Capture:** Capture an entire scrolling page or just the current viewport in one click.
- **Pixel-Accurate Stitching:** Compares consecutive frames in grayscale to measure the exact vertical shift, preventing cut-off or misaligned lines caused by smooth scrolling, lazy-loaded content, or fractional DPI scaling (e.g., 125% on Windows).
- **Modal & Inner Scroll Container Support:** Automatically detects when you are viewing a full-screen modal or nested scrollable panel and scrolls that container directly instead of the background page.
- **Smart Sticky/Fixed Bar Handling:** Temporarily hides sticky and fixed headers/footers after the first frame so they never repeat down the screenshot—while leaving full-screen overlays intact and restoring everything when done.
- **Instant Cancellation:** Stop a long capture at any moment; the page immediately restores its original scroll position, scrollbars, and sticky elements.
- **Built-In Preview & Export Tab:** Opens a clean viewer tab (backed by IndexedDB for large images) where you can inspect at **Fit** or **100%** zoom, copy directly to the clipboard, or download as **PNG** or **JPEG**.
- **Keyboard Shortcut:** Press `Alt + Shift + S` to open the extension popup from any tab.
- **100% Local & Minimal Permissions:** Uses only `activeTab`, `scripting`, and `downloads`. No external servers, no tracking, no accounts.

## Installation (Load Unpacked)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/cisey/fullsnap.git
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the cloned `fullsnap` folder (the directory containing `manifest.json`).
5. Pin **FullSnap** to your Chrome toolbar for one-click access.

## Project Structure

| File / Folder | Purpose |
| :--- | :--- |
| `manifest.json` | Chrome Extension Manifest V3 configuration, permissions, and shortcut |
| `background.js` | Service worker handling scroll detection, rate-limited capture, cancellation, and pixel-aligned `OffscreenCanvas` stitching |
| `db.js` | IndexedDB helper for transferring large stitched image blobs without storage quota limits |
| `popup.html`, `popup.css`, `popup.js` | Extension popup UI, capture options, live progress bar, and stop button |
| `viewer.html`, `viewer.css`, `viewer.js` | Preview tab with zoom controls, clipboard copy, and PNG/JPEG export |
| `icons/` | Extension icons (`16px`, `48px`, `128px`) |

## Limitations

- Chrome security policies prevent extensions from capturing internal browser pages (`chrome://`, `edge://`, `about:`) and the Chrome Web Store.
- Extremely tall pages exceeding the browser's maximum canvas height (`32,767 px`) are capped at the upper section with a notice banner in the viewer.

## License

This project is licensed under the **MIT License** — see the [LICENSE.txt](https://www.google.com/search?q=LICENSE.txt) file for details.
