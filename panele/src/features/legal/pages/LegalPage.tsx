import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GavelIcon from '@mui/icons-material/Gavel';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import ArticleIcon from '@mui/icons-material/Article';

const pages = {
  aydinlatma: {
    title: 'Aydınlatma Metni',
    subtitle: 'Kişisel Verilerin Korunması Kanunu (KVKK) Kapsamında',
    icon: PrivacyTipIcon,
    sections: [
      {
        heading: '1. Veri Sorumlusu',
        content:
          '[Sendika Adı] ("Sendika"), 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu sıfatına sahiptir.',
      },
      {
        heading: '2. İşlenen Kişisel Veriler',
        content:
          'Ad, soyad, T.C. kimlik numarası, iletişim bilgileri (telefon, e-posta), adres, meslek ve çalışma bilgileri, banka/finans bilgileri işlenmektedir.',
      },
      {
        heading: '3. Kişisel Verilerin İşlenme Amaçları',
        content:
          'Üyelik süreçlerinin yürütülmesi, hukuki yükümlülüklerin yerine getirilmesi, mali işlemlerin takibi, bildirimlerin iletilmesi ve yasal raporlamaların gerçekleştirilmesi amaçlarıyla işlenmektedir.',
      },
      {
        heading: '4. Kişisel Verilerin Aktarıldığı Taraflar',
        content:
          'Kişisel verileriniz; yasal zorunluluklar dahilinde yetkili kamu kurum ve kuruluşları ile hizmet sağlayıcılara aktarılabilir.',
      },
      {
        heading: '5. Kişisel Verilerin Toplanma Yöntemi',
        content:
          'Kişisel verileriniz, üyelik başvurusu, panel girişi ve formlar aracılığıyla elektronik ortamda toplanmaktadır.',
      },
      {
        heading: '6. İlgili Kişinin Hakları',
        content:
          'KVKK\'nın 11. maddesi kapsamında; kişisel verilerinize erişim, düzeltme, silme, işleme itiraz ve taşınabilirlik haklarınızı kullanmak için sendika iletişim adresine başvurabilirsiniz.',
      },
    ],
  },
  gizlilik: {
    title: 'Gizlilik Politikası',
    subtitle: 'Verileriniz Nasıl Korunuyor?',
    icon: PrivacyTipIcon,
    sections: [
      {
        heading: '1. Güvenlik Önlemleri',
        content:
          'Kişisel verileriniz, endüstri standardı güvenlik önlemleri (TLS şifreleme, erişim kontrolü, güvenli depolama) ile korunmaktadır.',
      },
      {
        heading: '2. Veri Saklama Süresi',
        content:
          'Kişisel verileriniz, ilgili mevzuatta öngörülen süreler boyunca saklanır. Bu sürenin sona ermesinin ardından güvenli biçimde silinir.',
      },
      {
        heading: '3. Çerezler',
        content:
          'Bu platform, oturum yönetimi için teknik çerezler kullanmaktadır. Üçüncü taraf reklam veya izleme çerezleri kullanılmamaktadır.',
      },
      {
        heading: '4. Üçüncü Taraf Hizmetler',
        content:
          'Platform; e-posta iletimi (AWS SES), SMS gönderimi (NetGSM) ve WhatsApp mesajlaşma (WAHA) gibi üçüncü taraf hizmetlerden yararlanabilir. Bu hizmetler kendi gizlilik politikalarına tabidir.',
      },
      {
        heading: '5. İletişim',
        content:
          'Gizlilik politikasına ilişkin sorularınız için: [sendika-email@ornek.org.tr]',
      },
    ],
  },
  kullanim: {
    title: 'Kullanım Koşulları',
    subtitle: 'Platform Kullanım Şartları',
    icon: GavelIcon,
    sections: [
      {
        heading: '1. Kabul',
        content:
          'Bu platformu kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız. Kabul etmiyorsanız platformu kullanmayınız.',
      },
      {
        heading: '2. Kullanım Amacı',
        content:
          'Platform yalnızca sendika üyelik işlemleri ve yetkili personel tarafından yönetim amaçlı kullanılabilir.',
      },
      {
        heading: '3. Hesap Güvenliği',
        content:
          'Hesap bilgilerinizin gizliliğini korumakla yükümlüsünüz. Hesabınızla gerçekleştirilen işlemlerden sorumlusunuz.',
      },
      {
        heading: '4. Yasak Kullanımlar',
        content:
          'Sistemin yetkisiz kullanımı, başkalarına ait verilere erişim girişimi ve platformun kötüye kullanımı yasaktır ve hukuki işleme konu olabilir.',
      },
      {
        heading: '5. Sorumluluk Sınırlaması',
        content:
          'Sendika, teknik arızalar veya mücbir sebepler nedeniyle oluşabilecek veri kayıplarından sorumlu tutulamaz.',
      },
      {
        heading: '6. Değişiklikler',
        content:
          'Bu koşullar önceden bildirimde bulunmaksızın güncellenebilir. Güncel koşullar her zaman bu sayfada yayınlanır.',
      },
    ],
  },
} as const;

type PageKey = keyof typeof pages;

const LegalPage: React.FC = () => {
  const { page } = useParams<{ page: PageKey }>();
  const navigate = useNavigate();
  const theme = useTheme();

  const content = page && pages[page as PageKey] ? pages[page as PageKey] : null;

  if (!content) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" color="text.secondary">
          Sayfa bulunamadı.
        </Typography>
        <Button onClick={() => navigate(-1)} startIcon={<ArrowBackIcon />} sx={{ mt: 3 }}>
          Geri Dön
        </Button>
      </Container>
    );
  }

  const IconComponent = content.icon ?? ArticleIcon;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        py: { xs: 4, sm: 6 },
        px: { xs: 2, sm: 0 },
      }}
    >
      <Container maxWidth="md">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 3, color: 'text.secondary' }}
        >
          Geri Dön
        </Button>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            overflow: 'hidden',
          }}
        >
          {/* Başlık */}
          <Box
            sx={{
              px: { xs: 3, sm: 5 },
              py: { xs: 4, sm: 5 },
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <IconComponent sx={{ color: '#fff', fontSize: '2.5rem', opacity: 0.9 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                {content.title}
              </Typography>
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.8), mt: 0.5 }}>
                {content.subtitle}
              </Typography>
            </Box>
          </Box>

          {/* İçerik */}
          <Box sx={{ px: { xs: 3, sm: 5 }, py: { xs: 3, sm: 5 } }}>
            <Box
              sx={{
                p: 2.5,
                mb: 4,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.warning.main, 0.08),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
              }}
            >
              <Typography variant="body2" color="warning.dark" sx={{ fontWeight: 500 }}>
                Bu sayfa taslak niteliğindedir. İçerik, sendikanın hukuk birimi tarafından doldurulmalıdır.
              </Typography>
            </Box>

            {content.sections.map((section, index) => (
              <Box key={index} sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, color: theme.palette.primary.main }}>
                  {section.heading}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {section.content}
                </Typography>
                {index < content.sections.length - 1 && (
                  <Divider sx={{ mt: 3 }} />
                )}
              </Box>
            ))}

            <Box
              sx={{
                mt: 4,
                pt: 3,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="caption" color="text.disabled">
                Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
              </Typography>
              <Button variant="outlined" size="small" onClick={() => navigate(-1)} startIcon={<ArrowBackIcon />}>
                Geri Dön
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LegalPage;
