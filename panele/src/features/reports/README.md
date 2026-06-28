# Raporlar Modülü

## Genel Bakış

Raporlar sayfası, yönetim panelinde üye, bölge ve başvuru raporlarını görüntülemek, filtrelemek ve dışa aktarmak için geliştirilmiş profesyonel bir admin raporlama ekranıdır.

## Özellikler

### 1. Filtre Paneli
- **Tarih Aralığı**: Başlangıç ve bitiş tarihi seçimi
- **Şube Filtresi**: Dropdown ile şube seçimi
- **İl Filtresi**: Çoklu seçim yapılabilir
- **İlçe Filtresi**: İl seçilince aktif olur, çoklu seçim yapılabilir
- **Üyelik Durumu Filtresi**: Tümü / Aktif / Onay Bekliyor / vb.
- **Uygula ve Temizle Butonları**: Filtreleri uygulama ve sıfırlama
- **Aktif Filtreler Görüntüleme**: Seçili filtrelerin chip olarak gösterimi

### 2. Özet Kartlar (KPI)
- **Toplam Üye Sayısı**: Sistemdeki toplam üye
- **Aktif Üye Sayısı**: Aktif durumdaki üyeler
- **Bekleyen Başvuru Sayısı**: Onay bekleyen başvurular
- **Bu Ay Eklenen Üye Sayısı**: Cari ayda eklenen yeni üyeler

### 3. Rapor Sekmeleri

#### Üye Raporu
- Kayıt No, Ad Soyad, Şube, İl, İlçe, Durum, Kayıt Tarihi
- Filtrelenmiş üye listesi
- Sayfalama ve sıralama

#### Bölge Raporu
- Bölge, Toplam Üye, Aktif Üye, Bekleyen Başvuru, Bu Ay Yeni
- Bölgesel özet veriler
- Bölge bazında analiz

#### Başvuru Raporu
- Başvuran Ad Soyad, Şube, Durum, Başvuru Tarihi, Bekleyen Gün
- Başvuru takip raporu
- Bekleyen başvuruların süresi

### 4. Dışa Aktarma (Export)
- **CSV/Excel İndir**: xlsx kütüphanesi ile gerçek Excel formatı
- **PDF İndir**: HTML tablosu olarak PDF'e dönüştürme
- Her sekme için ayrı export fonksiyonu
- Filtrelenmiş veriler export edilir

### 5. Durum Yönetimi
- **Loading State**: Veri yüklenirken gösterge
- **Empty State**: Veri bulunamadığında bilgilendirme
- **Error State**: Hata durumunda kullanıcıya bilgi

## Dosya Yapısı

```
src/features/reports/
├── pages/
│   └── ReportsPage.tsx          # Ana rapor sayfası
├── services/
│   ├── reportsMock.ts           # Mock veri servisi (geçici)
│   └── reportsApi.ts            # Backend API servisi (hazır)
└── README.md                     # Bu dosya
```

## Teknik Detaylar

### Kullanılan Teknolojiler
- **React**: UI framework
- **MUI (Material-UI)**: Komponent kütüphanesi
- **MUI X Data Grid**: Tablo komponenti
- **MUI X Date Pickers**: Tarih seçici
- **date-fns**: Tarih işlemleri
- **xlsx**: Excel export
- **React Router**: Routing

### State Yönetimi
- Local state (useState) ile yönetiliyor
- Filter state'leri ayrı ayrı tutuluyor
- Data fetching async olarak yapılıyor

### Stil Yaklaşımı
- MUI sx prop ile styling
- Mevcut tema ile uyumlu renkler
- Responsive tasarım (Grid system)
- Hover efektleri ve animasyonlar

## Backend Entegrasyonu

### Şu Anki Durum
Şu an mock veri kullanılıyor (`reportsMock.ts`). Backend hazır olmadığı için örnek verilerle çalışıyor.

### Backend Hazır Olduğunda

#### 1. Gerekli Endpoint'ler

Backend'de aşağıdaki endpoint'lerin hazırlanması gerekiyor:

```typescript
// KPI'lar
GET /reports/kpis?startDate=...&endDate=...&branchId=...&provinceIds=...&districtIds=...&status=...
Response: {
  totalMembers: number;
  activeMembers: number;
  pendingApplications: number;
  newThisMonth: number;
}

// Üye Raporu
GET /reports/members?startDate=...&endDate=...&branchId=...&provinceIds=...&districtIds=...&status=...
Response: MemberReportRow[]

// Bölge Raporu
GET /reports/regions?startDate=...&endDate=...&branchId=...&provinceIds=...&districtIds=...&status=...
Response: RegionReportRow[]

// Başvuru Raporu
GET /reports/applications?startDate=...&endDate=...&branchId=...&provinceIds=...&districtIds=...&status=...
Response: ApplicationReportRow[]

// Tüm Rapor Verileri (Opsiyonel - performans için)
POST /reports/generate
Body: ReportFilters
Response: {
  kpis: ReportKPIs;
  memberReport: MemberReportRow[];
  regionReport: RegionReportRow[];
  applicationReport: ApplicationReportRow[];
}
```

#### 2. Frontend Değişiklikleri

