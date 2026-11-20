importScripts('db.js');

const CAPTURE_MIN_INTERVAL_MS = 560; // Chrome MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND (2/sn) koruması
const MAX_CANVAS_HEIGHT = 32767;     // Tarayıcı canvas yükseklik sınırı

let isCapturing = false;
let cancelRequested = false;
let lastPercent = 0;
let lastStatusText = '';
const sleepAborters = new Set();

class CaptureCancelledError extends Error {
  constructor() {
    super('Yakalama kullanıcı tarafından iptal edildi.');
    this.code = 'CANCELLED';
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    sendResponse({
      isCapturing,
      percent: lastPercent,
      statusText: lastStatusText
    });
    return false;
  }

  if (message.type === 'CANCEL_CAPTURE') {
    if (!isCapturing) {
      sendResponse({ ok: false, error: 'Aktif bir yakalama işlemi yok.' });
      return false;
    }
    cancelRequested = true;
    for (const abort of sleepAborters) {
      abort();
    }
    sleepAborters.clear();
    chrome.action.setBadgeText({ text: '×' });
    chrome.action.setBadgeBackgroundColor({ color: '#64748b' });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'START_CAPTURE') {
    if (isCapturing) {
      sendResponse({ ok: false, error: 'Zaten devam eden bir yakalama işlemi var.' });
      return false;
    }

    handleCapture(message.options)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((err) => {
        if (err && err.code === 'CANCELLED') {
          sendResponse({ ok: false, cancelled: true, error: err.message });
        } else {
          sendResponse({ ok: false, error: err.message || 'Yakalama sırasında hata oluştu.' });
        }
      });

    return true; // Asenkron yanıt
  }
});

function throwIfCancelled() {
  if (cancelRequested) {
    throw new CaptureCancelledError();
  }
}

function sleepAbortable(ms) {
  return new Promise((resolve, reject) => {
    if (cancelRequested) {
      reject(new CaptureCancelledError());
      return;
    }
    const timer = setTimeout(() => {
      sleepAborters.delete(abort);
      resolve();
    }, ms);

    const abort = () => {
      clearTimeout(timer);
      sleepAborters.delete(abort);
      reject(new CaptureCancelledError());
    };

    sleepAborters.add(abort);
  });
}

function sendProgress(percent, statusText) {
  lastPercent = percent;
  lastStatusText = statusText;
  const badgeText = percent >= 100 ? '✓' : `${percent}%`;
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: percent >= 100 ? '#10b981' : '#2563eb' });
  chrome.runtime.sendMessage({
    type: 'CAPTURE_PROGRESS',
    percent,
    statusText
  }).catch(() => {
    // Popup kapalıysa hata verme
  });
}

function notifyCancelled() {
  chrome.runtime.sendMessage({
    type: 'CAPTURE_CANCELLED'
  }).catch(() => {});
}

function clearBadgeSoon(delayMs = 2000) {
  setTimeout(() => {
    if (!isCapturing) {
      chrome.action.setBadgeText({ text: '' });
    }
  }, delayMs);
}

function isRestrictedUrl(url = '') {
  return (
    !url ||
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('https://chrome.google.com/webstore') ||
    url.startsWith('https://chromewebstore.google.com')
  );
}

function buildSafeFilename(title, ext) {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join('');

  const cleaned = (title || 'ekran-goruntusu')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50)
    .replace(/^-+|-+$/g, '') || 'ekran-goruntusu';

  return `${cleaned}-${stamp}.${ext}`;
}

async function captureVisibleTabRateLimited(windowId, lastCaptureTimeRef) {
  throwIfCancelled();
  const elapsed = Date.now() - lastCaptureTimeRef.value;
  if (elapsed < CAPTURE_MIN_INTERVAL_MS) {
    await sleepAbortable(CAPTURE_MIN_INTERVAL_MS - elapsed);
  }
  throwIfCancelled();
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
  lastCaptureTimeRef.value = Date.now();
  throwIfCancelled();
  return dataUrl;
}

