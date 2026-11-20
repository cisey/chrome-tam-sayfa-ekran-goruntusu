const pageTitleEl = document.getElementById('pageTitle');
const metaInfoEl = document.getElementById('metaInfo');
const previewImage = document.getElementById('previewImage');
const emptyState = document.getElementById('emptyState');
const warningBanner = document.getElementById('warningBanner');
const toastEl = document.getElementById('toast');

const fitBtn = document.getElementById('fitBtn');
const actualBtn = document.getElementById('actualBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadPngBtn = document.getElementById('downloadPngBtn');
const downloadJpgBtn = document.getElementById('downloadJpgBtn');

let currentRecord = null;
let currentObjectUrl = null;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

let toastTimer = null;
function showToast(text, isError = false) {
  toastEl.textContent = text;
  toastEl.style.background = isError ? '#dc2626' : '#10b981';
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2600);
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  chrome.downloads.download(
    {
      url,
      filename,
      saveAs: false
    },
    () => {
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  );
}

async function convertBlobFormat(sourceBlob, targetMime, quality = 0.92) {
  if (sourceBlob.type === targetMime) {
    return sourceBlob;
  }
  const bitmap = await createImageBitmap(sourceBlob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (targetMime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Dönüştürme başarısız oldu.'));
      },
      targetMime,
      targetMime === 'image/jpeg' ? quality : undefined
    );
  });
}

function replaceExtension(filename, newExt) {
  return filename.replace(/\.(png|jpe?g)$/i, `.${newExt}`);
}

fitBtn.addEventListener('click', () => {
  previewImage.classList.add('fit');
  previewImage.classList.remove('actual');
  fitBtn.classList.add('active');
  actualBtn.classList.remove('active');
});

actualBtn.addEventListener('click', () => {
  previewImage.classList.remove('fit');
  previewImage.classList.add('actual');
  actualBtn.classList.add('active');
  fitBtn.classList.remove('active');
});

downloadPngBtn.addEventListener('click', async () => {
  if (!currentRecord) return;
  try {
    const pngBlob = await convertBlobFormat(currentRecord.blob, 'image/png');
    triggerBlobDownload(pngBlob, replaceExtension(currentRecord.filename, 'png'));
    showToast('PNG olarak indiriliyor...');
  } catch (err) {
    showToast(err.message || 'PNG indirme başarısız.', true);
  }
});

downloadJpgBtn.addEventListener('click', async () => {
  if (!currentRecord) return;
  try {
    const jpgBlob = await convertBlobFormat(currentRecord.blob, 'image/jpeg', 0.92);
    triggerBlobDownload(jpgBlob, replaceExtension(currentRecord.filename, 'jpg'));
    showToast('JPEG olarak indiriliyor...');
  } catch (err) {
    showToast(err.message || 'JPEG indirme başarısız.', true);
  }
});

copyBtn.addEventListener('click', async () => {
  if (!currentRecord) return;
  try {
    const pngBlob = await convertBlobFormat(currentRecord.blob, 'image/png');
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob })
    ]);
    showToast('Görüntü panoya kopyalandı.');
  } catch (err) {
    showToast('Panoya kopyalama desteklenmedi veya reddedildi.', true);
  }
});

async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    previewImage.classList.add('hidden');
    emptyState.classList.remove('hidden');
    pageTitleEl.textContent = 'Görüntü Bulunamadı';
    return;
  }

  try {
    const record = await getCaptureRecord(id);
    if (!record || !record.blob) {
      previewImage.classList.add('hidden');
      emptyState.classList.remove('hidden');
      pageTitleEl.textContent = 'Görüntü Bulunamadı';
      return;
    }

    currentRecord = record;
    currentObjectUrl = URL.createObjectURL(record.blob);
    previewImage.src = currentObjectUrl;

    document.title = `${record.title} — Ekran Görüntüsü`;
    pageTitleEl.textContent = record.title;
    metaInfoEl.textContent = `${record.width} × ${record.height} px • ${formatBytes(record.sizeBytes)} • ${record.ext.toUpperCase()}`;

    if (record.truncated) {
      warningBanner.classList.remove('hidden');
    }

    if (record.autoDownload) {
      triggerBlobDownload(record.blob, record.filename);
      showToast(`${record.filename} indirildi.`);
    }
  } catch (err) {
    previewImage.classList.add('hidden');
    emptyState.classList.remove('hidden');
    emptyState.textContent = `Görüntü yüklenirken hata oluştu: ${err.message}`;
  }
}

window.addEventListener('beforeunload', () => {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }
});

init();
