# Yönetim Paneli — Kullanım Kılavuzu (Son Kullanıcı)

Bu belge, programı bilgisayarınızda **baştan sona** kullanmanız için hazırlanmıştır.
Teknik bilgi gerektirmez. Lütfen özellikle **"Verileriniz Nerede Saklanıyor"** ve
**"Yedekleme"** bölümlerini okuyun — verilerinizi kaybetmemek için önemlidir.

> Bu kurulum tamamen **sizin bilgisayarınızda** çalışır. İnternetteki bir sunucuda
> (bulutta) tutulmaz. Bu yüzden verilerinizin tek kopyası bu bilgisayardadır.

---

## 1. Program Nedir, Nasıl Çalışır?

Program, bilgisayarınızda **Docker** adlı bir altyapı üzerinde çalışır. Tek tek
ayrı programlar kurmanıza gerek yoktur; her şey (veritabanı dahil) otomatik kurulur.
Kurulumdan sonra panele tarayıcıdan **http://localhost:3030** adresiyle girersiniz.

---

## 2. Kurulum (İlk Sefer)

### Gerekli tek şey: Docker Desktop
1. Şu adresten **Docker Desktop**'ı indirip kurun:
   https://www.docker.com/products/docker-desktop/
2. Kurduktan sonra **Docker Desktop** programını açın.
3. Sağ alttaki balina simgesi **yeşil / "running"** olana kadar bekleyin.

### Windows'ta kurulum
1. Bu klasörü açın.
2. **`kurulum.bat`** dosyasına **çift tıklayın**.
3. Açılan siyah pencerede işlemlerin bitmesini bekleyin
   (ilk kurulum internet hızınıza göre **5–15 dakika** sürebilir).
4. İşlem bitince tarayıcıda **http://localhost:3030** otomatik açılır.
   Açılmazsa 1–2 dakika bekleyip adresi kendiniz yazın.

### Mac / Linux'ta kurulum
1. Terminal açıp bu klasöre gidin.
2. `bash kurulum.sh` yazıp Enter'a basın.
3. Bitince **http://localhost:3030** adresine girin.

---

## 3. Panele Giriş

| Alan    | Değer               |
|---------|---------------------|
| E-posta | `admin@panel.local` |
| Şifre   | `Admin1234!`        |

> Şifreyi kurulumdan **sonra** panel içinden değiştirebilirsiniz. İlk admin
> bilgilerini baştan değiştirmek isterseniz, **ilk kurulumdan önce** `.env.local`
> dosyasındaki `ADMIN_EMAIL` ve `ADMIN_PASSWORD` satırlarını düzenleyin.

---

## 4. Günlük Kullanım

- **Açmak / yeniden başlatmak:** `kurulum.bat`'a tekrar çift tıklayın
  (veya Mac/Linux: `bash kurulum.sh`). Verilerinizi **silmez**.
- **Durdurmak:** `durdur.bat`'a çift tıklayın
  (Mac/Linux: `docker compose -f docker-compose.local.yml down`).
- Bilgisayarı kapatıp açtığınızda **Docker Desktop açıksa** program kendiliğinden
  yeniden başlar.

Durdurmak veriyi **silmez**; verileriniz güvenle saklanır.

---

## 5. WhatsApp Bağlama (İsteğe Bağlı)

1. Panele girin.
2. WhatsApp / Ayarlar bölümünden **QR kodu** ekrana getirin.
3. Telefonunuzdan **WhatsApp → Bağlı Cihazlar → Cihaz Bağla** ile QR'ı okutun.

WhatsApp'ı hiç kullanmasanız da panelin geri kalanı sorunsuz çalışır.

---

## 6. Verileriniz Nerede Saklanıyor? (ÖNEMLİ)

Panele eklediğiniz **her şey** — üye kayıtları, yüklediğiniz **resimler, logolar,
fotoğraflar, PDF ve belgeler** — bilgisayarınızda **Docker'ın yönettiği özel
saklama alanlarında** (volume) tutulur:

| İçerik | Nerede tutulur |
|---|---|
| Yüklenen resim / logo / fotoğraf / PDF / belgeler | `yonetim-panel-local_backend-uploads` |
| Veritabanı (üyeler ve tüm kayıtlar) | `yonetim-panel-local_postgres-data` |
| WhatsApp oturumu | `yonetim-panel-local_waha-data` |

**Bilmeniz gerekenler:**
- Bunlar Dosya Gezgini'nde gezdiğiniz normal bir klasör **değildir**; Docker'ın
  içinde, korunaklı biçimde tutulur.
- Veriler **yalnızca bu bilgisayarda**, yerelde durur. **İnternette / bulutta bir
  yedeği yoktur.**
