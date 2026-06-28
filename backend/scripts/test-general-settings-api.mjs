/**
 * Genel Sistem ayarları API testi.
 * Backend çalışırken: node scripts/test-general-settings-api.mjs
 * Varsayılan: http://localhost:3000 (PORT env ile değiştirilebilir)
 */
const BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const ADMIN = { email: 'admin@sendika.local', password: '123456' };

const results = { passed: 0, failed: 0, tests: [] };
function ok(name, condition, detail = '') {
  if (condition) {
    results.passed++;
    results.tests.push({ name, status: 'OK', detail });
    console.log(`  ✅ ${name}${detail ? ' – ' + detail : ''}`);
  } else {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', detail });
    console.log(`  ❌ ${name}${detail ? ' – ' + detail : ''}`);
  }
}

let token = null;
let originalSiteName = null;

async function main() {
  console.log('\n--- Genel Sistem API Testleri ---\n');
  console.log('1. Login (JWT alınıyor)...');
  try {
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ADMIN),
    });
    const loginBody = await loginRes.json();
    ok('POST /auth/login', loginRes.ok && loginBody.accessToken, loginRes.ok ? '' : JSON.stringify(loginBody));
    if (!loginRes.ok) {
      console.log('   Login başarısız, testler durduruluyor.');
      process.exit(1);
    }
    token = loginBody.accessToken;
  } catch (e) {
    ok('POST /auth/login (network)', false, e.message);
    process.exit(1);
  }

  const authHeader = { Authorization: `Bearer ${token}` };

  console.log('\n2. Sistem ayarları listesi...');
  try {
    const settingsRes = await fetch(`${BASE}/system/settings`, { headers: authHeader });
    const settingsList = await settingsRes.json();
    ok('GET /system/settings', settingsRes.ok && Array.isArray(settingsList), settingsRes.ok ? `(${settingsList.length} ayar)` : String(settingsList.message || settingsRes.status));
    if (settingsRes.ok) {
      const general = settingsList.filter((s) => s.category === 'GENERAL');
      const siteNameSetting = settingsList.find((s) => s.key === 'SITE_NAME');
      if (siteNameSetting) originalSiteName = siteNameSetting.value;
      ok('GENERAL kategorisi mevcut', general.length > 0, `${general.length} adet`);
      ok('SITE_NAME ayarı seed\'de', !!siteNameSetting, siteNameSetting ? `value: ${siteNameSetting.value}` : '');
    }
  } catch (e) {
    ok('GET /system/settings', false, e.message);
  }

  console.log('\n3. Tekil ayar (SITE_NAME)...');
  try {
    const oneRes = await fetch(`${BASE}/system/settings/SITE_NAME`, { headers: authHeader });
    const oneBody = await oneRes.json();
    ok('GET /system/settings/SITE_NAME', oneRes.ok && oneBody.key === 'SITE_NAME', oneRes.ok ? '' : String(oneBody.message || oneRes.status));
  } catch (e) {
    ok('GET /system/settings/SITE_NAME', false, e.message);
  }

  console.log('\n4. Ayar güncelleme (PATCH SITE_NAME)...');
  try {
    const newValue = 'Test Site ' + Date.now();
    const patchRes = await fetch(`${BASE}/system/settings/SITE_NAME`, {
      method: 'PATCH',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newValue }),
    });
    const patchBody = await patchRes.json();
    ok('PATCH /system/settings/SITE_NAME', patchRes.ok && patchBody.value === newValue, patchRes.ok ? '' : String(patchBody.message || patchRes.status));
    if (patchRes.ok && originalSiteName !== null) {
      const restoreRes = await fetch(`${BASE}/system/settings/SITE_NAME`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: originalSiteName }),
      });
      ok('PATCH SITE_NAME (orijinale geri al)', restoreRes.ok, restoreRes.ok ? '' : 'Geri alınamadı');
    }
  } catch (e) {
    ok('PATCH /system/settings/SITE_NAME', false, e.message);
  }

  console.log('\n5. Public info (auth gerektirmez)...');
  try {
    const pubRes = await fetch(`${BASE}/system/public-info`);
    const pubBody = await pubRes.json();
    ok('GET /system/public-info', pubRes.ok && typeof pubBody.siteName === 'string', pubRes.ok ? `siteName: ${pubBody.siteName}` : String(pubBody.message || pubRes.status));
  } catch (e) {
    ok('GET /system/public-info', false, e.message);
  }

  console.log('\n6. Logo yükleme (POST /system/upload-logo)...');
  try {
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const form = new FormData();
    form.append('logo', new Blob([minimalPng], { type: 'image/png' }), 'logo-test.png');
    const uploadRes = await fetch(`${BASE}/system/upload-logo`, {
      method: 'POST',
      headers: authHeader,
      body: form,
    });
    const uploadBody = await uploadRes.json();
    ok('POST /system/upload-logo', uploadRes.ok && uploadBody.url && uploadBody.url.includes('/uploads/logos/'), uploadRes.ok ? `url: ${uploadBody.url}` : String(uploadBody.message || uploadRes.status));
  } catch (e) {
    ok('POST /system/upload-logo', false, e.message);
  }

  console.log('\n7. Antetli kağıt yükleme (POST /system/upload-header-paper)...');
  try {
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const form = new FormData();
    form.append('headerPaper', new Blob([minimalPng], { type: 'image/png' }), 'header-test.png');
    const upRes = await fetch(`${BASE}/system/upload-header-paper`, {
      method: 'POST',
      headers: authHeader,
      body: form,
    });
    const upBody = await upRes.json();
    ok('POST /system/upload-header-paper', upRes.ok && upBody.url && upBody.url.includes('/uploads/header-paper/'), upRes.ok ? `url: ${upBody.url}` : String(upBody.message || upRes.status));
  } catch (e) {
    ok('POST /system/upload-header-paper', false, e.message);
  }

  console.log('\n8. Diğer Genel ayarlar (MAINTENANCE_MODE, TIMEZONE, CONTACT_EMAIL)...');
  try {
    const keys = ['MAINTENANCE_MODE', 'TIMEZONE', 'CONTACT_EMAIL'];
    for (const key of keys) {
      const r = await fetch(`${BASE}/system/settings/${key}`, { headers: authHeader });
      ok(`GET /system/settings/${key}`, r.ok, r.ok ? (await r.json()).value : (await r.json()).message);
    }
  } catch (e) {
    ok('GET diğer ayarlar', false, e.message);
  }

  console.log('\n--- Özet ---');
  console.log(`  Toplam: ${results.passed + results.failed}, Geçen: ${results.passed}, Kalan: ${results.failed}`);
  console.log('');
  process.exit(results.failed > 0 ? 1 : 0);
}

main();
