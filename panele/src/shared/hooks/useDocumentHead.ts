// src/shared/hooks/useDocumentHead.ts
import { useEffect } from 'react';

/**
 * Document title ve favicon'u dinamik olarak günceller
 */
export const useDocumentHead = (title?: string, faviconUrl?: string) => {
  useEffect(() => {
    // Title güncelle
    if (title) {
      document.title = title;
    }

    // Favicon güncelle
    if (faviconUrl) {
      // Mevcut favicon link'ini bul veya oluştur
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }

      // URL'i düzelt (relative ise backend URL'si ekle; production'da aynı origin kullanılır)
      const baseUrl = import.meta.env.PROD ? window.location.origin : 'http://localhost:3000';
      const faviconSrc = faviconUrl.startsWith('http://') || faviconUrl.startsWith('https://')
        ? faviconUrl
        : `${baseUrl}${faviconUrl.startsWith('/') ? '' : '/'}${faviconUrl}`;

      link.href = faviconSrc;
      
      // Dosya uzantısına göre type belirle
      const extension = faviconUrl.split('.').pop()?.toLowerCase();
      if (extension === 'svg') {
        link.type = 'image/svg+xml';
      } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension || '')) {
        link.type = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
      } else {
        link.type = 'image/x-icon';
      }
    }
  }, [title, faviconUrl]);
};