- Bilgisayar bozulur, çalınır ya da formatlanırsa **tüm veriler ve resimler kaybolur.**
  Bu yüzden **düzenli yedek almak şarttır** (bkz. Bölüm 7).

---

## 7. Yedekleme (Çok Önemli)

Önemli verileriniz varsa **düzenli olarak yedek alın** ve yedekleri **başka bir
yere** (harici disk, USB bellek veya bulut) kopyalayın. Yedek, ancak bu bilgisayarın
dışında bir yerde de duruyorsa sizi korur.

### En kolay yöntem (Windows): `yedek-al.bat`
Docker Desktop **açıkken**, klasördeki **`yedek-al.bat`** dosyasına **çift tıklayın**.
Yedekler, tarih-saat damgalı olarak klasör içindeki **`yedekler`** klasörüne kaydedilir:

- `yedekler\uploads-yedek-2026-06-28_14-30.tar.gz` → yüklenen resim/belgeler
- `yedekler\db-yedek-2026-06-28_14-30.sql` → veritabanı (tüm kayıtlar)

**Mac / Linux:** Terminalde `bash yedek-al.sh` çalıştırın (aynı işi yapar).

> ⚠️ Yedek aldıktan sonra **`yedekler` klasörünü harici disk, USB bellek veya
> buluta kopyalayın.** Yedek yalnızca aynı bilgisayarda durursa sizi korumaz.

### Elle yedek alma (alternatif)
İsterseniz bu klasörde **PowerShell** açıp komutları kendiniz de çalıştırabilirsiniz:

```powershell
# 1) Yüklenen resim ve dosyalar
docker run --rm -v yonetim-panel-local_backend-uploads:/data -v "${PWD}:/backup" alpine tar czf /backup/uploads-yedek.tar.gz -C /data .

# 2) Veritabanı (tüm kayıtlar)
docker exec panel-local-postgres pg_dump -U postgres yonetim_local > db-yedek.sql
```

### Yedekten geri yükleme (gerekirse)
Yeni/temiz bir kuruluma geri yüklemek için (Docker Desktop açıkken, klasörde):

```powershell
# Veritabanını geri yükle
type db-yedek.sql | docker exec -i panel-local-postgres psql -U postgres -d yonetim_local

# Resim/dosyaları geri yükle
docker run --rm -v yonetim-panel-local_backend-uploads:/data -v "${PWD}:/backup" alpine sh -c "tar xzf /backup/uploads-yedek.tar.gz -C /data"
```

---

## 8. DİKKAT — Verileri Kalıcı Olarak Silen İşlemler

Aşağıdakiler **tüm verilerinizi geri dönüşü olmadan siler**. Yedeğiniz yoksa
veriler **tamamen kaybolur**:

- `docker compose -f docker-compose.local.yml down --volumes` komutu
  (sonundaki `--volumes` her şeyi siler).
- Docker Desktop'ta **Troubleshoot → Clean / Purge data** veya
  **"Reset to factory defaults"**.
- Docker Desktop'ı bilgisayardan **kaldırmak** (volume'lerle birlikte).
- Volume'leri Docker Desktop arayüzünden elle silmek.

**Güvenli olanlar (veri korunur):** `durdur.bat` ile durdurmak, `kurulum.bat`'ı
yeniden çalıştırmak, bilgisayarı kapatıp açmak.

---

## 9. Sık Karşılaşılan Sorunlar

**"Docker bulunamadı" hatası**
Docker Desktop kapalı veya kurulu değil. Açın/kurun, yeşil olmasını bekleyin,
`kurulum.bat`'ı tekrar çalıştırın.

**Sayfa açılmıyor / "bu siteye ulaşılamıyor"**
Kurulum henüz bitmemiş olabilir. 1–2 dakika bekleyip sayfayı yenileyin.

**3030 portu başka bir program tarafından kullanılıyor**
`.env.local` dosyasını açıp `PORT=3030` satırını örneğin `PORT=4040` yapın,
kaydedin ve `kurulum.bat`'ı tekrar çalıştırın. Adres `http://localhost:4040` olur.

**Her şeyi sıfırdan kurmak istiyorum (tüm veriler silinir!)**
Önce yedek aldığınızdan emin olun. Sonra bu klasörde:
```
docker compose -f docker-compose.local.yml down --volumes
```
ve ardından tekrar `kurulum.bat`.

---

## 10. Kısaca Unutmayın

- Tüm verileriniz **bu bilgisayarda**, yereldedir — **bulutta yedeği yoktur**.
- **Düzenli yedek alın** ve yedeği **başka bir yere** kopyalayın (Bölüm 7).
- `durdur.bat` güvenlidir; **`--volumes`** içeren komutlar **siler**.
- Sorun olursa Docker Desktop'ın açık ve **yeşil** olduğundan emin olun.
