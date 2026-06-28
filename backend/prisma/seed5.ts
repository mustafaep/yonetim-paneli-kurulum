/**
 * seed5.ts - Doküman şablonları ekler (upsert, mevcut varsa günceller).
 *
 * Eklenenler:
 *  - Üye Bilgileri belgesi (MEMBER_CERTIFICATE)
 *  - Kesinti Listesi Şablonu (LETTER)
 *  - Toplu Üye Listesi Üst Yazısı (BULK_MEMBER_LIST)
 *  - İl Disiplin Katılım Belgesi (LETTER)
 *  - Şablonlar
 */

import { PrismaClient, DocumentTemplateType } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

type SeedTemplate = {
  name: string;
  description: string;
  type: DocumentTemplateType;
  template: string;
  isActive?: boolean;
};

export const DOCUMENT_TEMPLATES: SeedTemplate[] = [
  {
    name: 'Üye Bilgilendirme Formu',
    description: 'Üyenin tüm kişisel, kurum ve üyelik bilgilerini içeren resmi belge',
    type: DocumentTemplateType.MEMBER_CERTIFICATE,
    isActive: true,
    template: `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", Times, serif; font-size: 9.5pt; color: #000; }
  .doc { padding: 12mm 18mm 8mm; }
  body[data-header-paper="true"] .doc { padding: 3mm 18mm 8mm; }

  .meta-block { font-size: 9pt; line-height: 1.6; margin-bottom: 5mm; }
  .meta-row { display: flex; }
  .meta-label { width: 12mm; }
  .meta-sep { width: 5mm; }
  .meta-date { position: absolute; right: 18mm; top: 12mm; font-size: 9pt; }
  body[data-header-paper="true"] .meta-date { top: 3mm; }

  .heading { text-align: center; font-size: 10.5pt; font-weight: bold; margin: 4mm 0 3mm; text-decoration: underline; letter-spacing: 1px; }

  table.info { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }
  table.info td { border: 1px solid #000; padding: 1mm 2.5mm; font-size: 9pt; vertical-align: middle; line-height: 1.35; }
  table.info td.lbl { width: 40%; font-weight: bold; }
  table.info td.val { width: 60%; }

  .body-text { font-size: 9pt; line-height: 1.55; text-align: justify; margin-bottom: 4mm; }
  .decision-note { font-size: 9pt; margin-bottom: 4mm; }

  .sig-block { text-align: right; font-size: 9pt; line-height: 1.6; padding-right: 2mm; }
  .sig-block .sig-name { font-weight: bold; margin-top: 9mm; }
</style>

<div class="doc" style="position:relative;">

  <div class="meta-date">{{date}}</div>

  <div class="meta-block">
    <div class="meta-row"><span class="meta-label">Sayı</span><span class="meta-sep">:</span><span>{{memberNumber}}</span></div>
    <div class="meta-row"><span class="meta-label">Konu</span><span class="meta-sep">:</span><span>Üye Kimlik ve Hizmet Bilgileri</span></div>
  </div>

  <div class="heading">İLGİLİ MAKAMA</div>

  <table class="info">
    <tr><td class="lbl">Adı Soyadı</td><td class="val">{{fullName}}</td></tr>
    <tr><td class="lbl">T.C. Kimlik No</td><td class="val">{{nationalId}}</td></tr>
    <tr><td class="lbl">Baba Adı</td><td class="val">{{fatherName}}</td></tr>
    <tr><td class="lbl">Anne Adı</td><td class="val">{{motherName}}</td></tr>
    <tr><td class="lbl">Doğum Tarihi / Yeri</td><td class="val">{{birthDate}} / {{birthPlace}}</td></tr>
    <tr><td class="lbl">Cinsiyet</td><td class="val">{{gender}}</td></tr>
    <tr><td class="lbl">Öğrenim Durumu</td><td class="val">{{educationStatus}}</td></tr>
    <tr><td class="lbl">Telefon / E-posta</td><td class="val">{{phone}} / {{email}}</td></tr>
    <tr><td class="lbl">İl / İlçe</td><td class="val">{{province}} / {{district}}</td></tr>
    <tr><td class="lbl">Çalıştığı Kurum</td><td class="val">{{institution}}</td></tr>
    <tr><td class="lbl">Bağlı Olduğu Şube</td><td class="val">{{branch}}</td></tr>
    <tr><td class="lbl">Görev Birimi</td><td class="val">{{dutyUnit}}</td></tr>
    <tr><td class="lbl">Kurum Adresi</td><td class="val">{{institutionAddress}}</td></tr>
    <tr><td class="lbl">Üye Grubu</td><td class="val">{{memberGroup}}</td></tr>
    <tr><td class="lbl">Üyelik Tarihi</td><td class="val">{{joinDate}}</td></tr>
    <tr><td class="lbl">YK Karar Tarihi / Defter No</td><td class="val">{{boardDecisionDate}} / {{boardDecisionBookNo}}</td></tr>
    <tr><td class="lbl">Üyelik Bilgi Seçeneği</td><td class="val">{{membershipInfoOption}}</td></tr>
  </table>

  <div class="body-text">
    Yukarıda açık kimliği belirtilen <b>{{fullName}}</b>, <b>{{memberNumber}}</b> üye numarası ile
    <b>{{applicationDate}}</b> tarihinde sendikamıza başvuruda bulunarak üyelik işlemlerini tamamlamış olup,
    <b>{{joinDate}} – hâlen</b> tarihleri arasında sendikamız üyesi olarak kayıtlıdır.
    İlgili üyenin üyelik kaydı belirtilen tarihler arasında geçerli olarak tesis edilmiştir.
    Üyeliğin sona ermesi hâlinde, üyelik bitiş tarihinden itibaren sendikamız ile herhangi bir üyelik,
    temsil, yetki veya sorumluluk ilişkisi bulunmamaktadır.
  </div>

  <div class="decision-note">İş bu belge adı geçenin talebi üzerine verilmiştir.</div>

  <div class="sig-block">
    <div>Sendika Yönetimi</div>
    <div class="sig-name">İmza / Kaşe</div>
  </div>

</div>`,
  },
  {
    name: 'Kesinti Listesi Şablonu',
    description: 'Kurumlara gönderilecek aylık aidat kesinti listesi talep yazısı',
    type: DocumentTemplateType.LETTER,
    isActive: true,
    template: `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; }
  .doc { padding: 14mm 20mm 12mm; }
  body[data-header-paper="true"] .doc { padding: 3mm 20mm 12mm; }

  .meta-block { font-size: 10.5pt; line-height: 1.9; margin-bottom: 8mm; }
  .meta-row { display: flex; }
  .meta-label { width: 12mm; }
  .meta-sep { width: 6mm; }
  .meta-date { position: absolute; right: 20mm; top: 14mm; font-size: 10.5pt; }
  body[data-header-paper="true"] .meta-date { top: 3mm; }

  .recipient { font-size: 11pt; font-weight: bold; margin-bottom: 8mm; }

  .body-text { font-size: 11pt; line-height: 1.8; text-align: justify; margin-bottom: 10mm; }

  .closing { font-size: 11pt; line-height: 1.8; text-align: justify; margin-bottom: 20mm; }

  .sig-area { display: flex; justify-content: flex-end; margin-bottom: 14mm; }
  .sig-block { text-align: center; font-size: 11pt; line-height: 1.7; min-width: 70mm; }
  .sig-block .sig-name { font-weight: bold; }

  .footer-info { font-size: 9.5pt; line-height: 1.7; color: #000; border-top: 1px solid #000; padding-top: 3mm; margin-top: 4mm; }
</style>

<div class="doc" style="position:relative;">

  <div class="meta-date">{{date}}</div>

  <div class="meta-block">
    <div class="meta-row"><span class="meta-label">Sayı</span><span class="meta-sep">:</span><span>{{sayi}}</span></div>
    <div class="meta-row"><span class="meta-label">Konu</span><span class="meta-sep">:</span><span>Sendika Kesinti Listesi Hk.</span></div>
  </div>

  <div class="recipient">{{kurumAdi}}</div>

  <div class="body-text">
    Demokratik Sağlık Sen Anadolu Şubesinin Başkan Yardımcısıyım.
    <b>{{kurumAdi}}</b> bulunan Üyelerimizin Aidat Kesinti Listelerinin Aylık Olarak
    <b>demokratiksagliksenanadolusube@gmail.com</b> adresine ya da
    <b>0506 581 85 48</b> telefon numarasına WhatsApp üzerinden gönderilmesi hususunda;
  </div>

  <div class="closing">
    Gereğini bilgilerinize arz/rica ederim. &nbsp;&nbsp;&nbsp; {{date}}
  </div>

  <div class="sig-area">
    <div class="sig-block">
      <div class="sig-name">MUSTAFA KUZUGÜDEN</div>
      <div>DEMOKRATİK SAĞLIK SEN</div>
      <div>ANADOLU ŞUBESİ BAŞKAN YARDIMCISI</div>
    </div>
  </div>

  <div class="footer-info">
    <div>Adres: İsmet Kaptan Mahallesi Şevket Özçelik Sk. No: 57 A Kat: 3 Daire: 308 Konak/İzmir</div>
    <div>Telefon: 0552 248 51 12</div>
  </div>

</div>`,
  },
  {
    name: 'Toplu Üye Listesi Üst Yazısı',
    description: 'Seçilen üyelerin kesinti bilgilerini içeren toplu üye listesi üst yazısı (tek PDF, tüm üyeler tabloda)',
    type: DocumentTemplateType.BULK_MEMBER_LIST,
    isActive: true,
    template: `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", Times, serif; font-size: 10pt; color: #000; }
  .doc { padding: 10mm 18mm 8mm; }
  body[data-header-paper="true"] .doc { padding: 3mm 18mm 8mm; }

  .meta-date { position: absolute; right: 18mm; top: 10mm; font-size: 9.5pt; }
  body[data-header-paper="true"] .meta-date { top: 3mm; }

  .meta-block { font-size: 9.5pt; line-height: 1.5; margin-bottom: 4mm; }
  .meta-row { display: flex; }
  .meta-label { width: 12mm; }
  .meta-sep { width: 6mm; }

  .recipient { font-size: 10pt; font-weight: bold; margin-bottom: 4mm; }

  .body-text { font-size: 10pt; line-height: 1.5; text-align: justify; margin-bottom: 3mm; text-indent: 10mm; }

  .member-table { width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 9pt; }
  .member-table th { border: 1px solid #000; padding: 1mm 2mm; text-align: center; font-weight: bold; background: #f0f0f0; }
  .member-table td { border: 1px solid #000; padding: 1mm 2mm; text-align: left; vertical-align: middle; line-height: 1.25; }
  .member-table td:first-child { text-align: center; width: 8mm; }
  .member-table td:nth-child(3) { text-align: center; width: 28mm; }
  .member-table td:last-child { text-align: center; width: 18mm; }

  .closing { font-size: 10pt; line-height: 1.6; margin-top: 3mm; margin-bottom: 8mm; text-indent: 10mm; }

  .sig-area { display: flex; justify-content: flex-end; margin-bottom: 5mm; }
  .sig-block { text-align: center; font-size: 10pt; line-height: 1.5; min-width: 70mm; }
  .sig-block .sig-name { font-weight: bold; margin-top: 6mm; }

  .doc-footer { border-top: 1px solid #000; padding-top: 2mm; font-size: 8pt; color: #333; font-style: italic; margin-top: 5mm; }
</style>

<div class="doc" style="position:relative;">

  <div class="meta-date">{{date}}</div>

  <div class="meta-block">
    <div class="meta-row"><span class="meta-label">Sayı</span><span class="meta-sep">:</span><span>{{sayi}}</span></div>
    <div class="meta-row"><span class="meta-label">Konu</span><span class="meta-sep">:</span><span>Üye Kesintileri Hakkında</span></div>
  </div>

  <div class="recipient">{{tevkifatMerkezi}}</div>

  <div class="body-text">
    Aşağıda adı ve soyadı belirtilen kurumunuz çalışanlarının sendikamıza üyelik başvuruları
    Yönetim Kurulumuzca kabul edilerek kesinleşmiştir. Üyelerimizin adı, soyadı, unvanı, birimi
    ve üye numaraları aşağıya çıkarılmıştır. Üyelerimizin üye kayıt formlarının özlük dosyalarına
    konulmasını, tayin ve nakil işlemlerinde sendikamız üyesi olduğunun maaş nakil ilmühaberine
    yazılması yönetmelik gereği zorunluluk arz etmektedir.
  </div>

  <div class="body-text">
    4688 Sayılı Yasanın 25 inci maddesine istinaden üyelerin maaşlarından (Damga vergisine tabi
    unsurlardan) %0,5 (binde beş) oranında kesinti yapılarak 5 (beş) gün içinde Vakıfbank Gazi
    Bulvarı (İZMİR) Şubesi 00158007298431554 no'lu sendikamız hesabına
    (IBAN: TR700001500158007298431554) havalesi ile dekont ve kesinti listesinin bir örneğinin
    her ay düzenli olarak sendikamız <b>demokratiksagliksen@gmail.com</b> ve
    <b>demokratiksagliksenanadolusube@gmail.com</b> adresine gönderilmesini rica ederiz.
  </div>

  <table class="member-table">
    <thead>
      <tr>
        <th>#</th>
        <th>ADI SOYADI</th>
        <th>TC KİMLİK NO</th>
        <th>ÜNVANI</th>
        <th>ÜYE NO</th>
      </tr>
    </thead>
    <tbody>
      {{memberTable}}
    </tbody>
  </table>

  <div class="closing">
    Gereğini bilgilerinize arz/rica ederiz. &nbsp;&nbsp;&nbsp; {{date}}
  </div>

  <div class="sig-area" style="justify-content: space-between;">
    <div class="sig-block">
      <div class="sig-name">Abdülkadir BAĞCI</div>
      <div>Genel Başkan Yardımcısı</div>
    </div>
    <div class="sig-block">
      <div class="sig-name">Togan DEMİRCAN</div>
      <div>Genel Başkan</div>
    </div>
  </div>

  <div class="doc-footer">
    Bu belge, {{date}} tarihinde dijital ortamda oluşturulmuş olup ıslak imza olmadıkça geçerli değildir.
  </div>

</div>`,
  },
  {
    name: 'İl Disiplin Katılım Belgesi',
    description: 'Üye hakkında yapılacak il disiplin kurulu toplantısına sendika temsilcisinin katılacağını bildiren resmi yazı',
    type: DocumentTemplateType.LETTER,
    isActive: true,
    template: `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; }
  .doc { padding: 14mm 20mm 10mm; }
  body[data-header-paper="true"] .doc { padding: 3mm 20mm 10mm; }

  .meta-date { position: absolute; right: 20mm; top: 14mm; font-size: 10.5pt; }
  body[data-header-paper="true"] .meta-date { top: 3mm; }

  .meta-block { font-size: 10.5pt; line-height: 1.9; margin-bottom: 7mm; }
  .meta-row { display: flex; }
  .meta-label { width: 12mm; }
  .meta-sep { width: 6mm; }

  .tc-header { text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 2mm; }
  .recipient { font-size: 11pt; font-weight: bold; margin-bottom: 2mm; text-align: center; }
  .sub-recipient { font-size: 11pt; margin-bottom: 7mm; text-align: center; }

  .ilgi { font-size: 10.5pt; line-height: 1.7; margin-bottom: 6mm; }
  .ilgi-title { font-weight: bold; }

  .body-text { font-size: 11pt; line-height: 1.8; text-align: justify; margin-bottom: 10mm; }

  .closing { font-size: 11pt; line-height: 1.8; margin-bottom: 20mm; }

  .sig-area { display: flex; justify-content: space-around; margin-bottom: 8mm; }
  .sig-block { text-align: center; font-size: 11pt; line-height: 1.7; min-width: 60mm; }
  .sig-block .sig-name { font-weight: bold; margin-top: 9mm; }

  .doc-footer { border-top: 1px solid #000; padding-top: 3mm; font-size: 8.5pt; color: #333; font-style: italic; margin-top: 35mm; }
</style>

<div class="doc" style="position:relative;">

  <div class="meta-date">{{date}}</div>

  <div class="meta-block">
    <div class="meta-row"><span class="meta-label">Sayı</span><span class="meta-sep">:</span><span>{{sayi}}</span></div>
    <div class="meta-row"><span class="meta-label">Konu</span><span class="meta-sep">:</span><span>İl Disiplin Kurulu Temsilci Görevlendirmesi Hk.</span></div>
  </div>

  <div class="tc-header">T.C</div>
  <div class="recipient">{{valiligi}} VALİLİĞİ</div>
  <div class="sub-recipient">(İl İdare Kurulu Müdürlüğüne)</div>

  <div class="ilgi">
    <span class="ilgi-title">İlgi:</span> a) {{ilgiRef}}
  </div>

  <div class="body-text">
    İlgide Bahsettiğiniz Durum İçin Sendikamız Üyesi <b>{{fullName}}</b> hakkında
    <b>{{kurulTarihi}}</b> tarihinde saat <b>{{kurulSaati}}</b>'da yapılacak olan
    İl Disiplin Kurulu Toplantısına <b>{{katilimci}}</b> katılacaktır.
  </div>

  <div class="closing">
    Gereğini bilgilerinize arz ederim. &nbsp;&nbsp;&nbsp; {{date}}
  </div>

  <div class="sig-area">
    <div class="sig-block">
      <div class="sig-name">METİN YILMAZ</div>
      <div>DEMOKRATİK SAĞLIK SEN</div>
      <div>ANADOLU ŞUBESİ BAŞKAN VEKİLİ</div>
    </div>
    <div class="sig-block">
      <div class="sig-name">ABDULLAH GÜL</div>
      <div>DEMOKRATİK SAĞLIK SEN</div>
      <div>ANADOLU ŞUBE BAŞKANI</div>
    </div>
  </div>

  <div class="doc-footer">
    Bu belge, {{date}} tarihinde dijital ortamda oluşturulmuş olup ıslak imza olmadıkça geçerli değildir.
  </div>

</div>`,
  },
  {
    name: 'Pano İstek Yazısı',
    description: 'Kurumlara sendika panosu için yer tahsisi talep eden resmi yazı',
    type: DocumentTemplateType.LETTER,
    isActive: true,
    template: `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; }
  .doc { padding: 14mm 20mm 12mm; }
  body[data-header-paper="true"] .doc { padding: 3mm 20mm 12mm; }

  .meta-date { position: absolute; right: 20mm; top: 14mm; font-size: 10.5pt; }
  body[data-header-paper="true"] .meta-date { top: 3mm; }

  .meta-block { font-size: 10.5pt; line-height: 1.9; margin-bottom: 8mm; }
  .meta-row { display: flex; }
  .meta-label { width: 12mm; }
  .meta-sep { width: 6mm; }

  .recipient { font-size: 11pt; font-weight: bold; margin-bottom: 8mm; }

  .body-text { font-size: 11pt; line-height: 1.8; text-align: justify; margin-bottom: 10mm; text-indent: 10mm; }

  .closing { font-size: 11pt; line-height: 1.8; text-align: justify; margin-bottom: 20mm; text-indent: 10mm; }

  .sig-area { display: flex; justify-content: flex-end; margin-bottom: 10mm; }
  .sig-block { text-align: center; font-size: 11pt; line-height: 1.7; min-width: 70mm; }
  .sig-block .sig-name { font-weight: bold; }

  .contact-info { font-size: 10pt; line-height: 1.7; margin-bottom: 4mm; }

  .doc-footer { border-top: 1px solid #000; padding-top: 3mm; font-size: 8.5pt; color: #333; font-style: italic; margin-top: 35mm; }
</style>

<div class="doc" style="position:relative;">

  <div class="meta-date">{{date}}</div>

  <div class="meta-block">
    <div class="meta-row"><span class="meta-label">Sayı</span><span class="meta-sep">:</span><span>{{sayi}}</span></div>
    <div class="meta-row"><span class="meta-label">Konu</span><span class="meta-sep">:</span><span>Sendika Panosu Hk.</span></div>
  </div>

  <div class="recipient">{{kurumAdi}}</div>

  <div class="body-text">
    Demokratik Sağlık Sen Anadolu Şubesinin Başkan Yardımcısıyım. Kurumunuz olan
    <b>{{kurumAdi}}</b> hizmet binasında sendikal faaliyetlerimiz ile ilgili üyelerimizi ve
    kamu görevlilerini bilgilendirmek amacıyla, 4688 Sayılı Sendikalar Kanunun 23. Maddesi ve
    Başbakanlık 2003/27 sayılı genelgesine istinaden yer tahsisi konusunda tarafımıza yazılı
    olarak bildirerek;
  </div>

  <div class="closing">
    Gereğini bilgilerinize arz/rica ederim. &nbsp;&nbsp;&nbsp; {{date}}
  </div>

  <div class="sig-area">
    <div class="sig-block">
      <div class="sig-name">MUSTAFA KUZUGÜDEN</div>
      <div>DEMOKRATİK SAĞLIK SEN</div>
      <div>ANADOLU ŞUBESİ BAŞKAN YARDIMCISI</div>
    </div>
  </div>

  <div class="contact-info">
    <div>Adres: İsmet Kaptan Mahallesi Şevket Özçelik Sk. No: 57 A Kat: 3 Daire: 308 Konak/İzmir</div>
    <div>Telefon: 0552 248 51 12</div>
  </div>

  <div class="doc-footer">
    Bu belge, {{date}} tarihinde dijital ortamda oluşturulmuş olup ıslak imza olmadıkça geçerli değildir.
  </div>

</div>`,
  },
  {
    name: 'İşyeri Temsilciliği Yazısı',
    description: 'Üyenin işyeri temsilcisi olarak atandığını bildiren resmi kurum yazısı',
    type: DocumentTemplateType.LETTER,
    isActive: true,
    template: `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; }
  .doc { padding: 14mm 20mm 10mm; }
  body[data-header-paper="true"] .doc { padding: 3mm 20mm 10mm; }

  .meta-date { position: absolute; right: 20mm; top: 14mm; font-size: 10.5pt; }
  body[data-header-paper="true"] .meta-date { top: 3mm; }

  .meta-block { font-size: 10.5pt; line-height: 1.9; margin-bottom: 7mm; }
  .meta-row { display: flex; }
  .meta-label { width: 12mm; }
  .meta-sep { width: 6mm; }

  .recipient { font-size: 11pt; font-weight: bold; margin-bottom: 7mm; }

  .ilgi { font-size: 10.5pt; line-height: 1.7; margin-bottom: 6mm; }
  .ilgi-title { font-weight: bold; }

  .body-text { font-size: 11pt; line-height: 1.8; text-align: justify; margin-bottom: 5mm; text-indent: 10mm; }

  ul.yetkiler { margin: 4mm 0 4mm 8mm; font-size: 11pt; line-height: 1.8; }
  ul.yetkiler li { margin-bottom: 1mm; }

  .closing { font-size: 11pt; line-height: 1.8; margin-bottom: 10mm; }

  .sig-area { display: flex; justify-content: space-around; margin-bottom: 8mm; }
  .sig-block { text-align: center; font-size: 11pt; line-height: 1.7; min-width: 60mm; }
  .sig-block .sig-name { font-weight: bold; margin-top: 9mm; }

  .doc-footer { border-top: 1px solid #000; padding-top: 3mm; font-size: 8.5pt; color: #333; font-style: italic; margin-top: 20mm; }
</style>

<div class="doc" style="position:relative;">

  <div class="meta-date">{{date}}</div>

  <div class="meta-block">
    <div class="meta-row"><span class="meta-label">Sayı</span><span class="meta-sep">:</span><span>{{sayi}}</span></div>
    <div class="meta-row"><span class="meta-label">Konu</span><span class="meta-sep">:</span><span>İşyeri Temsilciliği Hk.</span></div>
  </div>

  <div class="recipient">{{kurumAdi}}</div>

  <div class="ilgi">
    <span class="ilgi-title">İlgi:</span> a) 4688 Sayılı Kamu Görevlileri Sendikaları Ve Toplu Sözleşme Kanunu, Başbakanlığın 2003/37 Sayılı Genelgesi
  </div>

  <div class="body-text">
    Kurumunuzda görev yapmakta olan <b>{{memberNumber}}</b> Numaralı <b>{{fullName}}</b>
    (TC: {{nationalId}}) Genel Merkez Yönetim Kurulunun <b>{{kararTarihi}}</b> tarih
    <b>{{kararSayisi}}</b> sayılı kararı ile <b>"DEMOKRATİK SAĞLIK SEN" İşyeri Temsilcisi</b>
    olarak atanmıştır.
  </div>

  <div class="body-text" style="text-indent:0;">
    İlgide kayıtlı Kanun ve Başbakanlığın 2003/37 sayılı Genelgesi gereği adı geçenin;
  </div>

  <ul class="yetkiler">
    <li>Kurumunuz yöneticileri ile diyaloğa girilerek kamuda verimliliğin artırılması için görüş ve önerilerde bulunmaya,</li>
    <li>İşyeri sınırları içerisinde üye kaydetmeye,</li>
    <li>Sendika amaçları doğrultusunda toplantılar yapmaya,</li>
    <li>Yasalarımız, Tüzüğümüz ve Genel Yönetim Kurulunun verdiği tüm görevleri yerine getirmekle yetkili kılınmıştır.</li>
  </ul>

  <div class="closing">İlgililere tebliği hususunu bilgilerinize sunarız.</div>

  <div class="sig-area">
    <div class="sig-block">
      <div class="sig-name">METİN YILMAZ</div>
      <div>DEMOKRATİK SAĞLIK SEN</div>
      <div>ANADOLU ŞUBESİ BAŞKAN VEKİLİ</div>
    </div>
    <div class="sig-block">
      <div class="sig-name">ABDULLAH GÜL</div>
      <div>DEMOKRATİK SAĞLIK SEN</div>
      <div>ANADOLU ŞUBE BAŞKANI</div>
    </div>
  </div>

  <div class="doc-footer">
    Bu belge, {{date}} tarihinde dijital ortamda oluşturulmuş olup ıslak imza olmadıkça geçerli değildir.
  </div>

</div>`,
  },
  {
    name: 'İlçe Temsilciliği Yazısı',
    description: 'Üyenin ilçe temsilcisi olarak atandığını bildiren resmi kurum yazısı',
    type: DocumentTemplateType.LETTER,
    isActive: true,
    template: `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; }
  .doc { padding: 14mm 20mm 10mm; }
  body[data-header-paper="true"] .doc { padding: 3mm 20mm 10mm; }

  .meta-date { position: absolute; right: 20mm; top: 14mm; font-size: 10.5pt; }
  body[data-header-paper="true"] .meta-date { top: 3mm; }

  .meta-block { font-size: 10.5pt; line-height: 1.9; margin-bottom: 7mm; }
  .meta-row { display: flex; }
  .meta-label { width: 12mm; }
  .meta-sep { width: 6mm; }

  .recipient { font-size: 11pt; font-weight: bold; margin-bottom: 7mm; }

  .ilgi { font-size: 10.5pt; line-height: 1.7; margin-bottom: 6mm; }
  .ilgi-title { font-weight: bold; }

  .body-text { font-size: 11pt; line-height: 1.8; text-align: justify; margin-bottom: 5mm; text-indent: 10mm; }

  ul.yetkiler { margin: 4mm 0 4mm 8mm; font-size: 11pt; line-height: 1.8; }
  ul.yetkiler li { margin-bottom: 1mm; }

  .closing { font-size: 11pt; line-height: 1.8; margin-bottom: 10mm; }

  .sig-area { display: flex; justify-content: space-around; margin-bottom: 8mm; }
  .sig-block { text-align: center; font-size: 11pt; line-height: 1.7; min-width: 60mm; }
  .sig-block .sig-name { font-weight: bold; margin-top: 9mm; }

  .doc-footer { border-top: 1px solid #000; padding-top: 3mm; font-size: 8.5pt; color: #333; font-style: italic; margin-top: 20mm; }
</style>

<div class="doc" style="position:relative;">

  <div class="meta-date">{{date}}</div>

  <div class="meta-block">
    <div class="meta-row"><span class="meta-label">Sayı</span><span class="meta-sep">:</span><span>{{sayi}}</span></div>
    <div class="meta-row"><span class="meta-label">Konu</span><span class="meta-sep">:</span><span>{{ilceAdi}} İlçesi Temsilciliği Hk.</span></div>
  </div>

  <div class="recipient">{{kurumAdi}}</div>

  <div class="ilgi">
    <span class="ilgi-title">İlgi:</span> a) 4688 Sayılı Kamu Görevlileri Sendikaları Ve Toplu Sözleşme Kanunu, Başbakanlığın 2003/37 Sayılı Genelgesi
  </div>

  <div class="body-text">
    Kurumunuzda görev yapmakta olan <b>{{memberNumber}}</b> Numaralı <b>{{fullName}}</b>
    (TC: {{nationalId}}) Genel Merkez Yönetim Kurulunun <b>{{kararTarihi}}</b> tarih
    <b>{{kararSayisi}}</b> sayılı kararı ile <b>"DEMOKRATİK SAĞLIK SEN" {{ilceAdi}} İlçe Temsilcisi</b>
    olarak atanmıştır.
  </div>

  <div class="body-text" style="text-indent:0;">
    İlgide kayıtlı Kanun ve Başbakanlığın 2003/37 sayılı Genelgesi gereği adı geçenin;
  </div>

  <ul class="yetkiler">
    <li>Kurumunuz yöneticileri ile diyaloğa girilerek kamuda verimliliğin artırılması için görüş ve önerilerde bulunmaya,</li>
    <li>İşyeri sınırları içerisinde üye kaydetmeye,</li>
    <li>Sendika amaçları doğrultusunda toplantılar yapmaya,</li>
    <li>Yasalarımız, Tüzüğümüz ve Genel Yönetim Kurulunun verdiği tüm görevleri yerine getirmekle yetkili kılınmıştır.</li>
  </ul>

  <div class="closing">İlgililere tebliği hususunu bilgilerinize sunarız.</div>

  <div class="sig-area">
    <div class="sig-block">
      <div class="sig-name">METİN YILMAZ</div>
      <div>DEMOKRATİK SAĞLIK SEN</div>
      <div>ANADOLU ŞUBESİ BAŞKAN VEKİLİ</div>
    </div>
    <div class="sig-block">
      <div class="sig-name">ABDULLAH GÜL</div>
      <div>DEMOKRATİK SAĞLIK SEN</div>
      <div>ANADOLU ŞUBE BAŞKANI</div>
    </div>
  </div>

  <div class="doc-footer">
    Bu belge, {{date}} tarihinde dijital ortamda oluşturulmuş olup ıslak imza olmadıkça geçerli değildir.
  </div>

</div>`,
  },
  {
    name: 'İl Temsilciliği Yazısı',
    description: 'Üyenin il temsilcisi olarak atandığını bildiren resmi kurum yazısı',
    type: DocumentTemplateType.LETTER,
    isActive: true,
    template: `
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; }
  .doc { padding: 14mm 20mm 10mm; }
  body[data-header-paper="true"] .doc { padding: 3mm 20mm 10mm; }

  .meta-date { position: absolute; right: 20mm; top: 14mm; font-size: 10.5pt; }
  body[data-header-paper="true"] .meta-date { top: 3mm; }

  .meta-block { font-size: 10.5pt; line-height: 1.9; margin-bottom: 7mm; }
  .meta-row { display: flex; }
  .meta-label { width: 12mm; }
  .meta-sep { width: 6mm; }

  .recipient { font-size: 11pt; font-weight: bold; margin-bottom: 7mm; }

  .ilgi { font-size: 10.5pt; line-height: 1.7; margin-bottom: 6mm; }
  .ilgi-title { font-weight: bold; }

  .body-text { font-size: 11pt; line-height: 1.8; text-align: justify; margin-bottom: 5mm; text-indent: 10mm; }

  ul.yetkiler { margin: 4mm 0 4mm 8mm; font-size: 11pt; line-height: 1.8; }
  ul.yetkiler li { margin-bottom: 1mm; }

  .closing { font-size: 11pt; line-height: 1.8; margin-bottom: 10mm; }

  .sig-area { display: flex; justify-content: space-around; margin-bottom: 8mm; }
  .sig-block { text-align: center; font-size: 11pt; line-height: 1.7; min-width: 60mm; }
  .sig-block .sig-name { font-weight: bold; margin-top: 9mm; }

  .doc-footer { border-top: 1px solid #000; padding-top: 3mm; font-size: 8.5pt; color: #333; font-style: italic; margin-top: 20mm; }
</style>

<div class="doc" style="position:relative;">

  <div class="meta-date">{{date}}</div>

  <div class="meta-block">
    <div class="meta-row"><span class="meta-label">Sayı</span><span class="meta-sep">:</span><span>{{sayi}}</span></div>
    <div class="meta-row"><span class="meta-label">Konu</span><span class="meta-sep">:</span><span>{{ilAdi}} İli Temsilciliği Hk.</span></div>
  </div>

  <div class="recipient">{{kurumAdi}}</div>

  <div class="ilgi">
    <span class="ilgi-title">İlgi:</span> a) 4688 Sayılı Kamu Görevlileri Sendikaları Ve Toplu Sözleşme Kanunu, Başbakanlığın 2003/37 Sayılı Genelgesi
  </div>

  <div class="body-text">
    Kurumunuzda görev yapmakta olan <b>{{memberNumber}}</b> Numaralı <b>{{fullName}}</b>
    (TC: {{nationalId}}) Genel Merkez Yönetim Kurulunun <b>{{kararTarihi}}</b> tarih
    <b>{{kararSayisi}}</b> sayılı kararı ile <b>"DEMOKRATİK SAĞLIK SEN" {{ilAdi}} İl Temsilcisi</b>
    olarak atanmıştır.
  </div>

  <div class="body-text" style="text-indent:0;">
    İlgide kayıtlı Kanun ve Başbakanlığın 2003/37 sayılı Genelgesi gereği adı geçenin;
  </div>

  <ul class="yetkiler">
    <li>Kurumunuz yöneticileri ile diyaloğa girilerek kamuda verimliliğin artırılması için görüş ve önerilerde bulunmaya,</li>
    <li>İşyeri sınırları içerisinde üye kaydetmeye,</li>
    <li>Sendika amaçları doğrultusunda toplantılar yapmaya,</li>
    <li>Yasalarımız, Tüzüğümüz ve Genel Yönetim Kurulunun verdiği tüm görevleri yerine getirmekle yetkili kılınmıştır.</li>
  </ul>

  <div class="closing">İlgililere tebliği hususunu bilgilerinize sunarız.</div>

  <div class="sig-area">
    <div class="sig-block">
      <div class="sig-name">METİN YILMAZ</div>
      <div>DEMOKRATİK SAĞLIK SEN</div>
      <div>ANADOLU ŞUBESİ BAŞKAN VEKİLİ</div>
    </div>
    <div class="sig-block">
      <div class="sig-name">ABDULLAH GÜL</div>
      <div>DEMOKRATİK SAĞLIK SEN</div>
      <div>ANADOLU ŞUBE BAŞKANI</div>
    </div>
  </div>

  <div class="doc-footer">
    Bu belge, {{date}} tarihinde dijital ortamda oluşturulmuş olup ıslak imza olmadıkça geçerli değildir.
  </div>

</div>`,
  },
];

export async function upsertDocumentTemplates(client: PrismaClient = prisma) {
  console.log('📄 Doküman şablonları ekleniyor / güncelleniyor...');

  for (const t of DOCUMENT_TEMPLATES) {
    const existing = await client.documentTemplate.findFirst({
      where: { name: t.name, type: t.type },
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      await client.documentTemplate.update({
        where: { id: existing.id },
        data: {
          description: t.description,
          template: t.template,
          isActive: t.isActive ?? true,
        },
      });
      console.log(`   ✅ Güncellendi: ${t.name} (${t.type})`);
    } else {
      await client.documentTemplate.create({
        data: {
          name: t.name,
          description: t.description,
          template: t.template,
          type: t.type,
          isActive: t.isActive ?? true,
        },
      });
      console.log(`   ✅ Oluşturuldu: ${t.name} (${t.type})`);
    }
  }

  console.log(`   ✅ ${DOCUMENT_TEMPLATES.length} şablon işlendi`);
}

async function main() {
  console.log('🌱 seed5: Doküman şablonları ekleniyor...');
  await upsertDocumentTemplates();
  console.log('\n✅ seed5 tamamlandı.');
}

main()
  .catch((e) => {
    console.error('❌ seed5 hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
