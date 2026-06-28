import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { approvePanelUserApplication, getPanelUserApplicationById, type RoleScopeDto } from '../services/panelUserApplicationsApi';
import type { ApprovePanelUserApplicationDto } from '../services/panelUserApplicationsApi';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import { getProvinces, getDistricts } from '../../regions/services/regionsApi';
import type { Province, District } from '../../../types/region';
import { getRoleById } from '../../roles/services/rolesApi';

const RECENT_APPROVED_PANEL_USERS_KEY = 'recentApprovedPanelUsers';

type ApprovedPanelUserSyncPayload = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isActive: boolean;
};

const readRecentApprovedPanelUsers = (): ApprovedPanelUserSyncPayload[] => {
  try {
    const raw = localStorage.getItem(RECENT_APPROVED_PANEL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveRecentApprovedPanelUsers = (
  payload: ApprovedPanelUserSyncPayload,
): void => {
  const existing = readRecentApprovedPanelUsers().filter(
    (item) => item.id !== payload.id,
  );
  const next = [payload, ...existing].slice(0, 20);
  localStorage.setItem(RECENT_APPROVED_PANEL_USERS_KEY, JSON.stringify(next));
};

interface ApprovePanelUserApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  applicationId: string;
  memberName: string;
  memberEmail?: string;
  onSuccess?: () => void;
}

const ApprovePanelUserApplicationDialog: React.FC<ApprovePanelUserApplicationDialogProps> = ({
  open,
  onClose,
  applicationId,
  memberName,
  memberEmail,
  onSuccess,
}) => {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [loadingApplication, setLoadingApplication] = useState(false);
  const [formData, setFormData] = useState<ApprovePanelUserApplicationDto>({
    email: '',
    password: '',
    reviewNote: '',
    scopes: [],
  });
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districtsMap, setDistrictsMap] = useState<Record<string, District[]>>({});
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [hasScopeRestriction, setHasScopeRestriction] = useState(false);

  // İlleri yükle
  useEffect(() => {
    if (open) {
      const loadProvinces = async () => {
        setProvincesLoading(true);
        try {
          const data = await getProvinces();
          setProvinces(data);
        } catch (e) {
          console.error('İller alınırken hata:', e);
        } finally {
          setProvincesLoading(false);
        }
      };
      loadProvinces();
    }
  }, [open]);

  // Türkçe karakterleri kaldır
  const removeTurkishCharacters = (text: string): string => {
    const turkishCharMap: Record<string, string> = {
      'ö': 'o', 'Ö': 'O',
      'ş': 's', 'Ş': 'S',
      'İ': 'I', 'ı': 'i',
      'ü': 'u', 'Ü': 'U',
      'ç': 'c', 'Ç': 'C',
      'ğ': 'g', 'Ğ': 'G',
    };
    
    return text.replace(/[öÖşŞİıüÜçÇğĞ]/g, (char) => turkishCharMap[char] || char);
  };

  // Başvuruyu yükle ve rol bilgilerini kontrol et
  useEffect(() => {
    if (open && applicationId) {
      const loadApplication = async () => {
        setLoadingApplication(true);
        try {
          const application = await getPanelUserApplicationById(applicationId);
          const role = await getRoleById(application.requestedRoleId);
          setHasScopeRestriction(role.hasScopeRestriction || false);
          
          // Email'i doldur ve Türkçe karakterleri kaldır
          if (memberEmail || application.member.email) {
            const email = memberEmail || application.member.email || '';
            setFormData(prev => ({
              ...prev,
              email: removeTurkishCharacters(email),
            }));
          }
          
          // Eğer başvuruda scopes varsa, onları yükle
          if (application.applicationScopes && application.applicationScopes.length > 0) {
            const existingScopes: RoleScopeDto[] = application.applicationScopes.map((s) => ({
              provinceId: s.provinceId,
              districtId: s.districtId,
            }));
            setFormData(prev => ({ ...prev, scopes: existingScopes }));
            
            // Her scope için ilçeleri yükle
            const newDistrictsMap: Record<string, District[]> = {};
            for (const scope of existingScopes) {
              if (scope.provinceId && !newDistrictsMap[scope.provinceId]) {
                try {
                  const districts = await getDistricts(scope.provinceId);
                  newDistrictsMap[scope.provinceId] = districts;
                } catch (e) {
                  console.error('İlçeler yüklenirken hata:', e);
                }
              }
            }
            setDistrictsMap(prev => ({ ...prev, ...newDistrictsMap }));
          } else if (role.hasScopeRestriction) {
            // Eğer scope kısıtlaması varsa ama başvuruda scope yoksa, ilk scope'u ekle
            setFormData(prev => ({ 
              ...prev, 
              scopes: [{ provinceId: undefined, districtId: undefined }] 
            }));
          }
        } catch (e) {
          console.error('Başvuru yüklenirken hata:', e);
          toast.showError('Başvuru bilgileri yüklenirken bir hata oluştu');
        } finally {
          setLoadingApplication(false);
        }
      };
      loadApplication();
    } else if (!open) {
      // Dialog kapandığında formu sıfırla
      setFormData({
        email: '',
        password: '',
        reviewNote: '',
        scopes: [],
      });
      setDistrictsMap({});
      setHasScopeRestriction(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, applicationId, memberEmail]);


  const handleSubmit = async () => {
    if (!formData.email || !formData.password) {
      toast.showError('Lütfen email ve şifre alanlarını doldurun');
      return;
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.showError('Geçerli bir email adresi girin');
      return;
    }

    // Şifre uzunluk kontrolü
    if (formData.password.length < 8) {
      toast.showError('Şifre en az 8 karakter olmalıdır');
      return;
    }

    // Yetki alanı validasyonu
    if (hasScopeRestriction) {
      if (!formData.scopes || formData.scopes.length === 0) {
        toast.showError('Bu rol için en az bir yetki alanı seçmelisiniz.');
        return;
      }

      for (const scope of formData.scopes) {
        if (!scope.provinceId && !scope.districtId) {
          toast.showError('Her yetki alanı için en az bir il veya ilçe seçmelisiniz.');
          return;
        }

        if (scope.districtId && !scope.provinceId) {
          toast.showError('İlçe seçmek için önce il seçmelisiniz.');
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const cleanedScopes = hasScopeRestriction && formData.scopes
        ? formData.scopes.filter(s => s.provinceId || s.districtId)
        : undefined;

      const submitData: ApprovePanelUserApplicationDto = {
        email: formData.email,
        password: formData.password,
        reviewNote: formData.reviewNote || undefined,
        scopes: cleanedScopes,
      };
      const approvedApplication = await approvePanelUserApplication(
        applicationId,
        submitData,
      );
      toast.showSuccess('Başvuru başarıyla onaylandı ve kullanıcı oluşturuldu');

      if (approvedApplication.createdUser) {
        const syncPayload: ApprovedPanelUserSyncPayload = {
          id: approvedApplication.createdUser.id,
          email: approvedApplication.createdUser.email,
          firstName: approvedApplication.createdUser.firstName,
          lastName: approvedApplication.createdUser.lastName,
          roles: [approvedApplication.requestedRole.name],
          isActive: true,
        };

        saveRecentApprovedPanelUsers(syncPayload);

        // Aynı sekmede açıksa kullanıcı listesi anında güncellensin.
        window.dispatchEvent(
          new CustomEvent<ApprovedPanelUserSyncPayload>('panelUserApproved', {
            detail: syncPayload,
          }),
        );
      }
      
      onSuccess?.();
      onClose();
      // Formu sıfırla
      setFormData({
        email: '',
        password: '',
        reviewNote: '',
        scopes: [],
      });
      setDistrictsMap({});
    } catch (e: unknown) {
      console.error('Onaylama hatası:', e);
      toast.showError(getApiErrorMessage(e, 'Başvuru onaylanırken bir hata oluştu'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Panel Kullanıcı Başvurusunu Onayla</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>{memberName}</strong> için panel kullanıcısı oluşturulacak.
          Lütfen email ve şifre bilgilerini girin.
        </Alert>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) => {
              // Türkçe karakterleri otomatik olarak kaldır
              const cleanedEmail = removeTurkishCharacters(e.target.value);
              setFormData({ ...formData, email: cleanedEmail });
            }}
            placeholder="ornek@email.com"
            required
            helperText="Türkçe karakterler (ö, ş, İ, ı, ü, ç, ğ) otomatik olarak kaldırılır"
          />

          <TextField
            fullWidth
            label="Şifre *"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="En az 8 karakter"
            required
            helperText="Şifre en az 8 karakter olmalıdır"
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Onay Notu (İsteğe Bağlı)"
            value={formData.reviewNote}
            onChange={(e) => setFormData({ ...formData, reviewNote: e.target.value })}
            placeholder="Onay hakkında ek bilgi..."
          />

          {/* Yetki Alanı Seçimi - Eğer role hasScopeRestriction true ise göster */}
          {hasScopeRestriction && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.12)' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOnIcon fontSize="small" />
                Yetki Alanları {loadingApplication ? '(Yükleniyor...)' : '(Zorunlu)'}
              </Typography>
              
              {loadingApplication ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Bu rol için yetki alanı seçimi zorunludur. Birden fazla il ve ilçe seçebilirsiniz.
                  </Alert>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {formData.scopes?.map((scope, index) => (
                      <Paper
                        key={index}
                        elevation={0}
                        sx={{
                          p: 2,
                          border: '1px solid rgba(0, 0, 0, 0.12)',
                          borderRadius: 2,
                          backgroundColor: 'rgba(0, 0, 0, 0.02)',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <FormControl fullWidth size="small">
                              <InputLabel>İl *</InputLabel>
                              <Select
                                value={scope.provinceId || ''}
                                label="İl *"
                                onChange={async (e) => {
                                  const newScopes = [...(formData.scopes || [])];
                                  newScopes[index] = { provinceId: e.target.value, districtId: undefined };
                                  setFormData({ ...formData, scopes: newScopes });

                                  // İlçeleri yükle
                                  if (e.target.value && !districtsMap[e.target.value]) {
                                    try {
                                      const districts = await getDistricts(e.target.value);
                                      setDistrictsMap(prev => ({
                                        ...prev,
                                        [e.target.value]: districts,
                                      }));
                                    } catch (error) {
                                      console.error('İlçeler yüklenirken hata:', error);
                                    }
                                  }
                                }}
                                disabled={provincesLoading}
                              >
                                <MenuItem value="">
                                  <em>İl Seçin</em>
                                </MenuItem>
                                {provinces.map((province) => (
                                  <MenuItem key={province.id} value={province.id}>
                                    {province.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>

                            {scope.provinceId && (
                              <FormControl fullWidth size="small">
                                <InputLabel>İlçe (İsteğe Bağlı)</InputLabel>
                                <Select
                                  value={scope.districtId || ''}
                                  label="İlçe (İsteğe Bağlı)"
                                  onChange={(e) => {
                                    const newScopes = [...(formData.scopes || [])];
                                    newScopes[index] = { ...newScopes[index], districtId: e.target.value };
                                    setFormData({ ...formData, scopes: newScopes });
                                  }}
                                  disabled={!districtsMap[scope.provinceId!]}
                                >
                                  <MenuItem value="">
                                    <em>Tüm İlçeler</em>
                                  </MenuItem>
                                  {districtsMap[scope.provinceId!]?.map((district) => (
                                    <MenuItem key={district.id} value={district.id}>
                                      {district.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            )}
                          </Box>

                          {(formData.scopes?.length || 0) > 1 && (
                            <IconButton
                              onClick={() => {
                                const newScopes = formData.scopes?.filter((_, i) => i !== index) || [];
                                setFormData({ ...formData, scopes: newScopes });
                              }}
                              color="error"
                              size="small"
                              sx={{ mt: 1 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </Paper>
                    ))}
                  </Box>

                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddCircleIcon />}
                    onClick={() => {
                      setFormData({
                        ...formData,
                        scopes: [...(formData.scopes || []), { provinceId: undefined, districtId: undefined }],
                      });
                    }}
                    sx={{ mt: 1.5, textTransform: 'none' }}
                  >
                    Yetki Alanı Ekle
                  </Button>
                </>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          İptal
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            !formData.email || 
            !formData.password || 
            submitting || 
            loadingApplication ||
            (hasScopeRestriction && (!formData.scopes || formData.scopes.length === 0))
          }
        >
          {submitting ? <CircularProgress size={20} /> : 'Onayla ve Oluştur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApprovePanelUserApplicationDialog;
