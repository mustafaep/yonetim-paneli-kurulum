import { useEffect, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker.js';

const CDN_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const isWorkerInitError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Setting up fake worker failed') ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('pdf.worker')
  );
};

/** draft: PDF Oluştur taslak önizlemesi; document: kayıtlı belge / ödeme belgesi / antetli kağıt vb. */
export type PdfCanvasPreviewVariant = 'draft' | 'document';

export interface DraftPdfCanvasPreviewProps {
  /** Geçici blob URL (ör. createObjectURL); bileşen sadece okur, revoke etmez */
  blobUrl: string;
  variant?: PdfCanvasPreviewVariant;
  /** variant="draft" iken PDF üzerindeki filigran metni (ör. yükleme önizlemesi için "ÖNİZLEME") */
  draftWatermarkText?: string;
}

/**
 * PDF.js ile canvas’a çizer; tarayıcı PDF eklentisi ve yerleşik indirme araç çubuğunu kullanmaz.
 */
export function DraftPdfCanvasPreview({
  blobUrl,
  variant = 'document',
  draftWatermarkText = 'TASLAK',
}: DraftPdfCanvasPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDraft = variant === 'draft';

  useEffect(() => {
    let cancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
    let doc: pdfjsLib.PDFDocumentProxy | null = null;

    const run = async () => {
      setLoading(true);
      setError(null);
      const host = hostRef.current;
      if (host) {
        host.replaceChildren();
      }

      try {
        loadingTask = pdfjsLib.getDocument({
          url: blobUrl,
          isEvalSupported: false,
        });
        try {
          doc = await loadingTask.promise;
        } catch (workerError) {
          if (!isWorkerInitError(workerError)) {
            throw workerError;
          }

          // Local .mjs failed (VPS/Nginx MIME issue) — retry with CDN worker
          loadingTask.destroy();
          pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER_URL;
          loadingTask = pdfjsLib.getDocument({
            url: blobUrl,
            isEvalSupported: false,
          });

          try {
            doc = await loadingTask.promise;
          } catch (cdnError) {
            if (!isWorkerInitError(cdnError)) {
              throw cdnError;
            }

            // CDN also failed — last resort: worker-less mode
            loadingTask.destroy();
            pdfjsLib.GlobalWorkerOptions.workerSrc = '';
            loadingTask = pdfjsLib.getDocument({
              url: blobUrl,
              isEvalSupported: false,
              disableWorker: true,
            } as Parameters<typeof pdfjsLib.getDocument>[0]);
            doc = await loadingTask.promise;
          }
        }
        if (cancelled) {
          await doc.destroy().catch(() => {});
          doc = null;
          return;
        }

        const container = hostRef.current;
        if (!container) {
          await doc.destroy().catch(() => {});
          doc = null;
          return;
        }

        const numPages = doc.numPages;
        const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          if (cancelled) break;

          const page = await doc.getPage(pageNum);
          const baseViewport = page.getViewport({ scale: 1 });
          const scrollHost = container.parentElement;
          const maxW = Math.max(
            320,
            (scrollHost?.clientWidth ?? container.clientWidth ?? 800) - 32,
          );
          const pageScale = Math.min(1.6, maxW / baseViewport.width);
          const viewport = page.getViewport({ scale: pageScale });

          const canvas = document.createElement('canvas');
          canvas.draggable = false;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            await page.cleanup();
            continue;
          }

          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.style.display = 'block';
          canvas.style.margin = '0 auto 20px';
          canvas.style.boxShadow = '0 1px 6px rgba(0,0,0,0.12)';
          canvas.style.borderRadius = '2px';
          canvas.style.userSelect = 'none';

          const renderViewport = page.getViewport({ scale: pageScale * dpr });
          const renderTask = page.render({
            canvasContext: ctx,
            viewport: renderViewport,
          });
          await renderTask.promise;
          await page.cleanup();

          if (!cancelled) {
            container.appendChild(canvas);
          }
        }

        if (doc && !cancelled) {
          await doc.destroy().catch(() => {});
          doc = null;
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'PDF yüklenemedi');
          setLoading(false);
        }
      } finally {
        if (doc) {
          await doc.destroy().catch(() => {});
          doc = null;
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      loadingTask?.destroy();
      void doc?.destroy().catch(() => {});
    };
  }, [blobUrl]);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'grey.100',
      }}
    >
      {isDraft && (
        <Alert severity="info" sx={{ borderRadius: 0, flexShrink: 0 }}>
          Taslak önizleme — PDF.js ile gösteriliyor. Kalıcı dosyayı yalnızca kaydettikten sonra
          geçmişten indirebilirsiniz.
        </Alert>
      )}

      <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            overflow: 'auto',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3,
                bgcolor: 'rgba(255,255,255,0.85)',
              }}
            >
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Box sx={{ p: 2 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}

          <Box
            ref={hostRef}
            sx={{
              position: 'relative',
              zIndex: 1,
              py: 2,
              px: 1,
              minHeight: 200,
            }}
          />
        </Box>

        {isDraft && !loading && !error && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Typography
              component="span"
              sx={{
                transform:
                  draftWatermarkText.length > 6
                    ? 'rotate(-28deg) scale(0.9)'
                    : 'rotate(-28deg) scale(1.02)',
                fontSize: {
                  xs: 'clamp(2.75rem, 14vw, 4rem)',
                  sm: 'clamp(3.5rem, 12vw, 5.5rem)',
                  md: 'clamp(4rem, 10vw, 6.5rem)',
                },
                fontWeight: 900,
                letterSpacing: draftWatermarkText.length > 6 ? '0.05em' : '0.12em',
                color: 'rgba(183, 28, 28, 0.38)',
                WebkitTextStroke: '1px rgba(255, 255, 255, 0.35)',
                textShadow:
                  '0 0 2px rgba(255,255,255,0.9), 0 2px 14px rgba(0,0,0,0.12), 0 0 40px rgba(183, 28, 28, 0.15)',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {draftWatermarkText}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
