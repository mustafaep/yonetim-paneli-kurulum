import { PrismaClient, DocumentTemplateType } from '@prisma/client';

const prisma = new PrismaClient();

type SeedTemplate = {
  name: string;
  description: string;
  type: DocumentTemplateType;
  template: string;
  isActive?: boolean;
};

const templates: SeedTemplate[] = [
  {
    name: 'Üye Kartı',
    description: 'Üye kartı (modern kart tasarımı, A4 üzerinde ortalanmış)',
    type: DocumentTemplateType.MEMBER_CARD,
    isActive: true,
    template: `
<style>
  .card-doc { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif; color: #0f172a; }
  .card-page { display:flex; align-items:center; justify-content:center; min-height: 297mm; padding: 18mm 16mm; box-sizing: border-box; }
  body[data-header-paper="true"] .card-page { padding: 0 !important; min-height: auto !important; }

  .member-card {
    width: 88mm;
    border-radius: 14px;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 10px 30px rgba(2, 6, 23, .14);
    border: 1px solid rgba(15, 23, 42, .10);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .member-card__top {
    position: relative;
    padding: 12px 14px 10px 14px;
    background: linear-gradient(135deg, #0b3a7a 0%, #1556b6 55%, #0ea5e9 120%);
    color: #fff;
  }
  .member-card__top:after {
    content:"";
    position:absolute;
    inset: 0;
    background:
      radial-gradient(600px 180px at 20% -30%, rgba(255,255,255,.22), transparent 60%),
      radial-gradient(420px 220px at 110% 10%, rgba(255,255,255,.18), transparent 60%),
      linear-gradient(180deg, rgba(2,6,23,.06), transparent 40%);
    pointer-events:none;
  }
  .brand-title { position: relative; z-index:1; letter-spacing: .9px; font-weight: 800; font-size: 10.2pt; }
  .brand-sub  { position: relative; z-index:1; margin-top: 2px; font-size: 8.5pt; opacity: .92; }
  .member-card__body { padding: 12px 14px 10px; }

  .identity-row { display:flex; gap: 10px; align-items: flex-start; }
  .photo {
    width: 26mm; height: 32mm;
    border-radius: 10px;
    overflow: hidden;
    background: #f1f5f9;
    border: 1px solid rgba(15, 23, 42, .12);
    flex: 0 0 auto;
  }
  .photo img { width:100%; height:100%; object-fit: cover; display:block; }
  .name { font-size: 12.2pt; font-weight: 900; letter-spacing: .2px; margin: 2px 0 6px; }
  .meta { font-size: 8.9pt; color: #334155; line-height: 1.45; }
  .meta b { color:#0f172a; }

  .grid { margin-top: 10px; display:grid; grid-template-columns: 1fr 1fr; gap: 8px 10px; }
  .kv { border: 1px solid rgba(15, 23, 42, .08); background: rgba(241,245,249,.65); border-radius: 10px; padding: 7px 9px; }
  .k { font-size: 7.7pt; letter-spacing:.35px; text-transform: uppercase; color:#64748b; }
  .v { margin-top: 2px; font-size: 9.1pt; font-weight: 700; color:#0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .member-card__footer {
    display:flex; justify-content: space-between; gap: 10px;
    padding: 9px 14px;
    border-top: 1px solid rgba(15, 23, 42, .08);
    font-size: 8.2pt; color:#475569;
    background: #fff;
  }
  .chip { display:inline-block; padding: 3px 8px; border-radius: 999px; background: rgba(14,165,233,.12); color:#075985; font-weight: 700; }
</style>

<div class="card-doc">
  <div class="card-page">
    <div class="member-card">
      <div class="member-card__top">
        <div class="brand-title">SENDİKA ÜYE KARTI</div>
        <div class="brand-sub">Resmî üyelik kimliği</div>
      </div>

      <div class="member-card__body">
        <div class="identity-row">
          <div class="photo">
            <img src="{{photoDataUrl}}" alt="Fotoğraf" />
          </div>
          <div style="flex:1; min-width: 0;">
            <div class="name">{{firstName}} {{lastName}}</div>
            <div class="meta">
              <div><span style="color:#64748b;">Üye No:</span> <b>{{memberNumber}}</b></div>
              <div><span style="color:#64748b;">T.C.:</span> <b>{{nationalId}}</b></div>
              <div><span style="color:#64748b;">İl/İlçe:</span> <b>{{province}}</b> / <b>{{district}}</b></div>
            </div>
          </div>
        </div>

        <div class="grid">
          <div class="kv">
            <div class="k">Kurum</div>
            <div class="v">{{institution}}</div>
          </div>
          <div class="kv">
            <div class="k">Şube</div>
            <div class="v">{{branch}}</div>
          </div>
          <div class="kv">
            <div class="k">Üyelik Tarihi</div>
            <div class="v">{{joinDate}}</div>
          </div>
          <div class="kv">
            <div class="k">Geçerlilik</div>
            <div class="v">{{validUntil}}</div>
          </div>
        </div>
      </div>

      <div class="member-card__footer">
        <div>Bu kart sendika üyeliğini belgeler.</div>
        <div class="chip">AKTİF</div>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    name: 'Davet Mektubu',
    description: 'Etkinlik / toplantı davet mektubu (modern, kurumsal)',
    type: DocumentTemplateType.INVITATION_LETTER,
    isActive: true,
    template: `
<style>
  .doc { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif; color:#0f172a; }
  .doc { padding: 18mm 16mm; box-sizing: border-box; }
  body[data-header-paper="true"] .doc { padding: 0 !important; }
  .muted { color:#475569; }
  .topbar { display:flex; align-items:flex-start; justify-content:space-between; gap: 14px; }
  .badge { display:inline-block; padding: 4px 10px; border-radius: 999px; font-size: 8.5pt; font-weight: 800; letter-spacing:.55px; background: rgba(14,165,233,.12); color:#075985; }
  .date { font-size: 10pt; color:#475569; }
  .title { margin-top: 10px; font-size: 16pt; font-weight: 900; letter-spacing:.4px; }
  .subtitle { margin-top: 2px; font-size: 10pt; color:#64748b; }
  .hr { height: 1px; background: rgba(15, 23, 42, .10); margin: 12px 0 14px; }
  .salute { font-size: 11.5pt; font-weight: 700; }
  .p { margin-top: 10px; font-size: 11pt; line-height: 1.55; color:#0f172a; }
  .card { margin-top: 12px; border: 1px solid rgba(15, 23, 42, .10); background: rgba(241,245,249,.60); border-radius: 14px; padding: 12px 14px; }
  .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
  .kv .k { font-size: 8.2pt; letter-spacing:.4px; text-transform: uppercase; color:#64748b; }
  .kv .v { margin-top: 3px; font-size: 11pt; font-weight: 800; color:#0f172a; }
  .kv .v.normal { font-weight: 600; }
  .note { margin-top: 10px; font-size: 9.8pt; color:#475569; }
  .footer { margin-top: 18px; display:flex; justify-content:space-between; gap: 16px; align-items:flex-end; }
  .signature { text-align:right; min-width: 60mm; }
  .signature .org { font-weight: 800; }
  .signature .line { margin-top: 26px; height: 1px; background: rgba(15, 23, 42, .20); }
  .signature .hint { margin-top: 6px; font-size: 9pt; color:#64748b; }
</style>

<div class="doc">
  <div class="topbar">
    <div>
      <span class="badge">DAVET</span>
      <div class="title">Etkinlik Daveti</div>
      <div class="subtitle muted">Katılımınızı rica ederiz</div>
    </div>
    <div class="date">Tarih: <b>{{date}}</b></div>
  </div>

  <div class="hr"></div>

  <div class="salute">Sayın {{firstName}} {{lastName}},</div>
  <div class="p">
    Sendikamız tarafından düzenlenecek etkinliğimize katılımınızı memnuniyetle bekleriz.
  </div>

  <div class="card">
    <div class="grid">
      <div class="kv">
        <div class="k">Etkinlik</div>
        <div class="v">{{eventName}}</div>
      </div>
      <div class="kv">
        <div class="k">Tarih / Saat</div>
        <div class="v normal">{{eventDate}}</div>
      </div>
      <div class="kv" style="grid-column: 1 / -1;">
        <div class="k">Yer</div>
        <div class="v normal">{{eventPlace}}</div>
      </div>
    </div>
  </div>

  <div class="p" style="white-space:pre-wrap;">{{eventDescription}}</div>

  <div class="note">
    Not: Katılım durumunuzu <b>{{invitationDate}}</b> tarihine kadar bildirmenizi rica ederiz.
  </div>

  <div class="footer">
    <div class="muted" style="font-size:10pt;">
      Saygılarımızla,
    </div>
    <div class="signature">
      <div class="org">Sendika Yönetimi</div>
      <div class="line"></div>
      <div class="hint">İmza / Kaşe</div>
    </div>
  </div>
</div>`,
  },
  {
    name: 'Tebrik Mektubu',
    description: 'Tebrik mektubu (modern, kurumsal)',
    type: DocumentTemplateType.CONGRATULATION_LETTER,
    isActive: true,
    template: `
<style>
  .doc { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif; color:#0f172a; }
  .doc { padding: 18mm 16mm; box-sizing: border-box; }
  body[data-header-paper="true"] .doc { padding: 0 !important; }
  .topbar { display:flex; align-items:flex-start; justify-content:space-between; gap: 14px; }
  .badge { display:inline-block; padding: 4px 10px; border-radius: 999px; font-size: 8.5pt; font-weight: 800; letter-spacing:.55px; background: rgba(34,197,94,.14); color:#166534; }
  .date { font-size: 10pt; color:#475569; }
  .title { margin-top: 10px; font-size: 16pt; font-weight: 900; letter-spacing:.4px; }
  .subtitle { margin-top: 2px; font-size: 10pt; color:#64748b; }
  .hr { height: 1px; background: rgba(15, 23, 42, .10); margin: 12px 0 14px; }
  .salute { font-size: 11.5pt; font-weight: 700; }
  .highlight {
    margin-top: 12px;
    border: 1px solid rgba(15, 23, 42, .10);
    background: rgba(241,245,249,.60);
    border-radius: 14px;
    padding: 12px 14px;
  }
  .highlight .k { font-size: 8.2pt; letter-spacing:.4px; text-transform: uppercase; color:#64748b; }
  .highlight .v { margin-top: 4px; font-size: 13pt; font-weight: 900; color:#0f172a; }
  .p { margin-top: 12px; font-size: 11pt; line-height: 1.6; color:#0f172a; }
  .muted { color:#475569; }
  .footer { margin-top: 22px; display:flex; justify-content:space-between; gap: 16px; align-items:flex-end; }
  .signature { text-align:right; min-width: 60mm; }
  .signature .org { font-weight: 800; }
  .signature .line { margin-top: 26px; height: 1px; background: rgba(15, 23, 42, .20); }
  .signature .hint { margin-top: 6px; font-size: 9pt; color:#64748b; }
</style>

<div class="doc">
  <div class="topbar">
    <div>
      <span class="badge">TEBRİK</span>
      <div class="title">Tebrik Mektubu</div>
      <div class="subtitle">Başarınızı tebrik ederiz</div>
    </div>
    <div class="date">Tarih: <b>{{date}}</b></div>
  </div>

  <div class="hr"></div>

  <div class="salute">Sayın {{firstName}} {{lastName}},</div>

  <div class="highlight">
    <div class="k">Tebrik Sebebi</div>
    <div class="v" style="white-space:pre-wrap;">{{reason}}</div>
  </div>

  <div class="p" style="white-space:pre-wrap;">{{description}}</div>

  <div class="p">
    Bu vesileyle sizi tebrik eder, başarılarınızın devamını dileriz.
  </div>

  <div class="footer">
    <div class="muted" style="font-size:10pt;">
      Saygılarımızla,
    </div>
    <div class="signature">
      <div class="org">Sendika Yönetimi</div>
      <div class="line"></div>
      <div class="hint">İmza / Kaşe</div>
    </div>
  </div>
</div>`,
  },
];

async function main() {
  console.log('📄 Doküman şablonları senkronize ediliyor...');

  for (const t of templates) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { name: t.name, type: t.type },
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      await prisma.documentTemplate.update({
        where: { id: existing.id },
        data: {
          description: t.description,
          template: t.template,
          isActive: t.isActive ?? true,
        },
      });
      console.log(`   ✅ Güncellendi: ${t.name} (${t.type})`);
    } else {
      await prisma.documentTemplate.create({
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

  console.log('✅ Şablon senkronizasyonu tamamlandı.');
}

main()
  .catch((e) => {
    console.error('❌ Şablon senkronizasyon hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

