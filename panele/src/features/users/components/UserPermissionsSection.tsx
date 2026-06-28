// src/features/users/components/UserPermissionsSection.tsx
import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
} from '@mui/material';

interface Props {
  permissions?: string[] | null;
}

interface GroupedPerms {
  label: string;
  items: string[];
  color?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'error'
    | 'info'
    | 'success'
    | 'warning';
}

const PERMISSION_LABEL_MAP: Record<string, string> = {
  // Kullanıcı Yönetimi
  USER_LIST: 'Kullanıcı Listele',
  USER_VIEW: 'Kullanıcı Görüntüle',
  USER_CREATE: 'Kullanıcı Oluştur',
  USER_UPDATE: 'Kullanıcı Güncelle',
  USER_SOFT_DELETE: 'Kullanıcı Sil',
  USER_ASSIGN_ROLE: 'Rol Atama',
  // Rol Yönetimi
  ROLE_LIST: 'Rolleri Listele',
  ROLE_VIEW: 'Rol Detayı Görüntüle',
  ROLE_CREATE: 'Rol Oluştur',
  ROLE_UPDATE: 'Rol Güncelle',
  ROLE_DELETE: 'Rol Sil',
  ROLE_MANAGE_PERMISSIONS: 'Rol İzinlerini Yönet',
  // Üye Yönetimi
  MEMBER_LIST: 'Üye Listele',
  MEMBER_VIEW: 'Üye Görüntüle',
  MEMBER_CREATE_APPLICATION: 'Üye Başvurusu Oluştur',
  MEMBER_APPLICATIONS_VIEW: 'Üye Başvurularını Görüntüle',
  MEMBER_APPROVE: 'Başvuru Onayla',
  MEMBER_REJECT: 'Başvuru Reddet',
  MEMBER_UPDATE: 'Üye Güncelle',
  MEMBER_STATUS_CHANGE: 'Üye Durum Değiştir',
  MEMBER_HISTORY_VIEW: 'Üye Hareketlerini Görüntüle',
  MEMBER_LIST_BY_PROVINCE: 'İle Göre Üye Listele',
  // Bölge / Şube
  REGION_LIST: 'Bölgeleri Listele',
  BRANCH_MANAGE: 'Şube Yönetimi',
  BRANCH_ASSIGN_PRESIDENT: 'Şube Başkanı Ata',
  // İçerik
  CONTENT_MANAGE: 'İçerik Yönet',
  CONTENT_PUBLISH: 'İçerik Yayınla',
  // Doküman
  DOCUMENT_SYSTEM_ACCESS: 'Evrak Sistemine Erişim',
  DOCUMENT_TEMPLATE_MANAGE: 'PDF Şablonu Yönet',
  DOCUMENT_MEMBER_HISTORY_VIEW: 'Doküman Geçmişi Görüntüle',
  DOCUMENT_GENERATE_PDF: 'PDF Oluştur',
  DOCUMENT_UPLOAD: 'Evrak Yükle',
  DOCUMENT_DOWNLOAD: 'Evrak İndir',
  // Raporlar
  REPORT_GLOBAL_VIEW: 'Genel Rapor',
  REPORT_REGION_VIEW: 'Bölge Raporu',
  REPORT_MEMBER_STATUS_VIEW: 'Üye Durum Raporu',
  REPORT_DUES_VIEW: 'Kesinti Raporu',
  // Bildirimler
  WHATSAPP_ACCESS: 'WhatsApp (eski birleşik izin)',
  WHATSAPP_CHAT_VIEW: 'WhatsApp — Sohbetleri görüntüle',
  WHATSAPP_CHAT_SEND: 'WhatsApp — Mesaj gönder',
  WHATSAPP_CHAT_MANAGE: 'WhatsApp — Sohbet arşivle / sil',
  WHATSAPP_BULK_SEND: 'WhatsApp — Toplu mesaj',
  WHATSAPP_TEMPLATE_VIEW: 'WhatsApp — Şablonları görüntüle',
  WHATSAPP_TEMPLATE_MANAGE: 'WhatsApp — Şablon yönetimi ve gönderim',
  WHATSAPP_INSTANCE_MANAGE: 'WhatsApp — Bağlantı (QR / oturum)',
  NOTIFY_ALL_MEMBERS: 'Tüm Üyelere Bildirim',
  NOTIFY_REGION: 'Bölgeye Bildirim',
  NOTIFY_OWN_SCOPE: 'Kapsama Bildirim',
  // Sistem
  SYSTEM_SETTINGS_VIEW: 'Sistem Ayarlarını Görüntüle',
  SYSTEM_SETTINGS_MANAGE: 'Sistem Ayarlarını Yönet',
  LOG_VIEW_ALL: 'Tüm Logları Görüntüle',
  LOG_VIEW_OWN_SCOPE: 'Kapsam Loglarını Görüntüle',
  // Kurumlar
  INSTITUTION_LIST: 'Kurumları Listele',
  INSTITUTION_VIEW: 'Kurum Görüntüle',
  INSTITUTION_CREATE: 'Kurum Oluştur',
  INSTITUTION_UPDATE: 'Kurum Güncelle',
  INSTITUTION_APPROVE: 'Kurum Onayla',
  // Meslekler
  PROFESSION_VIEW: 'Meslekleri Görüntüle',
  PROFESSION_CREATE: 'Meslek Oluştur',
  PROFESSION_UPDATE: 'Meslek Güncelle',
  PROFESSION_DELETE: 'Meslek Sil',
  // Tevkifat
  TEVKIFAT_VIEW: 'Tevkifat Görüntüle',
  TEVKIFAT_EXPORT: 'Tevkifat Dışa Aktar',
  TEVKIFAT_TITLE_VIEW: 'Tevkifat Unvanlarını Görüntüle',
  TEVKIFAT_TITLE_CREATE: 'Tevkifat Unvanı Oluştur',
  TEVKIFAT_TITLE_UPDATE: 'Tevkifat Unvanı Güncelle',
  TEVKIFAT_TITLE_DELETE: 'Tevkifat Unvanı Sil',
  TEVKIFAT_CENTER_VIEW: 'Tevkifat Merkezi Görüntüle',
  TEVKIFAT_CENTER_CREATE: 'Tevkifat Merkezi Oluştur',
  TEVKIFAT_CENTER_UPDATE: 'Tevkifat Merkezi Güncelle',
  TEVKIFAT_CENTER_DELETE: 'Tevkifat Merkezi Sil',
  TEVKIFAT_FILE_UPLOAD: 'Tevkifat Dosyası Yükle',
  TEVKIFAT_FILE_APPROVE: 'Tevkifat Dosyası Onayla',
  // Üye Kesintileri
  MEMBER_PAYMENT_ADD: 'Kesinti Girişi',
  MEMBER_PAYMENT_APPROVE: 'Kesinti Onayla',
  MEMBER_PAYMENT_LIST: 'Kesinti Listele',
  MEMBER_PAYMENT_VIEW: 'Kesinti Detayı Görüntüle',
  // Onay
  APPROVAL_VIEW: 'Onay Görüntüle',
  APPROVAL_APPROVE: 'Onayla',
  APPROVAL_REJECT: 'Reddet',
  // Panel Başvuruları
  PANEL_USER_APPLICATION_CREATE: 'Panel Başvurusu Oluştur',
  PANEL_USER_APPLICATION_LIST: 'Panel Başvurularını Listele',
  PANEL_USER_APPLICATION_VIEW: 'Panel Başvurusu Görüntüle',
  PANEL_USER_APPLICATION_APPROVE: 'Panel Başvurusu Onayla',
  PANEL_USER_APPLICATION_REJECT: 'Panel Başvurusu Reddet',
  // Avans
  ADVANCE_VIEW: 'Avansları Görüntüle',
  ADVANCE_CREATE: 'Avans Ekle',
  ADVANCE_UPDATE: 'Avans Güncelle',
  ADVANCE_DELETE: 'Avans Sil',
  ADVANCE_DOCUMENT: 'Avans Belgesi Yönet (yükle / kaldır)',
  ADVANCE_ADD: 'Avans (eski birleşik izin)',
  // Faturalar
  INVOICE_VIEW: 'Faturaları Görüntüle',
  INVOICE_CREATE: 'Fatura Ekle',
  INVOICE_UPDATE: 'Fatura Güncelle',
  INVOICE_DELETE: 'Fatura Sil',
};