`ReportsPage.tsx` dosyasında yapılacak değişiklikler:

**Adım 1**: Import değiştir
```typescript
// ÖNCEKİ
import { getMockReportData, ... } from '../services/reportsMock';

// YENİ
import { fetchReportData, ... } from '../services/reportsApi';
```

**Adım 2**: fetchReportData fonksiyonunu güncelle
```typescript
// ÖNCEKİ
const data = getMockReportData(filters);

// YENİ
const data = await fetchReportData(filters);
```

**Adım 3**: Error handling ekle (zaten mevcut)
```typescript
try {
  const data = await fetchReportData(filters);
  setKpis(data.kpis);
  setMemberReportData(data.memberReport);
  setRegionReportData(data.regionReport);
  setApplicationReportData(data.applicationReport);
} catch (err) {
  console.error('Rapor verileri yüklenirken hata:', err);
  setError('Rapor verileri yüklenirken bir hata oluştu');
}
```

#### 3. Backend Veri Tipleri

Backend response type'ları `reportsMock.ts` içinde tanımlı:

```typescript
export interface ReportKPIs {
  totalMembers: number;
  activeMembers: number;
  pendingApplications: number;
  newThisMonth: number;
}

export interface MemberReportRow {
  id: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  branch: string;
  province: string;
  district: string;
  status: MemberStatus;
  createdAt: string;  // ISO date string
}

export interface RegionReportRow {
  region: string;
  totalMembers: number;
  activeMembers: number;
  pendingApplications: number;
  newThisMonth: number;
}

export interface ApplicationReportRow {
  id: string;
  firstName: string;
  lastName: string;
  branch: string;
  status: MemberStatus;
  applicationDate: string;  // ISO date string
  daysPending: number;
}
```

#### 4. Query Parametreleri

Backend'e gönderilecek filtreler:

```typescript
interface ReportFilters {
  startDate?: Date;      // Frontend: Date, Backend'e ISO string gönderilir
  endDate?: Date;        // Frontend: Date, Backend'e ISO string gönderilir
  branchId?: string;
  provinceIds?: string[];  // Virgülle ayrılmış string olarak gönderilir
  districtIds?: string[];  // Virgülle ayrılmış string olarak gönderilir
  status?: MemberStatus;
}
```

## Bağımlılıklar

Yeni eklenen paketler (package.json'a eklendi):

```json
{
  "@mui/x-date-pickers": "^8.21.0",
  "date-fns": "^4.1.0"
}
```

Yükleme komutu:

```bash
npm install
```

veya

```bash
npm install @mui/x-date-pickers date-fns
```

## Kullanım

### Sayfa Erişimi
Raporlar sayfası `/reports` route'u üzerinden erişilebilir.

### Filtreleme
1. İstediğiniz filtreleri seçin
2. "Uygula" butonuna tıklayın
3. Veriler filtrelenmiş olarak yüklenecek

### Export
1. İlgili sekmeye gidin (Üye/Bölge/Başvuru)
2. "Excel İndir" veya "PDF İndir" butonuna tıklayın
3. Dosya otomatik indirilecek

## Tasarım Standardı

Bu sayfa, "Üyeler" sayfasındaki layout standardını takip eder:

- **Başlık Bölümü**: PageHeader komponenti ile standart başlık
- **İçerik Hizalaması**: Başlık ve içerik aynı genişlikte
- **Filtre Bölümü**: Genişletilmiş filtre paneli
- **Tablo Görünümü**: DataGrid ile profesyonel tablo
- **Responsive Tasarım**: Mobil ve desktop uyumlu

## Performans İyileştirmeleri

1. **Pagination**: DataGrid ile sayfalama (25/50/100 satır)
2. **Memoization**: useMemo ile filtrelenmiş veri cache
3. **Lazy Import**: xlsx kütüphanesi dinamik import
4. **Debounce**: (İleride eklenebilir) Arama için

## Gelecek Geliştirmeler

- [ ] Grafik/Chart ekleme (recharts ile)
- [ ] PDF export iyileştirmesi (jsPDF kullanarak)
- [ ] Rapor kaydetme ve yükleme
- [ ] Zamanlanmış raporlar (cron job)
- [ ] Email ile rapor gönderme
- [ ] Gelişmiş filtreleme (tarih range shortcuts)
- [ ] URL query parametreleri ile filtre paylaşımı

## Sorun Giderme

### Date Picker Hataları
Eğer date picker hata verirse:
1. `@mui/x-date-pickers` yüklü mü kontrol edin
2. `date-fns` yüklü mü kontrol edin
3. LocalizationProvider doğru import edilmiş mi kontrol edin

### Export Hataları
Excel export çalışmıyorsa:
1. `xlsx` paketi yüklü mü kontrol edin
2. Tarayıcı console'da hata var mı kontrol edin
3. exportUtils.ts dosyası doğru import edilmiş mi kontrol edin

### API Bağlantı Hataları
Backend'e bağlanırken hata alıyorsanız:
1. httpClient yapılandırması doğru mu kontrol edin
2. Backend endpoint'leri hazır mı kontrol edin
3. CORS ayarları yapıldı mı kontrol edin

## İletişim

Sorularınız için proje yöneticisi ile iletişime geçin.
