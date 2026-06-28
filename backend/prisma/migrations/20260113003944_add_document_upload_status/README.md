# Add Document Upload Status

Bu migration doküman yükleme sistemine aşamalı (staging) onay sürecini ekler.

## Değişiklikler

1. `DocumentUploadStatus` enum'u oluşturuldu:
   - `PENDING_UPLOAD`: Henüz yüklenmemiş
   - `STAGING`: Geçici depoda, inceleme bekliyor
   - `APPROVED`: Onaylandı, kalıcı depoya taşındı
   - `REJECTED`: Reddedildi, dosya silindi

2. `MemberDocument` tablosuna yeni alanlar eklendi:
   - `secureFileName`: Güvenli hash tabanlı dosya adı
   - `fileSize`: Dosya boyutu (byte)
   - `mimeType`: Dosya tipi
   - `uploadStatus`: Yükleme durumu
   - `stagingPath`: Geçici depo yolu
   - `permanentPath`: Kalıcı depo yolu
   - `reviewedBy`: İnceleyen admin kullanıcı ID
   - `reviewedAt`: İnceleme tarihi
   - `adminNote`: Admin notu
   - `rejectionReason`: Red nedeni
   - `updatedAt`: Güncelleme zamanı

3. `fileUrl` alanı nullable yapıldı (staging dokümanlar için null olabilir)

4. Mevcut dokümanlar `APPROVED` durumuna güncellendi (geriye uyumluluk için)

5. İndeksler eklendi:
   - `uploadStatus` için indeks
   - `reviewedBy` için indeks