const getLabelForPermission = (perm: string) =>
  PERMISSION_LABEL_MAP[perm] ?? perm;

const groupPermissions = (permissions: string[]): GroupedPerms[] => {
  const groups: GroupedPerms[] = [
    { label: 'Kullanıcı & Rol Yönetimi', items: [], color: 'primary' },
    { label: 'Üye Yönetimi', items: [], color: 'success' },
    { label: 'Muhasebe & Avans', items: [], color: 'warning' },
    { label: 'Bölge / Şube / Kurum', items: [], color: 'info' },
    { label: 'Raporlar & Bildirimler', items: [], color: 'secondary' },
    { label: 'Sistem & Diğer', items: [], color: 'default' },
  ];

  for (const perm of permissions) {
    if (perm.startsWith('USER_') || perm.startsWith('ROLE_') || perm.startsWith('PANEL_USER_APPLICATION_')) {
      groups[0].items.push(perm);
    } else if (perm.startsWith('MEMBER_')) {
      groups[1].items.push(perm);
    } else if (
      perm.startsWith('ACCOUNTING_') ||
      perm.startsWith('TEVKIFAT_') ||
      perm.startsWith('ADVANCE_') ||
      perm.startsWith('INVOICE_') ||
      perm.startsWith('APPROVAL_')
    ) {
      groups[2].items.push(perm);
    } else if (
      perm.startsWith('REGION_') ||
      perm.startsWith('BRANCH_') ||
      perm.startsWith('INSTITUTION_')
    ) {
      groups[3].items.push(perm);
    } else if (
      perm.startsWith('REPORT_') ||
      perm.startsWith('NOTIFY_') ||
      perm.startsWith('CONTENT_') ||
      perm.startsWith('DOCUMENT_')
    ) {
      groups[4].items.push(perm);
    } else {
      groups[5].items.push(perm);
    }
  }

  return groups.filter((g) => g.items.length > 0);
};

const UserPermissionsSection: React.FC<Props> = ({ permissions }) => {
  const normalized = Array.isArray(permissions) ? permissions : [];

  if (normalized.length === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1">İzinler</Typography>
        <Typography variant="body2" color="text.secondary">
          Bu kullanıcıya ait detaylı izin bilgisi bulunmuyor. İzinler genellikle
          roller üzerinden dolaylı olarak gelir.
        </Typography>
      </Box>
    );
  }

  const groups = groupPermissions(normalized);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle1" gutterBottom>
        İzinler
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Bu liste, kullanıcının sahip olduğu detaylı yetkileri gösterir.
        İzinler, roller üzerinden hesaplanmış olabilir.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {groups.map((group, idx) => (
          <Box key={group.label}>
            {idx > 0 && <Divider sx={{ my: 1 }} />}
            <Typography
              variant="subtitle2"
              sx={{ mb: 0.5 }}
              color="text.secondary"
            >
              {group.label}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {group.items.map((perm) => (
                <Chip
                  key={perm}
                  label={getLabelForPermission(perm)}
                  size="small"
                  color={group.color}
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default UserPermissionsSection;
