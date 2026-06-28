// src/features/users/components/UserRolesDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';

import { type UserDetail } from '../../../types/user';
import { getRoles } from '../../roles/services/rolesApi';
import type { RoleListItem, CustomRole } from '../../../types/role';
import { useToast } from '../../../shared/hooks/useToast';

interface UserRolesDialogProps {
  open: boolean;
  user: UserDetail | null;
  onClose: () => void;
  onSave: (customRoleIds: string[]) => Promise<void> | void;
}

const UserRolesDialog: React.FC<UserRolesDialogProps> = ({
  open,
  user,
  onClose,
  onSave,
}) => {
  const toast = useToast();
  const [availableRoles, setAvailableRoles] = useState<CustomRole[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Rolleri yükle
  useEffect(() => {
    if (open) {
      const loadRoles = async () => {
        setLoading(true);
        try {
          const roles = await getRoles();
          // Sadece CustomRole'leri al (SystemRole'leri hariç tut)
          const customRoles = roles.filter((r): r is CustomRole => 'id' in r && !('isSystemRole' in r));
          setAvailableRoles(customRoles);
        } catch (e) {
          console.error('Roller yüklenirken hata:', e);
          toast.showError('Roller yüklenirken bir hata oluştu.');
        } finally {
          setLoading(false);
        }
      };
      loadRoles();
    }
  }, [open]);

  // Kullanıcının mevcut rollerini yükle
  useEffect(() => {
    if (user && availableRoles.length > 0) {
      // Kullanıcının role isimlerinden role ID'lerini bul
      const userRoleIds = availableRoles
        .filter(role => user.roles?.includes(role.name))
        .map(role => role.id);
      setSelectedRoleIds(userRoleIds);
    } else {
      setSelectedRoleIds([]);
    }
  }, [user, availableRoles]);

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  const handleSaveClick = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await onSave(selectedRoleIds);
      onClose();
      toast.showSuccess('Roller başarıyla güncellendi.');
    } catch (e) {
      console.error('Roller kaydedilirken hata:', e);
      toast.showError('Roller kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Kullanıcı Rolleri</DialogTitle>
      <DialogContent dividers>
        {user ? (
          <>
            <Typography variant="subtitle1" gutterBottom>
              {user.firstName} {user.lastName} ({user.email})
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bu kullanıcıya atanacak rolleri seçin. Roller, kullanıcının sahip olduğu
              izinleri belirler.
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FormGroup>
                  {availableRoles.slice(0, Math.ceil(availableRoles.length / 2)).map((role) => (
                    <FormControlLabel
                      key={role.id}
                      control={
                        <Checkbox
                          checked={selectedRoleIds.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                        />
                      }
                      label={role.name}
                    />
                  ))}
                </FormGroup>
                <FormGroup>
                  {availableRoles.slice(Math.ceil(availableRoles.length / 2)).map((role) => (
                    <FormControlLabel
                      key={role.id}
                      control={
                        <Checkbox
                          checked={selectedRoleIds.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                        />
                      }
                      label={role.name}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}
          </>
        ) : (
          <Typography>Yükleniyor...</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          İptal
        </Button>
        <Button
          onClick={handleSaveClick}
          disabled={saving || !user}
          variant="contained"
        >
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserRolesDialog;