async function dataUrlToBitmap(dataUrl) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return createImageBitmap(blob);
}


// ---- Görüntü tabanlı hizalama yardımcıları ----
const GRAY_COL_STEP = 4;

// Karenin kaydırılan içerik şeridini küçültülmüş gri tonlamaya çevirir
function extractGrayStrip(bitmap, srcY, srcH) {
  const w = bitmap.width;
  const canvas = new OffscreenCanvas(w, srcH);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, srcY, w, srcH, 0, 0, w, srcH);
  const { data } = ctx.getImageData(0, 0, w, srcH);
  const gw = Math.floor(w / GRAY_COL_STEP);
  const gray = new Uint8Array(gw * srcH);
  for (let y = 0; y < srcH; y++) {
    const rowIn = y * w * 4;
    const rowOut = y * gw;
    for (let x = 0; x < gw; x++) {
      const p = rowIn + x * GRAY_COL_STEP * 4;
      gray[rowOut + x] = (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) >> 8;
    }
  }
  return { gray, gw, h: srcH };
}

// cur karesinin üst satırları, prev karesinin kaç piksel aşağısında bulunuyor?
// "expected" kaydırma bilgisinden gelen tahmindir; asıl değer görüntüden bulunur.
function findVerticalShift(prev, cur, expected) {
  const { gw, h } = prev;
  const overlap = h - expected;
  if (expected <= 0 || overlap < 60) return Math.max(0, expected);

  const range = Math.round(overlap * 0.4);
  const rows = Math.min(overlap - range, 240);
  if (rows < 24) return expected;

  const sMin = Math.max(1, expected - range);
  const sMax = Math.min(h - rows, expected + range);
  let bestShift = expected;
  let bestCost = Infinity;
  let bestMad = Infinity;

  for (let s = sMin; s <= sMax; s++) {
    const penalty = Math.abs(s - expected) * 0.01; // belirsiz (boş) bölgelerde tahmine yakın olanı seç
    const limit = (bestCost - penalty) * rows * gw;
    let sum = 0;
    for (let r = 0; r < rows; r++) {
      const a = r * gw;
      const b = (r + s) * gw;
      for (let x = 0; x < gw; x++) {
        const d = cur.gray[a + x] - prev.gray[b + x];
        sum += d < 0 ? -d : d;
      }
      if (sum > limit) break;
    }
    const mad = sum / (rows * gw);
    const cost = mad + penalty;
    if (cost < bestCost) {
      bestCost = cost;
      bestMad = mad;
      bestShift = s;
    }
  }

  // Güvenilir eşleşme bulunamadıysa kaydırma bilgisine güven
  return bestMad > 25 ? expected : bestShift;
}

// Chrome'un saniyede 2 yakalama sınırı için, kaydırmadan ÖNCE bekle
async function waitForCaptureSlot(lastCaptureTimeRef) {
  throwIfCancelled();
  const elapsed = Date.now() - lastCaptureTimeRef.value;
  if (elapsed < CAPTURE_MIN_INTERVAL_MS) {
    await sleepAbortable(CAPTURE_MIN_INTERVAL_MS - elapsed);
  }
}

