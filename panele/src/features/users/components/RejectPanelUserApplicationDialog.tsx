import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import { rejectPanelUserApplication } from '../services/panelUserApplicationsApi';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';

interface RejectPanelUserApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  applicationId: string;
  memberName: string;
  onSuccess?: () => void;
}

const RejectPanelUserApplicationDialog: React.FC<RejectPanelUserApplicationDialogProps> = ({
  open,
  onClose,
  applicationId,
  memberName,
  onSuccess,
}) => {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  const handleSubmit = async () => {
    if (!reviewNote.trim()) {
      toast.showError('Lütfen red nedeni girin');
      return;
    }

    setSubmitting(true);
    try {
      await rejectPanelUserApplication(applicationId, { reviewNote });
      toast.showSuccess('Başvuru başarıyla reddedildi');
      onSuccess?.();
      onClose();
      setReviewNote('');
    } catch (e: unknown) {
      console.error('Reddetme hatası:', e);
      toast.showError(getApiErrorMessage(e, 'Başvuru reddedilirken bir hata oluştu'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Panel Kullanıcı Başvurusunu Reddet</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>{memberName}</strong> için panel kullanıcı başvurusu reddedilecek.
          Lütfen red nedeni girin.
        </Alert>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Red Nedeni *"
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          placeholder="Başvurunun reddedilme nedeni..."
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          İptal
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="error"
          disabled={!reviewNote.trim() || submitting}
        >
          {submitting ? <CircularProgress size={20} /> : 'Reddet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RejectPanelUserApplicationDialog;
