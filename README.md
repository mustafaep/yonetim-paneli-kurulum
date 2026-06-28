# Yönetim Paneli — Bilgisayara Kurulum (Yerel / Localhost)

Bu proje, **kendi bilgisayarınızda** Docker ile çalıştırılmak için hazırlanmıştır.
Teknik bilgi gerektirmez. Kurulum bitince panele **http://localhost:3030**
adresinden girersiniz.

> Bu yerel kurulum tek başına çalışır; herhangi bir sunucuya (VPS) ihtiyaç yoktur.

---

## 1. Tek Gereksinim: Docker Desktop

Bilgisayarınızda **Docker Desktop** kurulu ve **açık** olmalıdır.

- İndirme adresi: https://www.docker.com/products/docker-desktop/
- Kurduktan sonra **Docker Desktop** programını açın ve sağ alttaki
  balina simgesinin **yeşil / çalışıyor** olmasını bekleyin.

Başka hiçbir şey (Node.js, veritabanı vb.) kurmanıza gerek yoktur — her şey
Docker içinde otomatik kurulur.

---

## 2. Kurulum (Tek Adım)

### Windows
1. Bu klasörü açın.
2. **`kurulum.bat`** dosyasına **çift tıklayın**.
3. Açılan siyah pencerede işlemlerin bitmesini bekleyin
   (ilk kurulum internet hızınıza göre **5–15 dakika** sürebilir).
4. İşlem bitince tarayıcınızda **http://localhost:3030** otomatik açılır.
   Açılmazsa 1–2 dakika bekleyip tarayıcıya bu adresi kendiniz yazın.

### Mac / Linux
1. Bir Terminal açın ve bu klasöre gidin.
2. Şu komutu çalıştırın:
   ```
   bash kurulum.sh
   ```
3. İşlem bitince **http://localhost:3030** adresine girin.

---

## 3. Panele Giriş

Kurulumdan sonra panele şu bilgilerle girersiniz:

| Alan    | Değer               |
|---------|---------------------|
| E-posta | `admin@panel.local` |
| Şifre   | `Admin1234!`        |

> Bu bilgileri değiştirmek isterseniz, **ilk kurulumdan önce** `.env.local`
> dosyasındaki `ADMIN_EMAIL` ve `ADMIN_PASSWORD` satırlarını düzenleyin.
> Kurulumdan sonra şifrenizi panel içinden de değiştirebilirsiniz.

---

## 4. Günlük Kullanım

- **Başlatmak / yeniden başlatmak:** `kurulum.bat` (veya `bash kurulum.sh`)
  tekrar çalıştırılabilir; verilerinizi silmez.
- **Durdurmak:** `durdur.bat` dosyasına çift tıklayın.
  - Mac/Linux: `docker compose -f docker-compose.local.yml down`
- Bilgisayarı kapatıp açtığınızda Docker Desktop açıksa uygulama
  kendiliğinden tekrar başlar.

Verileriniz Docker içinde güvenle saklanır; durdurmak veriyi silmez.

---

## 5. WhatsApp Bağlama (İsteğe Bağlı)

WhatsApp özelliği kuruluma dahildir. Bağlamak için:
1. Panele girin.
2. WhatsApp / Ayarlar bölümünden **QR kodu** ekrana getirin.
3. Telefonunuzdan **WhatsApp → Bağlı Cihazlar → Cihaz Bağla** ile QR'ı okutun.

WhatsApp'ı hiç kullanmasanız da panelin geri kalanı sorunsuz çalışır.

---

## 6. Sık Karşılaşılan Sorunlar

**"Docker bulunamadı" hatası**
Docker Desktop kurulu değil ya da kapalı. Kurun/açın, yeşil olmasını bekleyin,
sonra `kurulum.bat` dosyasını tekrar çalıştırın.

**Sayfa açılmıyor / "bu siteye ulaşılamıyor"**
Kurulum henüz bitmemiş olabilir. 1–2 dakika bekleyip sayfayı yenileyin.

**3030 portu başka bir program tarafından kullanılıyor**
`.env.local` dosyasını açıp `PORT=3030` satırını örneğin `PORT=4040` yapın,
kaydedin ve `kurulum.bat` dosyasını tekrar çalıştırın. Artık adres
`http://localhost:4040` olur.

**Her şeyi sıfırdan kurmak / tüm verileri silmek (dikkat!)**
Bir terminalde bu klasörde:
```
docker compose -f docker-compose.local.yml down --volumes
```
Sonra tekrar `kurulum.bat` çalıştırın. Bu komut **tüm yerel verileri siler**.

---

## 7. Teknik Not (geliştiriciler için)

- Kurulum dosyası: `docker-compose.local.yml` (kendi içinde kapalı, `name: yonetim-panel-local`).
- Servisler: `postgres`, `redis`, `backend` (NestJS), `frontend` (nginx, dışa açık port **3030**), `waha` (WhatsApp).
- Frontend nginx, `/api` ve `/uploads` isteklerini backend'e proxy'ler; backend `yonetim-backend` ağ takma adıyla çözülür.
- İlk açılışta backend, veritabanı **boşsa** otomatik olarak `seed7` (admin + il/ilçe + roller) ve `seed5` (belge şablonları) çalıştırır (`LOCAL_AUTO_SEED=true`). Veri varsa atlanır, mevcut veriler korunur.
- Tüm ayarlar `.env.local` dosyasındadır (ilk kurulumda `.env.local.example` kopyalanarak oluşturulur).