async function handleCapture(options = {}) {
  const {
    mode = 'full',
    format = 'png',
    quality = 0.92,
    hideFixed = true,
    autoDownload = true
  } = options;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    throw new Error('Aktif sekme bulunamadı.');
  }

  if (isRestrictedUrl(tab.url)) {
    throw new Error('Chrome sistem sayfaları ve Chrome Web Mağazası güvenlik nedeniyle yakalanamaz.');
  }

  isCapturing = true;
  cancelRequested = false;
  lastPercent = 0;
  lastStatusText = '';
  const lastCaptureTimeRef = { value: 0 };

  try {
    sendProgress(5, 'Sayfa hazırlanıyor...');
    throwIfCancelled();

    // Görünür alan modu
    if (mode === 'visible') {
      sendProgress(40, 'Görünür alan yakalanıyor...');
      const dataUrl = await captureVisibleTabRateLimited(tab.windowId, lastCaptureTimeRef);
      const bitmap = await dataUrlToBitmap(dataUrl);
      throwIfCancelled();

      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();

      return await finalizeAndOpenViewer({
        canvas,
        tab,
        format,
        quality,
        autoDownload,
        truncated: false
      });
    }

    // Tam sayfa modu: Aktif kaydırılabilir alanı (pencere veya tam ekran modal/panel) tespit et
    const [{ result: metrics }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const html = document.documentElement;
        const body = document.body;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;

        function isScrollableElement(el) {
          if (!el || el === html || el === body) return false;
          const style = window.getComputedStyle(el);
          const oy = style.overflowY;
          if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') return false;
          if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
            return false;
          }
          if (el.scrollHeight <= el.clientHeight + 20) return false;
          const rect = el.getBoundingClientRect();
          if (rect.width < vw * 0.5 || rect.height < vh * 0.35) return false;
          if (rect.bottom <= 0 || rect.top >= vh) return false;
          return true;
        }

        function findActiveScrollContainer() {
          const probePoints = [
            [Math.floor(vw * 0.5), Math.floor(vh * 0.65)],
            [Math.floor(vw * 0.5), Math.floor(vh * 0.5)],
            [Math.floor(vw * 0.5), Math.floor(vh * 0.8)]
          ];

          for (const [px, py] of probePoints) {
            let cur = document.elementFromPoint(px, py);
            while (cur && cur !== html && cur !== body) {
              if (isScrollableElement(cur)) {
                return cur;
              }
              cur = cur.parentElement;
            }
          }
          return null;
        }

        const scrollContainer = findActiveScrollContainer();
        const isContainer = Boolean(scrollContainer);

        const styleEl = document.createElement('style');
        styleEl.id = '__ts_capture_style';
        styleEl.textContent = `
          html::-webkit-scrollbar, body::-webkit-scrollbar, .__ts_no_scrollbar::-webkit-scrollbar { display: none !important; }
          html, body, .__ts_no_scrollbar { scrollbar-width: none !important; }
          html, .__ts_no_scrollbar { scroll-behavior: auto !important; overflow-anchor: none !important; scroll-snap-type: none !important; }
        `;
        document.head.appendChild(styleEl);

        if (isContainer) {
          window.__tsCaptureState = {
            isContainer: true,
            container: scrollContainer,
            scrollLeft: scrollContainer.scrollLeft,
            scrollTop: scrollContainer.scrollTop,
            scrollBehavior: scrollContainer.style.scrollBehavior,
            hiddenFixedElements: [],
            hiddenSet: new WeakSet()
          };

          scrollContainer.style.scrollBehavior = 'auto';
          scrollContainer.classList.add('__ts_no_scrollbar');

          const rect = scrollContainer.getBoundingClientRect();
          const containerTop = Math.max(0, Math.round(rect.top));
          const visibleHeight = Math.min(scrollContainer.clientHeight, Math.max(1, Math.round(vh - containerTop)));
          const totalHeight = scrollContainer.scrollHeight;

          return {
            isContainer: true,
            totalHeight,
            viewportWidth: vw,
            viewportHeight: vh,
            containerTop,
            stepHeight: visibleHeight,
            dpr
          };
        }

        window.__tsCaptureState = {
          isContainer: false,
          container: null,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          scrollBehavior: html.style.scrollBehavior,
          hiddenFixedElements: [],
          hiddenSet: new WeakSet()
        };

        html.style.scrollBehavior = 'auto';

        const totalHeight = Math.max(
          body ? body.scrollHeight : 0,
          body ? body.offsetHeight : 0,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        );

        return {
          isContainer: false,
          totalHeight,
          viewportWidth: vw,
          viewportHeight: vh,
          containerTop: 0,
          stepHeight: vh,
          dpr
        };
      }
    });

    throwIfCancelled();

    if (!metrics || !metrics.viewportHeight || !metrics.stepHeight) {
      throw new Error('Sayfa boyutları okunamadı.');
    }

    const { isContainer, totalHeight, viewportHeight, containerTop, stepHeight, dpr } = metrics;
    const bottomChrome = isContainer ? Math.max(0, viewportHeight - (containerTop + stepHeight)) : 0;
    const extraChrome = containerTop + bottomChrome;

    const maxContentCssHeight = Math.max(stepHeight, Math.floor(MAX_CANVAS_HEIGHT / dpr) - extraChrome);
    const effectiveContentHeight = Math.min(totalHeight, maxContentCssHeight);
    const truncated = totalHeight > maxContentCssHeight;

    // Birleşme noktalarında görüntüleri piksel piksel hizalayabilmek için yeterli çakışma payı
    const overlapCssTarget = stepHeight > 240 ? Math.min(240, Math.floor(stepHeight * 0.25)) : 0;
    const effectiveStep = Math.max(60, stepHeight - overlapCssTarget);
    const maxScrollY = Math.max(0, effectiveContentHeight - stepHeight);

    const positions = [0];
    let nextY = 0;
    while (nextY < maxScrollY) {
      nextY = Math.min(maxScrollY, nextY + effectiveStep);
      positions.push(nextY);
    }

    const slices = [];

    for (let i = 0; i < positions.length; i++) {
      throwIfCancelled();
      const targetY = positions[i];
      const pct = Math.min(85, Math.round(((i + 0.5) / positions.length) * 80) + 5);
      sendProgress(pct, `Bölüm yakalanıyor (${i + 1}/${positions.length})...`);

      await waitForCaptureSlot(lastCaptureTimeRef);

      const [{ result: scrollInfo }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [targetY, i > 0 && hideFixed, containerTop, stepHeight],
        func: (y, shouldHideFixed, cropTop, cropH) => {
          return new Promise((resolve) => {
            const state = window.__tsCaptureState;
            const container = state && state.isContainer ? state.container : null;
            const getY = () => (container ? container.scrollTop : window.scrollY);

            // Kaydırma tamamen durana kadar bekle (yumuşak kaydırma / geç yüklenen içerik için)
            const waitStable = (done) => {
              let last = getY();
              let stable = 0;
              let frames = 0;
              const tick = () => {
                frames++;
                const cur = getY();
                if (Math.abs(cur - last) < 0.5) stable++; else stable = 0;
                last = cur;
                if (stable >= 4 || frames > 120) done();
                else requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
            };

            if (container) {
              container.scrollTop = y;
            } else {
              window.scrollTo(0, y);
            }

            waitStable(() => {
              setTimeout(() => {
                if (shouldHideFixed && state) {
                  const vw = window.innerWidth;
                  const vh = window.innerHeight;
                  const viewportArea = vw * vh;
                  const cropBottom = cropTop + cropH;
                  const candidates = document.querySelectorAll('*');

                  for (const el of candidates) {
                    if (state.hiddenSet.has(el)) continue;
                    if (container && (el === container || el.contains(container))) continue;

                    const style = window.getComputedStyle(el);
                    if ((style.position === 'fixed' || style.position === 'sticky') && style.visibility !== 'hidden') {
                      const rect = el.getBoundingClientRect();
                      if (rect.width === 0 || rect.height === 0) continue;

                      const elArea = rect.width * rect.height;
                      // Ekranın %45'inden büyük tam ekran katmanlar (modal vb.) gizlenmez
                      if (elArea > viewportArea * 0.45 || rect.height > vh * 0.45) {
                        continue;
                      }

                      // Kapsayıcı modunda yalnızca kaydırılan içerik alanıyla çakışan yapışkan/sabit çubukları gizle
                      if (container) {
                        const overlapsScrollRegion = rect.bottom > cropTop + 2 && rect.top < cropBottom - 2;
                        if (!overlapsScrollRegion) continue;
                      }

                      state.hiddenSet.add(el);
                      state.hiddenFixedElements.push({
                        el,
                        prevVisibility: el.style.visibility
                      });
                      el.style.setProperty('visibility', 'hidden', 'important');
                    }
                  }
                }

                waitStable(() => {
                  setTimeout(() => resolve({ actualY: getY() }), 60);
                });
              }, 40);
            });
          });
        }
      });

      throwIfCancelled();
      const actualY = scrollInfo ? scrollInfo.actualY : targetY;
      if (i > 0 && slices.length > 0 && actualY <= slices[slices.length - 1].actualY) {
        break;
      }

      const dataUrl = await captureVisibleTabRateLimited(tab.windowId, lastCaptureTimeRef);

      // Görüntü alındıktan sonra konumu tekrar oku (arada kayma olduysa yakala)
      let finalY = actualY;
      try {
        const [{ result: posAfter }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const s = window.__tsCaptureState;
            return s && s.isContainer && s.container ? s.container.scrollTop : window.scrollY;
          }
        });
        if (typeof posAfter === 'number') finalY = posAfter;
      } catch (_) {
        // Okunamazsa ilk değeri kullan
      }
      slices.push({ dataUrl, actualY: finalY });
    }

    throwIfCancelled();
    sendProgress(90, 'Görüntüler birleştiriliyor...');

    const firstBitmap = await dataUrlToBitmap(slices[0].dataUrl);
    const scale = firstBitmap.height / viewportHeight;
    const canvasWidth = firstBitmap.width;
    const frameHeightPx = firstBitmap.height;
    firstBitmap.close();

    const cropTopCss = isContainer ? containerTop : 0;
    const cropTopPx = Math.round(cropTopCss * scale);
    const cropHeightPx = Math.min(frameHeightPx - cropTopPx, Math.round(stepHeight * scale));
    const bottomChromePx = isContainer ? Math.max(0, frameHeightPx - cropTopPx - cropHeightPx) : 0;

    // 1. geçiş: ardışık kareler arasındaki GERÇEK kayma miktarını görüntülerden ölç
    sendProgress(91, 'Bölümler hizalanıyor...');
    const offsets = [0];
    let prevGray = null;
    for (let i = 0; i < slices.length; i++) {
      throwIfCancelled();
      const bmp = await dataUrlToBitmap(slices[i].dataUrl);
      const gray = extractGrayStrip(bmp, cropTopPx, cropHeightPx);
      bmp.close();
      if (i > 0) {
        const expected = Math.round((slices[i].actualY - slices[i - 1].actualY) * scale);
        offsets.push(offsets[i - 1] + findVerticalShift(prevGray, gray, expected));
      }
      prevGray = gray;
    }

    const coveredPx = offsets[offsets.length - 1] + cropHeightPx;
    const fullHeightPx = cropTopPx + coveredPx + bottomChromePx;
    const canvasHeight = Math.min(MAX_CANVAS_HEIGHT, fullHeightPx);
    const wasTruncated = truncated || fullHeightPx > MAX_CANVAS_HEIGHT;

    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. geçiş: kareleri ölçülen konumlara çiz
    for (let i = 0; i < slices.length; i++) {
      throwIfCancelled();
      const bitmap = await dataUrlToBitmap(slices[i].dataUrl);
      const isLast = i === slices.length - 1;

      if (i === 0) {
        // İlk kare: üst sabit alan + ilk içerik bölümü (tek kare varsa alt şerit dahil hepsi)
        const h = isLast ? bitmap.height : Math.min(bitmap.height, cropTopPx + cropHeightPx);
        ctx.drawImage(bitmap, 0, 0, canvasWidth, h, 0, 0, canvasWidth, h);
      } else {
        // Önceki karenin alt kenarındaki ~30px'i bu karenin taze pikselleriyle değiştir
        const prevEnd = offsets[i - 1] + cropHeightPx;
        const overwritePx = Math.max(0, Math.min(Math.round(30 * scale), prevEnd - offsets[i]));
        const srcRow = Math.max(0, prevEnd - overwritePx - offsets[i]);
        const srcH = cropHeightPx - srcRow;
        const destY = cropTopPx + offsets[i] + srcRow;
        if (srcH > 0 && destY < canvasHeight) {
          ctx.drawImage(bitmap, 0, cropTopPx + srcRow, canvasWidth, srcH, 0, destY, canvasWidth, srcH);
        }

        if (isLast && bottomChromePx > 0) {
          const bottomSrcY = cropTopPx + cropHeightPx;
          const bottomDestY = cropTopPx + offsets[i] + cropHeightPx;
          if (bottomDestY < canvasHeight) {
            ctx.drawImage(bitmap, 0, bottomSrcY, canvasWidth, bottomChromePx, 0, bottomDestY, canvasWidth, bottomChromePx);
          }
        }
      }

      bitmap.close();
    }

    throwIfCancelled();
    return await finalizeAndOpenViewer({
      canvas,
      tab,
      format,
      quality,
      autoDownload,
      truncated: wasTruncated
    });
  } catch (err) {
    if (err && err.code === 'CANCELLED') {
      notifyCancelled();
    }
    throw err;
  } finally {
    // Sayfayı her durumda (iptal veya hata dahil) eski haline döndür
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const styleEl = document.getElementById('__ts_capture_style');
          if (styleEl) styleEl.remove();

          const state = window.__tsCaptureState;
          if (state) {
            if (Array.isArray(state.hiddenFixedElements)) {
              for (const item of state.hiddenFixedElements) {
                if (item.el) {
                  item.el.style.visibility = item.prevVisibility || '';
                }
              }
            }
            if (state.isContainer && state.container) {
              state.container.classList.remove('__ts_no_scrollbar');
              state.container.style.scrollBehavior = state.scrollBehavior || '';
              state.container.scrollLeft = state.scrollLeft || 0;
              state.container.scrollTop = state.scrollTop || 0;
            } else {
              document.documentElement.style.scrollBehavior = state.scrollBehavior || '';
              window.scrollTo(state.scrollX || 0, state.scrollY || 0);
            }
            delete window.__tsCaptureState;
          }
        }
      });
    } catch (_) {
      // Sekme kapandıysa yoksay
    }

    isCapturing = false;
    cancelRequested = false;
    lastPercent = 0;
    lastStatusText = '';
    sleepAborters.clear();
    clearBadgeSoon(2000);
  }
}

async function finalizeAndOpenViewer({ canvas, tab, format, quality, autoDownload, truncated }) {
  throwIfCancelled();
  sendProgress(96, 'Dosya hazırlanıyor...');

  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const blobOptions = format === 'jpeg' ? { type: mimeType, quality } : { type: mimeType };
  const blob = await canvas.convertToBlob(blobOptions);

  throwIfCancelled();

  const id = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const filename = buildSafeFilename(tab.title, ext);

  await saveCaptureRecord({
    id,
    blob,
    mimeType,
    ext,
    filename,
    title: tab.title || 'Adsız Sayfa',
    url: tab.url || '',
    width: canvas.width,
    height: canvas.height,
    sizeBytes: blob.size,
    createdAt: Date.now(),
    autoDownload,
    truncated
  });

  await pruneOldCaptures(5);
  throwIfCancelled();

  sendProgress(100, 'Tamamlandı!');

  const viewerUrl = chrome.runtime.getURL(`viewer.html?id=${encodeURIComponent(id)}`);
  await chrome.tabs.create({ url: viewerUrl });

  return { id, filename, width: canvas.width, height: canvas.height };
}
