import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  /** Docker/Linux VPS: paket chromium veya env ile; yoksa Puppeteer paket içi Chrome */
  private resolveChromiumExecutablePath(): string | undefined {
    const fromEnv =
      process.env.PUPPETEER_EXECUTABLE_PATH?.trim() ||
      process.env.CHROMIUM_PATH?.trim();
    if (fromEnv && fs.existsSync(fromEnv)) {
      return fromEnv;
    }
    const candidates = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome-stable',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return undefined;
  }

  private getPuppeteerLaunchOptions(): Parameters<
    typeof puppeteer.launch
  >[0] {
    const executablePath = this.resolveChromiumExecutablePath();
    const opts: Parameters<typeof puppeteer.launch>[0] = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    };
    if (executablePath) {
      opts.executablePath = executablePath;
      this.logger.debug(`Puppeteer Chromium: ${executablePath}`);
    }
    return opts;
  }

  /**
   * Dosyayı base64 image'e çevir (background için)
   * PDF ise PDF.js kullanarak canvas'a render edip screenshot alır
   * PNG/JPG ise direkt base64'e çevirir (çok daha hızlı!)
   */
  async convertPdfToBase64Image(pdfPath: string): Promise<string> {
    let browser: puppeteer.Browser | null = null;

    try {
      if (!fs.existsSync(pdfPath)) {
        this.logger.warn(`Dosya bulunamadı: ${pdfPath}`);
        return '';
      }

      // Dosya uzantısını kontrol et
      const ext = path.extname(pdfPath).toLowerCase();

      // Eğer PNG veya JPG ise, direkt base64'e çevir (çok daha hızlı!)
      if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        this.logger.debug(
          `Image dosyası direkt base64'e çevriliyor: ${pdfPath}`,
        );
        const imageBuffer = fs.readFileSync(pdfPath);
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        const base64Image = imageBuffer.toString('base64');
        this.logger.debug(
          `Image başarıyla base64'e çevrildi (${base64Image.length} karakter)`,
        );
        return `data:${mimeType};base64,${base64Image}`;
      }

      // PDF ise, PDF.js ile render et
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfBase64 = pdfBuffer.toString('base64');

      this.logger.debug(
        `PDF'i image'e çeviriyor: ${pdfPath} (Bu işlem 15-20 saniye sürebilir)`,
      );

      browser = await puppeteer.launch(this.getPuppeteerLaunchOptions());

      const page = await browser.newPage();

      // Viewport'u A4 boyutuna ayarla (yüksek DPI için)
      await page.setViewport({
        width: 794, // A4 width in pixels (at 96 DPI)
        height: 1123, // A4 height in pixels (at 96 DPI)
        deviceScaleFactor: 2, // Daha yüksek kalite için
      });

      // PDF.js CDN ile PDF'i render et
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: white;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 794px;
      height: 1123px;
    }
    #canvas-container {
      width: 794px;
      height: 1123px;
    }
    canvas {
      max-width: 100%;
      max-height: 100%;
    }
  </style>
</head>
<body>
  <div id="canvas-container"></div>
  <script>
    (async function() {
      const pdfBase64 = '${pdfBase64}';
      const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
      
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      try {
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1); // İlk sayfa
        
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        document.getElementById('canvas-container').appendChild(canvas);
        
        // PDF render edildiğini belirt
        document.body.setAttribute('data-rendered', 'true');
      } catch (error) {
        console.error('PDF render hatası:', error);
        document.body.setAttribute('data-error', error.message);
      }
    })();
  </script>
