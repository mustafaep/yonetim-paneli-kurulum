import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Paper,
  IconButton,
  Divider,
} from '@mui/material';
import { getRoles } from '../../roles/services/rolesApi';
import { createPanelUserApplication } from '../../users/services/panelUserApplicationsApi';
import type { CustomRole, RoleScopeDto } from '../../../types/role';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import type { Province, District } from '../../../types/region';
import { getProvinces, getDistricts } from '../../regions/services/regionsApi';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';

interface PromoteToPanelUserDialogProps {
  open: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  onSuccess?: () => void;
}

const PromoteToPanelUserDialog: React.FC<PromoteToPanelUserDialogProps> = ({
  open,
  onClose,
  memberId,
  memberName,
  onSuccess,
}) => {
  const toast = useToast();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  
  // Yetki alanı state'leri
  const [scopes, setScopes] = useState<RoleScopeDto[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districtsMap, setDistrictsMap] = useState<Record<string, District[]>>({});
  const [loadingProvinces, setLoadingProvinces] = useState(false);

  // İlleri yükle
  useEffect(() => {
    if (open) {
      const loadProvinces = async () => {
        setLoadingProvinces(true);
        try {
          const data = await getProvinces();
          setProvinces(data);
        } catch (e) {
          console.error('İller alınırken hata:', e);
        } finally {
          setLoadingProvinces(false);
        }
      };
      loadProvinces();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      const loadRoles = async () => {
        setLoading(true);
        try {
          const allRoles = await getRoles();
          const customRoles = allRoles.filter(
            (r): r is CustomRole => 'id' in r && !('isSystemRole' in r),
          );
          // UYE ve ADMIN atanabilir rol değil (ADMIN sistem rolü)
          const filteredRoles = customRoles.filter(
            (r) =>
              r.name !== 'UYE' && r.name.toUpperCase() !== 'ADMIN',
          );
          setRoles(filteredRoles);
        } catch (e) {
          console.error('Roller yüklenirken hata:', e);
          toast.showError('Roller yüklenirken bir hata oluştu');
        } finally {
          setLoading(false);
        }
      };
      loadRoles();
    } else {
      // Dialog kapandığında formu sıfırla
      setSelectedRoleId('');
      setRequestNote('');
      setRoles([]);
      setSelectedRole(null);
      setScopes([]);
      setDistrictsMap({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // toast'u dependency'den çıkardık

  // Rol seçildiğinde kontrol et
  useEffect(() => {
    if (!open) return; // Dialog kapalıysa çalışma
    
    if (selectedRoleId && roles.length > 0) {
      const role = roles.find(r => r.id === selectedRoleId);
      if (role) {
        setSelectedRole(role);
        
        if (role.hasScopeRestriction) {
          // Eğer scope kısıtlaması varsa ve scope yoksa, ilk scope'u ekle
          setScopes(prev => {
            // Eğer önceki scope'lar varsa, sadece temizle (yeni rol seçildiğinde)
            if (prev.length === 0) {
              return [{ provinceId: undefined, districtId: undefined }];
            }
            return prev;
          });
        } else {
          // Scope kısıtlaması yoksa scope'ları temizle
          setScopes([]);
        }
      } else {
        setSelectedRole(null);
        setScopes([]);
      }
    } else if (!selectedRoleId) {
      // Rol seçilmemişse temizle
      setSelectedRole(null);
      setScopes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleId, open]); // roles'u dependency'den çıkardık, sadece selectedRoleId ve open değiştiğinde çalışsın

  const handleSubmit = async () => {
    if (!selectedRoleId) {
      toast.showError('Lütfen bir rol seçin');
      return;
    }

    // Yetki alanı validasyonu
    if (selectedRole?.hasScopeRestriction) {
      if (scopes.length === 0) {
        toast.showError('Bu rol için en az bir yetki alanı seçmelisiniz.');
        return;
      }

      for (const scope of scopes) {
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
      const cleanedScopes = selectedRole?.hasScopeRestriction && scopes.length > 0
        ? scopes.filter(s => s.provinceId || s.districtId)
        : undefined;

      await createPanelUserApplication(memberId, {
        requestedRoleId: selectedRoleId,
        requestNote: requestNote || undefined,
        scopes: cleanedScopes,
      });
      toast.showSuccess('Panel kullanıcı başvurusu başarıyla oluşturuldu');
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      console.error('Başvuru oluşturulurken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Başvuru oluşturulurken bir hata oluştu'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Panel Kullanıcılığına Terfi Et</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>{memberName}</strong> için panel kullanıcı başvurusu oluşturulacak.
          Başvuru onaylandıktan sonra kullanıcıya şifre ve email atanacaktır.
        </Alert>

        {loading ? (
          <CircularProgress />
        ) : (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Rol Seçin *</InputLabel>
              <Select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                label="Rol Seçin *"
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name} {role.description && `- ${role.description}`}
                    {role.hasScopeRestriction && ' (Yetki Alanı Gerekli)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Yetki Alanı Seçimi - Eğer seçilen role hasScopeRestriction true ise göster */}
            {selectedRole?.hasScopeRestriction && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationOnIcon fontSize="small" />
                  Yetki Alanları (Zorunlu)
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {scopes.map((scope, index) => (
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
                                const newScopes = [...scopes];
                                newScopes[index] = { provinceId: e.target.value, districtId: undefined };
                                setScopes(newScopes);

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
                              disabled={loadingProvinces}
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
                                  const newScopes = [...scopes];
                                  newScopes[index] = { ...newScopes[index], districtId: e.target.value };
                                  setScopes(newScopes);
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

                        {scopes.length > 1 && (
                          <IconButton
                            onClick={() => {
                              setScopes(scopes.filter((_, i) => i !== index));
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
                    setScopes([...scopes, { provinceId: undefined, districtId: undefined }]);
                  }}
                  sx={{ mt: 1.5, textTransform: 'none' }}
                >
                  Yetki Alanı Ekle
                </Button>
              </Box>
            )}

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Başvuru Notu (İsteğe Bağlı)"
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="Başvuru hakkında ek bilgi..."
              sx={{ mt: selectedRole?.hasScopeRestriction ? 2 : 0 }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          İptal
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            !selectedRoleId || 
            submitting || 
            loading || 
            (selectedRole?.hasScopeRestriction && scopes.length === 0)
          }
        >
          {submitting ? <CircularProgress size={20} /> : 'Başvuru Oluştur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PromoteToPanelUserDialog;
