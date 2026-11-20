const captureFullBtn = document.getElementById('captureFullBtn');
const captureVisibleBtn = document.getElementById('captureVisibleBtn');
const formatSelect = document.getElementById('formatSelect');
const hideFixedCheck = document.getElementById('hideFixedCheck');
const autoDownloadCheck = document.getElementById('autoDownloadCheck');
const progressBox = document.getElementById('progressBox');
const progressBar = document.getElementById('progressBar');
const statusText = document.getElementById('statusText');
const percentText = document.getElementById('percentText');
const cancelBtn = document.getElementById('cancelBtn');
const infoBox = document.getElementById('infoBox');
const errorBox = document.getElementById('errorBox');

function loadPreferences() {
  const savedFormat = localStorage.getItem('ts_format');
  const savedHideFixed = localStorage.getItem('ts_hideFixed');
  const savedAutoDownload = localStorage.getItem('ts_autoDownload');

  if (savedFormat === 'png' || savedFormat === 'jpeg') {
    formatSelect.value = savedFormat;
  }
  if (savedHideFixed !== null) {
    hideFixedCheck.checked = savedHideFixed === 'true';
  }
  if (savedAutoDownload !== null) {
    autoDownloadCheck.checked = savedAutoDownload === 'true';
  }
}

function savePreferences() {
  localStorage.setItem('ts_format', formatSelect.value);
  localStorage.setItem('ts_hideFixed', String(hideFixedCheck.checked));
  localStorage.setItem('ts_autoDownload', String(autoDownloadCheck.checked));
}

formatSelect.addEventListener('change', savePreferences);
hideFixedCheck.addEventListener('change', savePreferences);
autoDownloadCheck.addEventListener('change', savePreferences);

function setBusy(busy) {
  captureFullBtn.disabled = busy;
  captureVisibleBtn.disabled = busy;
  formatSelect.disabled = busy;
  hideFixedCheck.disabled = busy;
  autoDownloadCheck.disabled = busy;
  cancelBtn.disabled = !busy;
  if (busy) {
    cancelBtn.classList.remove('hidden');
  }
}

function clearMessages() {
  errorBox.textContent = '';
  errorBox.classList.add('hidden');
  infoBox.textContent = '';
  infoBox.classList.add('hidden');
}

function showError(msg) {
  infoBox.classList.add('hidden');
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
}

function showInfo(msg) {
  errorBox.classList.add('hidden');
  infoBox.textContent = msg;
  infoBox.classList.remove('hidden');
}

function updateProgress(percent, text) {
  progressBox.classList.remove('hidden');
  progressBar.style.width = `${percent}%`;
  percentText.textContent = `${percent}%`;
  statusText.textContent = text;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CAPTURE_PROGRESS') {
    updateProgress(message.percent, message.statusText);
  } else if (message.type === 'CAPTURE_CANCELLED') {
    progressBox.classList.add('hidden');
    setBusy(false);
    showInfo('Yakalama durduruldu. Sayfa eski haline döndürüldü.');
  }
});

cancelBtn.addEventListener('click', async () => {
  cancelBtn.disabled = true;
  statusText.textContent = 'Durduruluyor...';
  try {
    await chrome.runtime.sendMessage({ type: 'CANCEL_CAPTURE' });
  } catch (_) {
    // Arka plan yanıt vermezse arayüzü serbest bırak
    progressBox.classList.add('hidden');
    setBusy(false);
  }
});

async function startCapture(mode) {
  clearMessages();
  savePreferences();
  setBusy(true);
  updateProgress(5, 'Başlatılıyor...');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'START_CAPTURE',
      options: {
        mode,
        format: formatSelect.value,
        quality: 0.92,
        hideFixed: hideFixedCheck.checked,
        autoDownload: autoDownloadCheck.checked
      }
    });

    if (response && response.cancelled) {
      progressBox.classList.add('hidden');
      showInfo('Yakalama durduruldu. Sayfa eski haline döndürüldü.');
      return;
    }

    if (!response || !response.ok) {
      throw new Error(response?.error || 'Ekran görüntüsü alınamadı.');
    }

    updateProgress(100, 'Önizleme sekmesi açıldı.');
    cancelBtn.classList.add('hidden');
  } catch (err) {
    progressBox.classList.add('hidden');
    showError(err.message || 'Beklenmeyen bir hata oluştu.');
  } finally {
    setBusy(false);
  }
}

captureFullBtn.addEventListener('click', () => startCapture('full'));
captureVisibleBtn.addEventListener('click', () => startCapture('visible'));

loadPreferences();

// Popup kapatılıp tekrar açıldığında devam eden bir yakalama varsa durdurma seçeneğiyle göster
chrome.runtime.sendMessage({ type: 'GET_STATUS' }).then((res) => {
  if (res && res.isCapturing) {
    setBusy(true);
    updateProgress(res.percent || 10, res.statusText || 'Yakalama devam ediyor...');
  }
}).catch(() => {});