</body>
</html>`;

      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
      });

      // PDF render edilmesini bekle
      try {
        await page.waitForSelector('[data-rendered="true"]', {
          timeout: 15000,
        });
      } catch {
        // Render işareti gelmezse, canvas'ın yüklenmesini bekle
        try {
          await page.waitForSelector('canvas', { timeout: 15000 });
        } catch {
          this.logger.warn('PDF render timeout - canvas bulunamadı');
        }
      }

      // Render'ın tamamlanması için ek bekleme
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Canvas'ın screenshot'ını al
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false, // Canvas'ın boyutuna göre
        clip: {
          x: 0,
          y: 0,
          width: 794,
          height: 1123,
        },
        omitBackground: false,
      });

      // Base64'e çevir
      const base64Image = Buffer.from(screenshot as Buffer).toString('base64');
      this.logger.debug(
        `PDF başarıyla image'e çevrildi (${base64Image.length} karakter)`,
      );
      return `data:image/png;base64,${base64Image}`;
    } catch (error) {
      this.logger.error(
        `PDF'i image'e çevirirken hata: ${error.message}`,
        error.stack,
      );
      return '';
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * HTML içeriğini antetli kağıt background'u ile sarmala
   */
  wrapHtmlWithHeaderPaper(
    htmlContent: string,
    backgroundImageBase64: string,
  ): string {
    if (!backgroundImageBase64) {
      return htmlContent;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    html {
      margin: 0;
      padding: 0;
    }
    body {
      margin: 0;
      padding: 0;
      width: 210mm;
      background-image: url('${backgroundImageBase64}');
      background-size: 210mm 297mm; /* A4 tam boyut */
      background-repeat: repeat-y; /* Dikey tekrarla (her sayfa için) */
      background-position: 0 0; /* Her sayfa başında tekrar */
      position: relative;
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 10pt; /* Küçük font */
      line-height: 1.4;
      color: #000;
    }
    .content {
      position: relative;
      z-index: 1;
      width: 100%;
      padding: 55mm 15mm 15mm 15mm; /* Üst: 55mm (logo için), Yan: 15mm, Alt: 15mm */
      box-sizing: border-box;
    }
    /* Her sayfa için padding */
    @media print {
      .content {
        padding-top: 55mm; /* Her sayfa başında aynı boşluk */
      }
    }
  </style>
</head>
<body data-header-paper="true">
  <div class="content">
    ${htmlContent}
  </div>
</body>
</html>`;
  }

  /**
   * HTML içeriğini PDF'e dönüştür
   */
  async generatePdfFromHtml(
    htmlContent: string,
    outputPath: string,
    options?: {
      format?: 'A4' | 'Letter';
      margin?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
      };
      printBackground?: boolean;
      headerPaperPath?: string;
    },
  ): Promise<void> {
    let browser: puppeteer.Browser | null = null;

    try {
      // Antetli kağıt varsa HTML içeriğini sarmala
      let finalHtmlContent = htmlContent;
      if (options?.headerPaperPath) {
        this.logger.debug(
          `Antetli kağıt kullanılıyor: ${options.headerPaperPath}`,
        );
        const backgroundImage = await this.convertPdfToBase64Image(
          options.headerPaperPath,
        );
        if (backgroundImage) {
          this.logger.debug(
            `Antetli kağıt başarıyla image'e çevrildi (${backgroundImage.length} karakter)`,
          );
          finalHtmlContent = this.wrapHtmlWithHeaderPaper(
            htmlContent,
            backgroundImage,
          );
        } else {
          this.logger.warn(
            `Antetli kağıt image'e çevrilemedi, background olmadan devam ediliyor`,
          );
        }
      }

      // Browser'ı başlat
      browser = await puppeteer.launch(this.getPuppeteerLaunchOptions());

      const page = await browser.newPage();

      // HTML içeriğini yükle
      await page.setContent(finalHtmlContent, {
        waitUntil: 'networkidle0',
      });

      // PDF seçenekleri
      const pdfOptions: puppeteer.PDFOptions = {
        format: options?.format || 'A4',
        margin: options?.margin || {
          top: '0mm', // Antetli kağıt varsa margin'ler CSS'te ayarlanır
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
        printBackground: options?.printBackground !== false,
        preferCSSPageSize: true, // CSS page size'ı kullan
      };

      // Output dizinini oluştur
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // PDF'i oluştur ve kaydet
      await page.pdf({
        ...pdfOptions,
        path: outputPath,
      });

      this.logger.log(`PDF generated successfully: ${outputPath}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate PDF: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * HTML içeriğini PDF buffer olarak döndür (dosyaya kaydetmeden)
   */
  async generatePdfBufferFromHtml(
    htmlContent: string,
    options?: {
      format?: 'A4' | 'Letter';
      margin?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
      };
      printBackground?: boolean;
    },
  ): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch(this.getPuppeteerLaunchOptions());

      const page = await browser.newPage();

      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
      });

      const pdfOptions: puppeteer.PDFOptions = {
        format: options?.format || 'A4',
        margin: options?.margin || {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        printBackground: options?.printBackground !== false,
        preferCSSPageSize: false,
      };

      const pdfBuffer = await page.pdf(pdfOptions);

      this.logger.log('PDF buffer generated successfully');
      // Puppeteer Uint8Array döndürür, Buffer'a dönüştür
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(
        `Failed to generate PDF buffer: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * HTML template'ini değişkenlerle doldur
   */
  // Ham HTML içeren değişkenler — escape edilmez
  private static readonly HTML_VARS = new Set(['memberTable']);

  replaceTemplateVariables(
    template: string,
    variables: Record<string, string>,
  ): string {
    let html = template;

    // Önce template'deki tüm değişkenleri bul
    const templateVarRegex = /\{\{\s*(\w+)\s*\}\}/g;
    const foundVariables = new Set<string>();
    let match;

    while ((match = templateVarRegex.exec(template)) !== null) {
      foundVariables.add(match[1]);
    }

    // Eksik değişkenleri kontrol et ve log'la
    const missingVars = Array.from(foundVariables).filter(
      (varName) => !variables.hasOwnProperty(varName),
    );
    if (missingVars.length > 0) {
      this.logger.warn(`Şablonda eksik değişkenler: ${missingVars.join(', ')}`);
    }

    // {{variable}} formatındaki değişkenleri değiştir
    // HTML_VARS listesindeki değişkenler ham HTML içerdiğinden escape edilmez
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const replacement = PdfService.HTML_VARS.has(key)
        ? (value || '')
        : this.escapeHtml(value || '');
      html = html.replace(regex, replacement);
    });

    // Hala değiştirilmemiş değişkenleri boş string ile değiştir
    html = html.replace(/\{\{\s*\w+\s*\}\}/g, '');

    return html;
  }

  /**
   * Template'i HTML wrapper ile sarmala (CSS ve format için)
   */
  wrapTemplateWithHtml(content: string): string {
    const trimmed = content.trim();
    const lower = trimmed.toLowerCase();

    // Eğer tam HTML dokümanı ise (antet wrapper'ın içine gömmemek için) body içeriğini çıkar
    if (lower.startsWith('<!doctype') || lower.startsWith('<html')) {
      const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch?.[1]) {
        return bodyMatch[1];
      }
      // Body bulunamazsa olduğu gibi dön (fallback)
      return content;
    }

    // Eğer HTML fragment ise olduğu gibi dön
    if (trimmed.startsWith('<')) {
      return content;
    }

    // Plain text ise basit bir wrapper ile satır sonlarını koru
    return `<div style="white-space:pre-wrap;word-break:break-word;">${content}</div>`;
  }

  /**
   * HTML escape (XSS koruması)
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
