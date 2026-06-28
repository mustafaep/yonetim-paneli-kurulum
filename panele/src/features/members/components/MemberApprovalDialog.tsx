// src/features/members/components/MemberApprovalDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Autocomplete,
  CircularProgress,
  alpha,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useTheme } from '@mui/material/styles';
import { getTevkifatCenters, getTevkifatTitles } from '../../accounting/services/accountingApi';
import { getBranches } from '../../regions/services/branchesApi';
import { getMemberGroups } from '../../system/services/memberGroupsApi';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import type { TevkifatCenter, TevkifatTitle } from '../../accounting/services/accountingApi';
import type { Branch } from '../../regions/services/branchesApi';
import type { MemberGroup } from '../../system/services/memberGroupsApi';

export interface ApproveFormData {
  registrationNumber: string;
  boardDecisionDate?: string;
  boardDecisionBookNo: string;
  tevkifatCenterId: string;
  tevkifatTitleId: string;
  branchId: string;
  memberGroupId: string;
}

interface MemberApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: ApproveFormData) => Promise<void>;
  loading?: boolean;
  successMessage: string;
  initialFormData?: Partial<ApproveFormData>;
}

const MemberApprovalDialog: React.FC<MemberApprovalDialogProps> = ({
  open,
  onClose,
  onConfirm,
  loading = false,
  successMessage,
  initialFormData,
}) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<ApproveFormData>({
    registrationNumber: '',
    boardDecisionDate: undefined,
    boardDecisionBookNo: '',
    tevkifatCenterId: '',
    tevkifatTitleId: '',
    branchId: '',
    memberGroupId: '',
  });
  const [tevkifatCenters, setTevkifatCenters] = useState<TevkifatCenter[]>([]);
  const [tevkifatTitles, setTevkifatTitles] = useState<TevkifatTitle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [memberGroups, setMemberGroups] = useState<MemberGroup[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && initialFormData) {
      setFormData((prev) => ({ ...prev, ...initialFormData }));
    }
    if (open && !initialFormData) {
      setFormData({
        registrationNumber: '',
        boardDecisionDate: undefined,
        boardDecisionBookNo: '',
        tevkifatCenterId: '',
        tevkifatTitleId: '',
        branchId: '',
        memberGroupId: '',
      });
    }
  }, [open, initialFormData]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setOptionsLoading(true);
    Promise.all([
      getTevkifatCenters(),
      getTevkifatTitles(),
      getBranches({ isActive: true }),
      getMemberGroups(),
    ])
      .then(([centers, titles, branchList, groups]) => {
        if (cancelled) return;
        setTevkifatCenters(Array.isArray(centers) ? centers : []);
        setTevkifatTitles(Array.isArray(titles) ? titles : []);
        setBranches(Array.isArray(branchList) ? branchList : []);
        setMemberGroups(Array.isArray(groups) ? groups : []);
      })
      .catch(() => {
        if (!cancelled) setTevkifatCenters([]);
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleChange = (field: keyof ApproveFormData) => (
    e: React.ChangeEvent<HTMLInputElement | { value: unknown }>,
  ) => {
    const value = typeof e.target.value === 'string' ? e.target.value : String(e.target.value ?? '');
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    const missingFields: string[] = [];

    if (!formData.registrationNumber?.trim()) missingFields.push('Üye Numarası');
    if (!formData.boardDecisionDate?.trim()) missingFields.push('Yönetim Kurulu Karar Tarihi');
    if (!formData.boardDecisionBookNo?.trim()) missingFields.push('Yönetim Kurulu Karar Defter No');
    if (!formData.tevkifatCenterId) missingFields.push('Tevkifat Kurumu');
    if (!formData.tevkifatTitleId) missingFields.push('Tevkifat Ünvanı');
    if (!formData.branchId) missingFields.push('Şube');
    if (!formData.memberGroupId) missingFields.push('Üye Grubu');

    if (missingFields.length > 0) {
      setError(`Lütfen şu alanları doldurun: ${missingFields.join(', ')}`);
      return;
    }

    setError('');
    try {
      await onConfirm({
        ...formData,
        registrationNumber: formData.registrationNumber.trim(),
        boardDecisionBookNo: formData.boardDecisionBookNo.trim(),
        // `class-validator` `IsOptional` için `''` (empty string) değil `undefined` bekler.
        // Bu yüzden tarih boşsa backend'e geçerli formatta olmayan '' göndermiyoruz.
        boardDecisionDate: formData.boardDecisionDate?.trim()
          ? formData.boardDecisionDate.trim()
          : undefined,
      });
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, 'Onaylama sırasında bir hata oluştu'));
    }
  };

  const selectedTevkifatCenter =
    tevkifatCenters.find((c) => c.id === formData.tevkifatCenterId) ?? null;
  const selectedTevkifatTitle =
    tevkifatTitles.find((t) => t.id === formData.tevkifatTitleId) ?? null;
  const selectedBranch = branches.find((b) => b.id === formData.branchId) ?? null;
  const selectedMemberGroup =
    memberGroups.find((g) => g.id === formData.memberGroupId) ?? null;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          pb: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircleOutlineIcon color="primary" sx={{ fontSize: 28 }} />
        </Box>
        <Typography variant="h6">Üye Başvurusunu Onayla</Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {successMessage}
        </Typography>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        {optionsLoading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Üye Numarası"
              value={formData.registrationNumber}
              onChange={handleChange('registrationNumber')}
              size="small"
              fullWidth
              required
            />
            <TextField
              label="Yönetim Kurulu Karar Tarihi"
              type="date"
              value={formData.boardDecisionDate || ''}
              onChange={handleChange('boardDecisionDate')}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="Yönetim Kurulu Karar Defter No"
              value={formData.boardDecisionBookNo}
              onChange={handleChange('boardDecisionBookNo')}
              size="small"
              fullWidth
              required
            />
            <Autocomplete
              size="small"
              fullWidth
              options={tevkifatCenters}
              value={selectedTevkifatCenter}
              onChange={(_, value) => {
                setFormData((prev) => ({ ...prev, tevkifatCenterId: value?.id ?? '' }));
                setError('');
              }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="Sonuç bulunamadı"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tevkifat Kurumu"
                  placeholder="Seçiniz"
                  required
                />
              )}
              clearOnEscape
            />
            <Autocomplete
              size="small"
              fullWidth
              options={tevkifatTitles}
              value={selectedTevkifatTitle}
              onChange={(_, value) => {
                setFormData((prev) => ({ ...prev, tevkifatTitleId: value?.id ?? '' }));
                setError('');
              }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="Sonuç bulunamadı"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tevkifat Ünvanı"
                  placeholder="Seçiniz"
                  required
                />
              )}
              clearOnEscape
            />
            <Autocomplete
              size="small"
              fullWidth
              options={branches}
              value={selectedBranch}
              onChange={(_, value) => {
                setFormData((prev) => ({ ...prev, branchId: value?.id ?? '' }));
                setError('');
              }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="Sonuç bulunamadı"
              renderInput={(params) => (
                <TextField {...params} label="Şube" placeholder="Seçiniz" required />
              )}
              clearOnEscape
            />
            <Autocomplete
              size="small"
              fullWidth
              options={memberGroups}
              value={selectedMemberGroup}
              onChange={(_, value) => {
                setFormData((prev) => ({ ...prev, memberGroupId: value?.id ?? '' }));
                setError('');
              }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="Sonuç bulunamadı"
              renderInput={(params) => (
                <TextField {...params} label="Üye Grubu" placeholder="Seçiniz" required />
              )}
              clearOnEscape
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          İptal
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || optionsLoading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {loading ? 'Onaylanıyor...' : 'Onayla'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemberApprovalDialog;
