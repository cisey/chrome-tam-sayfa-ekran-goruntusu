// Bağımsız, sıfır bağımlılıklı PDF 1.4 oluşturucu (Manifest V3 uyumlu)
// Uzun ekran görüntülerini A4 sayfalı veya tek uzun sayfa PDF olarak dışa aktarır.

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const MAX_PDF_PAGE_PT = 14400; // PDF 1.4 maksimum sayfa boyutu (200 inç)

function asciiToBytes(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function pad10(num) {
  return String(num).padStart(10, '0');
}

function fmtPt(num) {
  return Number(num.toFixed(2));
}

function canvasToJpegBytes(canvas, quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error('JPEG dönüşümü başarısız oldu.'));
          return;
        }
        const buffer = await blob.arrayBuffer();
        resolve(new Uint8Array(buffer));
      },
      'image/jpeg',
      quality
    );
  });
}

function buildPdfBytes(pages) {
  const chunks = [];
  let offset = 0;

  const pushBytes = (u8) => {
    chunks.push(u8);
    offset += u8.length;
  };

  const pushStr = (str) => {
    pushBytes(asciiToBytes(str));
  };

  // PDF 1.4 başlık + ikili dosya belirteci
  pushBytes(new Uint8Array([
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a,
    0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a
  ]));

  // Nesne numaraları:
  // 1: Catalog, 2: Pages
  // Her sayfa için 3 nesne: Image XObject, Content Stream, Page
  const totalObjects = 2 + pages.length * 3;
  const offsets = new Array(totalObjects + 1).fill(0);

  const pageObjIds = [];
  for (let i = 0; i < pages.length; i++) {
    pageObjIds.push(3 + i * 3 + 2);
  }

  // 1: Catalog
  offsets[1] = offset;
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2: Pages
  offsets[2] = offset;
  pushStr(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`
  );

  // Her sayfa için Image + Content + Page nesneleri
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const imgId = 3 + i * 3;
    const contentId = imgId + 1;
    const pageId = imgId + 2;

    // Image XObject (DCTDecode / JPEG)
    offsets[imgId] = offset;
    pushStr(
      `${imgId} 0 obj\n` +
      `<< /Type /XObject /Subtype /Image /Width ${p.pxWidth} /Height ${p.pxHeight} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpegBytes.length} >>\n` +
      'stream\n'
    );
    pushBytes(p.jpegBytes);
    pushStr('\nendstream\nendobj\n');

    // Content Stream (PDF koordinatı sol-alttan başlar)
    const contentStr = `q\n${fmtPt(p.drawW)} 0 0 ${fmtPt(p.drawH)} ${fmtPt(p.drawX)} ${fmtPt(p.drawY)} cm\n/Im0 Do\nQ\n`;
    const contentBytes = asciiToBytes(contentStr);
    offsets[contentId] = offset;
    pushStr(`${contentId} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
    pushBytes(contentBytes);
    pushStr('endstream\nendobj\n');

    // Page Object
    offsets[pageId] = offset;
    pushStr(
      `${pageId} 0 obj\n` +
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmtPt(p.pageW)} ${fmtPt(p.pageH)}] ` +
      `/Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>\n` +
      'endobj\n'
    );
  }

  // xref tablosu
  const xrefOffset = offset;
  pushStr(`xref\n0 ${totalObjects + 1}\n`);
  pushStr('0000000000 65535 f \n');
  for (let id = 1; id <= totalObjects; id++) {
    pushStr(`${pad10(offsets[id])} 00000 n \n`);
  }

  // trailer
  pushStr(
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`
  );

  // Tüm parçaları tek Uint8Array'de birleştir
  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

/**
 * Bir görüntü Blob'undan PDF Blob'u oluşturur.
 * @param {Blob} sourceBlob - PNG veya JPEG görüntü blob'u
 * @param {{ mode?: 'a4' | 'single', quality?: number, marginPt?: number }} options
 * @returns {Promise<Blob>}
 */
async function createPdfFromImageBlob(sourceBlob, options = {}) {
  const { mode = 'a4', quality = 0.92, marginPt = 20 } = options;
  const bitmap = await createImageBitmap(sourceBlob);
  const imgW = bitmap.width;
  const imgH = bitmap.height;

  try {
    const pages = [];

    if (mode === 'single') {
      // Tek uzun sayfa PDF (A4 genişliğinde; 14.400 pt sınırını aşarsa orantılı ölçeklenir)
      let pageW = A4_WIDTH_PT;
      let pageH = pageW * (imgH / imgW);
      if (pageH > MAX_PDF_PAGE_PT) {
        const ratio = MAX_PDF_PAGE_PT / pageH;
        pageH = MAX_PDF_PAGE_PT;
        pageW = Math.max(72, pageW * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = imgW;
      canvas.height = imgH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, imgW, imgH);
      ctx.drawImage(bitmap, 0, 0);

      const jpegBytes = await canvasToJpegBytes(canvas, quality);
      pages.push({
        jpegBytes,
        pxWidth: imgW,
        pxHeight: imgH,
        pageW,
        pageH,
        drawW: pageW,
        drawH: pageH,
        drawX: 0,
        drawY: 0
      });
    } else {
      // A4 sayfalı PDF (genişliği A4 kenar boşluklarına sığdırır, yüksekliği sayfalara böler)
      const usableW = A4_WIDTH_PT - marginPt * 2;
      const usableH = A4_HEIGHT_PT - marginPt * 2;
      const ptPerPx = usableW / imgW;
      const slicePxH = Math.max(1, Math.floor(usableH / ptPerPx));

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = imgW;
      const ctx = sliceCanvas.getContext('2d');

      for (let y = 0; y < imgH; y += slicePxH) {
        const curH = Math.min(slicePxH, imgH - y);
        sliceCanvas.height = curH;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, imgW, curH);
        ctx.drawImage(bitmap, 0, y, imgW, curH, 0, 0, imgW, curH);

        const jpegBytes = await canvasToJpegBytes(sliceCanvas, quality);
        const drawH = curH * ptPerPx;
        const drawY = A4_HEIGHT_PT - marginPt - drawH; // Üste hizalı

        pages.push({
          jpegBytes,
          pxWidth: imgW,
          pxHeight: curH,
          pageW: A4_WIDTH_PT,
          pageH: A4_HEIGHT_PT,
          drawW: usableW,
          drawH,
          drawX: marginPt,
          drawY
        });
      }
    }

    const pdfBytes = buildPdfBytes(pages);
    return new Blob([pdfBytes], { type: 'application/pdf' });
  } finally {
    bitmap.close();
  }
}

// Node.js test ortamı için opsiyonel dışa aktarım
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildPdfBytes, createPdfFromImageBlob };
}
