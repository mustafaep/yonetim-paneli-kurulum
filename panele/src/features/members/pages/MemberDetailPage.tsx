import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  alpha,
  useTheme,
  Stack,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormHelperText,
  Divider,
  Tooltip,
  IconButton,
  Grid,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import PaymentIcon from '@mui/icons-material/Payment';
import SettingsIcon from '@mui/icons-material/Settings';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import BadgeIcon from '@mui/icons-material/Badge';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import PlaceIcon from '@mui/icons-material/Place';
import SchoolIcon from '@mui/icons-material/School';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SecurityIcon from '@mui/icons-material/Security';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { getMemberById, updateMember, approveMember, rejectMember, getMemberHistory, cancelMember } from '../services/membersApi';
import MemberStatusChangeDialog from '../components/MemberStatusChangeDialog';
import MemberApprovalDialog, { type ApproveFormData } from '../components/MemberApprovalDialog';
import { ActivateMemberButton } from '../components/ActivateMemberButton';
import { getMemberPayments, fetchPaymentDocumentBlob } from '../../payments/services/paymentsApi';
import {
  getMemberDocuments,
  deleteMemberDocument,
  fetchMemberDocumentBlob,
  type MemberDocument,
} from '../../documents/services/documentsApi';
import { getDocumentTypeLabel } from '../../../shared/utils/documentTypes';
import type { MemberDetail, MemberStatus, MemberHistory } from '../../../types/member';
import type { MemberPayment } from '../../payments/services/paymentsApi';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { useSystemSettings } from '../../../app/providers/SystemSettingsContext';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import {
  getUserById,
  updateUserRoles,
  demoteUserToMember,
} from '../../users/services/usersApi';
import { getRoles } from '../../roles/services/rolesApi';
import type { CustomRole } from '../../../types/role';
import type { UserDetail } from '../../../types/user';
import type { UserScope, Province, District } from '../../../types/region';
import { getUserScopes, getProvinces, getDistricts, createUserScope, updateUserScope, deleteUserScope } from '../../regions/services/regionsApi';
import UserRolesDialog from '../../users/components/UserRolesDialog';
import UserPermissionsSection from '../../users/components/UserPermissionsSection';
import { canManageBranches } from '../../../shared/utils/permissions';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddLocationIcon from '@mui/icons-material/AddLocation';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import BookIcon from '@mui/icons-material/Book';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import TimelineIcon from '@mui/icons-material/Timeline';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import { DraftPdfCanvasPreview } from '../../documents/components/DraftPdfCanvasPreview';

const MemberDetailPage = () => {
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source'); // 'application' veya 'waiting'
  const { hasPermission } = useAuth();
  const toast = useToast();
  const { getSettingValue } = useSystemSettings();

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loadingMember, setLoadingMember] = useState(true);
  const [payments, setPayments] = useState<MemberPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [memberHistory, setMemberHistory] = useState<MemberHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // PDF görüntüleme dialog state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>('');
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Panel kullanıcı detay state'leri
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [scopes, setScopes] = useState<UserScope[]>([]);
  const [loadingScopes, setLoadingScopes] = useState(false);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  
  // Scope yönetimi state'leri
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [scopeSaving, setScopeSaving] = useState(false);
  const [scopeProvinces, setScopeProvinces] = useState<Province[]>([]);
  const [scopeDistricts, setScopeDistricts] = useState<District[]>([]);
  const [editingScope, setEditingScope] = useState<UserScope | null>(null);
  const [scopeForm, setScopeForm] = useState<{ provinceId: string; districtId: string }>({ provinceId: '', districtId: '' });
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);

  const canUploadDocument = hasPermission('DOCUMENT_UPLOAD');
  const canDownloadDocuments = hasPermission('DOCUMENT_DOWNLOAD');
  const canChangeStatus = hasPermission('MEMBER_STATUS_CHANGE');
  const canViewMember = hasPermission('MEMBER_VIEW');
  const canEditMember = hasPermission('MEMBER_UPDATE');
  const canViewMembershipDocuments = hasPermission('DOCUMENT_MEMBER_HISTORY_VIEW');
  const canViewPaymentHistory =
    hasPermission('MEMBER_PAYMENT_VIEW') || hasPermission('MEMBER_PAYMENT_LIST');
  const canViewMemberHistory = hasPermission('MEMBER_HISTORY_VIEW');
  const canViewAdvances = hasPermission('ADVANCE_VIEW');
  const canViewPanelUserDetails = hasPermission('USER_VIEW');
  const canAssignRole = hasPermission('USER_ASSIGN_ROLE');
  const canDemoteToMember =
    hasPermission('USER_SOFT_DELETE') ||
    hasPermission('PANEL_USER_APPLICATION_APPROVE');
  const { user: currentUser } = useAuth();
  const isBranchManager = canManageBranches(currentUser);
  const [demoteDialogOpen, setDemoteDialogOpen] = useState(false);
  const [demoteSubmitting, setDemoteSubmitting] = useState(false);

  // Durum değiştirme dialog state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // İptal sebebi düzenleme state
  const [editingReason, setEditingReason] = useState(false);
  const [editReasonValue, setEditReasonValue] = useState('');
  const [savingReason, setSavingReason] = useState(false);

  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  // Üye başvurusu onaylama dialog state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [initialApproveFormData, setInitialApproveFormData] = useState<Partial<ApproveFormData> | undefined>(undefined);
  const [emptyFieldsInfoDialogOpen, setEmptyFieldsInfoDialogOpen] = useState(false);
  const [emptyFieldsList, setEmptyFieldsList] = useState<string[]>([]);

  // Reddetme dialog state'i
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  // Member verisini yükle
  const loadMember = async () => {
    if (!id) return;
    setLoadingMember(true);
    try {
      const data = await getMemberById(id);
      setMember(data);
      
      // Eğer üye bir panel kullanıcısıysa ve kullanıcı görüntüleme izni varsa detayları yükle
      if (data.user?.id && canViewPanelUserDetails) {
        loadUserDetail(data.user.id);
        loadUserScopes(data.user.id);
      } else {
        setUserDetail(null);
        setScopes([]);
        setRoles([]);
      }
    } catch (error) {
      console.error('Üye detayı alınırken hata:', error);
    } finally {
      setLoadingMember(false);
    }
  };

  useEffect(() => {
    loadMember();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Panel kullanıcı detaylarını yükle
  const loadUserDetail = async (userId: string) => {
    setLoadingUserDetail(true);
    try {
      const data = await getUserById(userId);
      setUserDetail(data);
      
      // Rolleri detaylı olarak çek
      if (data.roles && data.roles.length > 0) {
        try {
          const allRoles = await getRoles();
          const userRoleDetails = allRoles
            .filter((r): r is CustomRole => 'id' in r && data.roles.some(roleName => typeof roleName === 'string' && r.name === roleName))
            .map(r => r as CustomRole);
          setRoles(userRoleDetails);
        } catch (e) {
          console.error('Roller alınırken hata:', e);
        }
      }
    } catch (e) {
      console.error('Kullanıcı detay alınırken hata:', e);
    } finally {
      setLoadingUserDetail(false);
    }
  };

  // Kullanıcı scope'larını yükle
  const loadUserScopes = async (userId: string) => {
    setLoadingScopes(true);
    try {
      const data = await getUserScopes(userId);
      const safe = Array.isArray(data) ? data : [];
      setScopes(safe);
    } catch (e) {
      console.error('User scope alınırken hata:', e);
      setScopes([]);
    } finally {
      setLoadingScopes(false);
    }
  };

  // Kesintileri yükle
  useEffect(() => {
    if (!id || !canViewPaymentHistory) {
      setPayments([]);
      setLoadingPayments(false);
      return;
    }

    const loadPayments = async () => {
      setLoadingPayments(true);
      try {
        const data = await getMemberPayments(id);
        setPayments(data);
      } catch (error) {
        console.error('Kesintiler alınırken hata:', error);
      } finally {
        setLoadingPayments(false);
      }
    };

    loadPayments();
  }, [id, canViewPaymentHistory]);

  // Evrakları yükle
  useEffect(() => {
    if (!id || !canViewMembershipDocuments) {
      setDocuments([]);
      setLoadingDocuments(false);
      return;
    }

    const loadDocuments = async () => {
      setLoadingDocuments(true);
      try {
        const data = await getMemberDocuments(id);
        setDocuments(data);
      } catch (error) {
        console.error('Evraklar alınırken hata:', error);
      } finally {
        setLoadingDocuments(false);
      }
    };

    loadDocuments();
  }, [id, canViewMembershipDocuments]);

  // Üye geçmişini yükle
  useEffect(() => {
    if (!id || !canViewMemberHistory) {
      setMemberHistory([]);
      setLoadingHistory(false);
      return;
    }

    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const data = await getMemberHistory(id);
        setMemberHistory(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Üye geçmişi alınırken hata:', error);
        setMemberHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [id, canViewMemberHistory]);


  // Rol güncelleme handler
  const handleSaveRoles = async (customRoleIds: string[]) => {
    if (!userDetail) return;
    try {
      const updated = await updateUserRoles(userDetail.id, customRoleIds);
      setUserDetail(updated);
      
      // Rolleri yeniden yükle
      if (updated.roles && updated.roles.length > 0) {
        try {
          const allRoles = await getRoles();
          const userRoleDetails = allRoles
            .filter((r): r is CustomRole => 'id' in r && updated.roles.some(roleName => typeof roleName === 'string' && r.name === roleName))
            .map(r => r as CustomRole);
          setRoles(userRoleDetails);
        } catch (e) {
          console.error('Roller alınırken hata:', e);
        }
      } else {
        setRoles([]);
      }
    } catch (e) {
      console.error('Kullanıcı rolleri güncellenirken hata:', e);
      throw e;
    }
  };

  // Scope yönetimi handler'ları
  const handleScopeFormChange = (field: 'provinceId' | 'districtId', value: string) => {
    setScopeForm((prev) => ({
      ...prev,
      [field]: value,
        ...(field === 'provinceId' ? { districtId: '' } : {}),
    }));
  };

  // Scope dialog açıldığında & il değiştiğinde alt verileri yükle
  useEffect(() => {
    const loadForProvince = async () => {
      const provinceId = scopeForm.provinceId;
      if (!provinceId) {
        setScopeDistricts([]);
        return;
      }

      try {
        const districts = await getDistricts(provinceId);
        setScopeDistricts(districts);
      } catch (e) {
        console.error('Scope province change load error:', e);
      }
    };

    if (scopeDialogOpen) {
      loadForProvince();
    }
  }, [scopeForm.provinceId, scopeDialogOpen]);

  // Scope dialog aç/kapat
  const openScopeDialog = async (scope?: UserScope) => {
    setEditingScope(scope || null);
    setScopeDialogOpen(true);
    setScopeSaving(false);
    
    if (scope) {
      setScopeForm({
          provinceId: scope.province?.id || '',
        districtId: scope.district?.id || '',
      });
    } else {
      setScopeForm({
        provinceId: '',
        districtId: '',
      });
    }

    try {
      const provinces = await getProvinces();
      setScopeProvinces(provinces);
      
      if (scope?.province?.id) {
        try {
          const districts = await getDistricts(scope.province.id);
          setScopeDistricts(districts);
        } catch (e) {
          console.error('Districts load error (scope dialog):', e);
          setScopeDistricts([]);
        }
      } else {
        setScopeDistricts([]);
      }
    } catch (e) {
      console.error('Provinces load error (scope dialog):', e);
    }
  };

  const closeScopeDialog = () => {
    if (scopeSaving) return;
    setScopeDialogOpen(false);
    setEditingScope(null);
    setScopeForm({
      provinceId: '',
      districtId: '',
    });
  };

  // Scope save (ekleme veya güncelleme)
  const handleScopeSave = async () => {
    if (!userDetail?.id) return;
    const { provinceId, districtId } = scopeForm;

    if (!provinceId && !districtId) {
      toast.showWarning('En az bir yetki alanı (il veya ilçe) seçmelisiniz.');
      return;
    }

    setScopeSaving(true);
    try {
      const payload: { provinceId?: string; districtId?: string } = {};

        if (provinceId && provinceId.trim() !== '') {
        payload.provinceId = provinceId;
      }

        if (districtId && districtId.trim() !== '') {
        payload.districtId = districtId;
      }

      if (editingScope) {
        await updateUserScope(editingScope.id, payload);
        toast.showSuccess('Yetki alanı başarıyla güncellendi.');
      } else {
        await createUserScope({
          userId: userDetail.id,
          ...payload,
        });
        toast.showSuccess('Yetki alanı başarıyla eklendi.');
      }

      await loadUserScopes(userDetail.id);
      closeScopeDialog();
    } catch (e: unknown) {
      console.error('Scope kaydedilirken hata:', e);
      toast.showError(getApiErrorMessage(e, editingScope ? 'Yetki alanı güncellenirken bir hata oluştu.' : 'Yetki alanı eklenirken bir hata oluştu.'));
    } finally {
      setScopeSaving(false);
    }
  };

  // Scope silme
  const handleDeleteScope = async (scopeId: string) => {
    if (!window.confirm('Bu yetki alanını silmek istediğinize emin misiniz?')) return;

    try {
      await deleteUserScope(scopeId);
      if (userDetail?.id) {
        await loadUserScopes(userDetail.id);
      }
      toast.showSuccess('Yetki alanı başarıyla silindi.');
    } catch (e) {
      console.error('Scope silinirken hata:', e);
      toast.showError('Yetki alanı silinirken bir hata oluştu.');
    }
  };

  const handleConfirmDemoteToMember = async () => {
    if (!member?.user?.id) return;
    setDemoteSubmitting(true);
    try {
      await demoteUserToMember(member.user.id);
      toast.showSuccess(
        `${member.firstName} ${member.lastName} artık yalnızca üye; panel hesabı kapatıldı.`,
      );
      setDemoteDialogOpen(false);
      await loadMember();
    } catch (e: unknown) {
      toast.showError(getApiErrorMessage(e, 'İşlem sırasında bir hata oluştu.'));
    } finally {
      setDemoteSubmitting(false);
    }
  };

  const formatScopeRow = (scope: UserScope) => {
    if (scope.district) {
      return {
        type: 'İlçe',
          description: `${scope.province?.name ?? ''} / ${scope.district.name}`,
      };
    }
    if (scope.province) {
      return {
        type: 'İl',
        description: `${scope.province.name}`,
      };
    }
    return {
      type: '-',
      description: '-',
    };
  };

  // Durum değiştirme handler – aktif üye istifa/ihraç/pasif olunca cancel endpoint kullanılır (dönem kaydı backend'de oluşturulur)
  const handleStatusChange = async (status: MemberStatus, reason?: string) => {
    if (!id || !member) return;

    // İstifa/İhraç edilen üyeyi ACTIVE yapmak istendiğinde aynı davranışı kullan:
    // Üye başvuru sayfasına yönlendir ve TC'yi otomatik doldur.
    if (
      status === 'ACTIVE' &&
      (member.status === 'RESIGNED' || member.status === 'EXPELLED')
    ) {
      const nationalId = member.nationalId ?? '';
      setStatusDialogOpen(false);
      navigate(
        nationalId
          ? `/members/applications/new?nationalId=${encodeURIComponent(nationalId)}`
          : '/members/applications/new',
      );
      return;
    }

    setUpdatingStatus(true);
    try {
      if (status === 'APPROVED') {
        toast.showError('Onaylı durum bu ekrandan güncellenemez.');
        return;
      }

      const isCancelStatus = status === 'RESIGNED' || status === 'EXPELLED' || status === 'INACTIVE';
      const useCancelEndpoint = member.status === 'ACTIVE' && isCancelStatus;
      if (useCancelEndpoint) {
        await cancelMember(id, reason?.trim() || '', status);
        toast.showSuccess('Üyelik iptali kaydedildi. Üyelik geçmişine eklendi.');
      } else {
        await updateMember(id, isCancelStatus ? { status, cancellationReason: reason?.trim() } : { status });
        toast.showSuccess('Üye durumu başarıyla güncellendi');
      }
      setStatusDialogOpen(false);
      const updatedMember = await getMemberById(id);
      setMember(updatedMember);
      const historyData = await getMemberHistory(id);
      setMemberHistory(Array.isArray(historyData) ? historyData : []);
    } catch (error: unknown) {
      console.error('Durum güncellenirken hata:', error);
      toast.showError(getApiErrorMessage(error, 'Durum güncellenirken bir hata oluştu'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Onaylama dialog'unu aç ve verileri yükle
  const handleOpenApproveDialog = async () => {
    if (!id || !member) return;
    
    // Form'u mevcut üye bilgileriyle doldur
    setInitialApproveFormData({
      registrationNumber: member.registrationNumber || '',
      boardDecisionDate: member.boardDecisionDate || '',
      boardDecisionBookNo: member.boardDecisionBookNo || '',
      tevkifatCenterId: member.tevkifatCenter?.id || '',
      tevkifatTitleId: member.tevkifatTitle?.id || '',
      branchId: member.branch?.id || '',
      memberGroupId: member.memberGroup?.id || '',
    });
    
    setApproveDialogOpen(true);
  };

  // Üye başvurusu onaylama handler (source=application için)
  const handleApproveApplication = async (data: ApproveFormData) => {
    if (!id || !member) return;

    setUpdatingStatus(true);
    try {
      const approveData = {
        registrationNumber: data.registrationNumber.trim(),
        boardDecisionDate: data.boardDecisionDate,
        boardDecisionBookNo: data.boardDecisionBookNo.trim(),
        tevkifatCenterId: data.tevkifatCenterId,
        tevkifatTitleId: data.tevkifatTitleId,
        branchId: data.branchId,
        memberGroupId: data.memberGroupId,
      };

      const response = await approveMember(id, approveData);
      toast.showSuccess('Üye başvurusu başarıyla onaylandı. Üye bekleyen üyeler listesine eklendi.');
      setApproveDialogOpen(false);
      setInitialApproveFormData(undefined);

      // Boş alanlar varsa bilgilendirme pop-up'ı göster
      if (response?.emptyOptionalFields?.length) {
        setEmptyFieldsList(response.emptyOptionalFields);
        setEmptyFieldsInfoDialogOpen(true);
      }

      // Üye bilgilerini yeniden yükle
      const updatedMember = await getMemberById(id);
      setMember(updatedMember);
    } catch (error: unknown) {
      console.error('Başvuru onaylanırken hata:', error);
      toast.showError(getApiErrorMessage(error, 'Başvuru onaylanırken bir hata oluştu'));
      throw error; // Re-throw so the dialog can handle it
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Üye aktifleştirildikten sonra callback
  const handleMemberActivated = async () => {
    if (!id) return;
    // Üye bilgilerini yeniden yükle
    await loadMember();
    // Source parametresini kaldırarak URL'i güncelle
    navigate(`/members/${id}`, { replace: true });
  };

  // Reddetme dialog'unu açma
  const handleOpenRejectDialog = () => {
    setRejectDialogOpen(true);
  };

  // Üye başvurusu reddetme handler (source=application için)
  const handleRejectApplication = async () => {
    if (!id || !member) return;
    setUpdatingStatus(true);
    setRejectDialogOpen(false);
    try {
      await rejectMember(id);
      toast.showSuccess('Üye başvurusu başarıyla reddedildi');
      const updatedMember = await getMemberById(id);
      setMember(updatedMember);
    } catch (error: unknown) {
      console.error('Başvuru reddedilirken hata:', error);
      toast.showError(getApiErrorMessage(error, 'Başvuru reddedilirken bir hata oluştu'));
    } finally {
      setUpdatingStatus(false);
    }
  };



  if (loadingMember) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!member) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Üye bulunamadı
      </Alert>
    );
  }

  const getStatusConfig = (status: string) => {
    const configs: any = {
      ACTIVE: {
        color: 'success',
        icon: <CheckCircleIcon fontSize="small" />,
        label: 'Aktif',
        bgColor: alpha(theme.palette.success.main, 0.1),
        headerGradient: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.95)} 0%, ${theme.palette.success.dark} 100%)`,
        headerShadow: theme.palette.success.main,
      },
      PENDING: {
        color: 'warning',
        icon: <WarningIcon fontSize="small" />,
        label: 'Beklemede',
        bgColor: alpha(theme.palette.warning.main, 0.1),
        headerGradient: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.95)} 0%, ${theme.palette.warning.dark} 100%)`,
        headerShadow: theme.palette.warning.main,
      },
      APPROVED: {
        color: 'info',
        icon: <CheckCircleIcon fontSize="small" />,
        label: 'Onaylanmış',
        bgColor: alpha(theme.palette.info.main, 0.1),
        headerGradient: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.95)} 0%, ${theme.palette.info.dark} 100%)`,
        headerShadow: theme.palette.info.main,
      },
      REJECTED: {
        color: 'error',
        icon: <CancelIcon fontSize="small" />,
        label: 'Reddedildi',
        bgColor: alpha(theme.palette.error.main, 0.1),
        headerGradient: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.95)} 0%, ${theme.palette.error.dark} 100%)`,
        headerShadow: theme.palette.error.main,
      },
      EXPELLED: {
        color: 'default',
        icon: <CancelIcon fontSize="small" />,
        label: 'İhraç',
        bgColor: alpha('#212121', 0.1),
        headerGradient: `linear-gradient(135deg, ${alpha('#212121', 0.95)} 0%, #000000 100%)`,
        headerShadow: '#212121',
      },
      RESIGNED: {
        color: 'secondary',
        icon: <CancelIcon fontSize="small" />,
        label: 'İstifa',
        bgColor: alpha(theme.palette.secondary.main, 0.1),
        headerGradient: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.95)} 0%, ${theme.palette.secondary.dark} 100%)`,
        headerShadow: theme.palette.secondary.main,
      },
      INACTIVE: {
        color: 'default',
        icon: <CancelIcon fontSize="small" />,
        label: 'Pasif',
        bgColor: alpha('#9e9e9e', 0.1),
        headerGradient: `linear-gradient(135deg, ${alpha('#757575', 0.95)} 0%, #616161 100%)`,
        headerShadow: '#757575',
      },
    };
    return configs[status] || configs.PENDING;
  };

  const statusConfig = getStatusConfig(member?.status || 'PENDING');
  const memberGroupLabel =
    member?.memberGroup?.name?.trim() || member?.membershipInfoOption?.label?.trim() || '-';

  const MEMBER_GROUP_COLOR_MAP: Record<string, { chip: string; chipText: string }> = {
    'üye': { chip: '#1565c0', chipText: '#fff' },
    'fahri üye': { chip: '#e65100', chipText: '#fff' },
    'onursal üye': { chip: '#4a148c', chipText: '#fff' },
    'aday üye': { chip: '#006064', chipText: '#fff' },
  };

  const MEMBER_GROUP_PALETTE = [
    { chip: '#1B5E20', chipText: '#fff' },
    { chip: '#880E4F', chipText: '#fff' },
    { chip: '#1A237E', chipText: '#fff' },
    { chip: '#BF360C', chipText: '#fff' },
    { chip: '#004D40', chipText: '#fff' },
    { chip: '#6A1B9A', chipText: '#fff' },
    { chip: '#B71C1C', chipText: '#fff' },
    { chip: '#01579B', chipText: '#fff' },
    { chip: '#558B2F', chipText: '#fff' },
    { chip: '#F57F17', chipText: '#fff' },
    { chip: '#4E342E', chipText: '#fff' },
    { chip: '#00695C', chipText: '#fff' },
  ];

  const getMemberGroupColors = (name: string | null | undefined) => {
    const EMPTY = { chip: '#9e9e9e', chipText: '#fff' };
    if (!name || name === '-') return EMPTY;
    const key = name.trim().toLowerCase();
    const known = MEMBER_GROUP_COLOR_MAP[key];
    if (known) return known;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    return MEMBER_GROUP_PALETTE[Math.abs(hash) % MEMBER_GROUP_PALETTE.length];
  };

  const memberGroupColors = getMemberGroupColors(memberGroupLabel);

  // İstatistik hesaplama fonksiyonları
  const calculateMembershipDuration = () => {
    if (!member?.createdAt) return null;
    const created = new Date(member.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;
    
    if (years > 0) {
      return `${years} yıl${months > 0 ? ` ${months} ay` : ''}${days > 0 ? ` ${days} gün` : ''}`;
    } else if (months > 0) {
        return `${months} ay${days > 0 ? ` ${days} gün` : ''}`;
    } else {
      return `${days} gün`;
    }
  };

  const calculateApprovalDuration = () => {
    if (!member?.createdAt || !member?.approvedAt) return null;
    const created = new Date(member.createdAt);
    const approved = new Date(member.approvedAt);
    const diffMs = approved.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
        return `${diffDays} gün${diffHours > 0 ? ` ${diffHours} saat` : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} saat`;
    } else {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffMinutes} dakika`;
    }
  };

  const calculateActiveMembershipDuration = () => {
    if (!memberHistory || memberHistory.length === 0) return null;
    
    // Status değişikliklerini bul
    const statusChanges = memberHistory.filter(h => 
      h.updatedFields && 'status' in h.updatedFields
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (statusChanges.length === 0) {
      // Eğer hiç status değişikliği yoksa ve mevcut durum ACTIVE ise, kayıt tarihinden itibaren
      if (member?.status === 'ACTIVE' && member?.createdAt) {
        return calculateMembershipDuration();
      }
      return null;
    }
    
    // En son ACTIVE olma tarihini bul
    const lastActiveChange = statusChanges.find(h => 
      h.updatedFields && 'status' in h.updatedFields && 
      (h.updatedFields.status as any)?.new === 'ACTIVE'
    );
    
    if (lastActiveChange) {
      const activeDate = new Date(lastActiveChange.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - activeDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const years = Math.floor(diffDays / 365);
      const months = Math.floor((diffDays % 365) / 30);
      const days = diffDays % 30;
      
      if (years > 0) {
        return `${years} yıl${months > 0 ? ` ${months} ay` : ''}${days > 0 ? ` ${days} gün` : ''}`;
      } else if (months > 0) {
        return `${months} ay${days > 0 ? ` ${days} gün` : ''}`;
      } else {
        return `${days} gün`;
      }
    }
    
    return null;
  };

  const getStatusChangeCount = () => {
    if (!memberHistory) return 0;
    return memberHistory.filter(h => 
      h.updatedFields && 'status' in h.updatedFields
    ).length;
  };

  const getLastStatusChangeDate = () => {
    if (!memberHistory || memberHistory.length === 0) return null;
    const statusChanges = memberHistory.filter(h => 
      h.updatedFields && 'status' in h.updatedFields
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (statusChanges.length > 0) {
      return new Date(statusChanges[0].createdAt);
    }
    return null;
  };

  const getLastActivityDate = () => {
    if (!memberHistory || memberHistory.length === 0) return null;
    const sorted = [...memberHistory].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted.length > 0 ? new Date(sorted[0].createdAt) : null;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount?: number | string | null) => {
    if (amount === null || amount === undefined || amount === '') return '-';
    return `${Number(amount).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} TL`;
  };

  const advances = member?.advances ?? [];
  const totalAdvanceAmount = advances.reduce(
    (total, advance) => total + Number(advance.amount || 0),
    0,
  );

  const InfoRow = ({ label, value, icon }: { label: string; value: string | number | null | undefined; icon?: React.ReactNode }) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        py: 1.5,
        px: 2,
        borderRadius: 2,
        transition: 'all 0.2s ease',
        bgcolor: alpha(theme.palette.divider, 0.02),
        border: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          borderColor: alpha(theme.palette.primary.main, 0.15),
          transform: 'translateX(2px)',
        },
      }}
    >
      {icon && (
        <Box
          sx={{
            color: theme.palette.primary.main,
            mt: 0.2,
            opacity: 0.85,
            display: 'flex',
            alignItems: 'center',
            fontSize: '1.1rem',
          }}
        >
          {icon}
        </Box>
      )}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            fontSize: '0.65rem',
            display: 'block',
            mb: 0.4,
          }}
        >
          {label}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
            fontSize: '0.875rem',
            wordBreak: 'break-word',
          }}
        >
          {value || '-'}
        </Typography>
      </Box>
    </Box>
  );

  const SectionCard = ({
    title,
    icon,
    children,
    actions,
  }: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        overflow: 'hidden',
        boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
        background: '#fff',
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.2),
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          >
            {icon}
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1.15rem',
              color: theme.palette.text.primary,
              letterSpacing: 0.2,
            }}
          >
            {title}
          </Typography>
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {actions}
          </Box>
        )}
      </Box>
      <CardContent sx={{ p: 2.5 }}>{children}</CardContent>
    </Card>
  );

  return (
    <PageLayout>
      <PageHeader
        icon={
          <PersonIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />
        }
        iconSize={{ xs: 56, sm: 64 }}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {member?.firstName || ''} {member?.lastName || ''}
            {member?.user && (
              <Chip
                icon={<SecurityIcon />}
                label="Panel Kullanıcısı"
                size="small"
                sx={{
                  bgcolor: alpha('#fff', 0.92),
                  color: theme.palette.primary.dark,
                  fontWeight: 700,
                  border: `2px solid ${alpha(theme.palette.primary.dark, 0.18)}`,
                  backdropFilter: 'blur(10px)',
                  boxShadow: `0 4px 12px ${alpha('#000', 0.2)}`,
                  fontSize: '0.75rem',
                  height: 28,
                  '& .MuiChip-icon': { 
                    color: theme.palette.primary.dark,
                    fontSize: '1rem',
                  },
                }}
              />
            )}
          </Box>
        }
        description={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', fontWeight: 500, fontSize: { xs: '0.9rem', sm: '1rem' } }}
            >
              {member?.nationalId && member?.registrationNumber
                ? `TC: ${member.nationalId} • Kayıt No: ${member.registrationNumber} • ${statusConfig.label}`
                : member?.nationalId
                ? `TC: ${member.nationalId} • ${statusConfig.label}`
                : member?.registrationNumber
                ? `Kayıt No: ${member.registrationNumber} • ${statusConfig.label}`
                : statusConfig.label}
            </Typography>
            <Chip
              label={memberGroupLabel}
              size="small"
              sx={{
                alignSelf: 'flex-start',
                backgroundColor: memberGroupColors.chip,
                color: memberGroupColors.chipText,
                fontWeight: 700,
                fontSize: '0.78rem',
                height: 26,
                borderRadius: 1.5,
                px: 0.5,
                boxShadow: `0 2px 6px ${alpha(memberGroupColors.chip, 0.35)}`,
              }}
            />
          </Box>
        }
        color={statusConfig.headerShadow}
        darkColor={statusConfig.headerShadow}
        lightColor={alpha(statusConfig.headerShadow, 0.1)}
        rightContent={
          <Stack direction="row" spacing={1.5}>
            {canEditMember && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/members/${id}/edit`)}
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 1.25,
                  fontSize: '0.95rem',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.45)}`,
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  },
                }}
              >
                Düzenle
              </Button>
            )}
            {canChangeStatus && member?.status !== 'PENDING' && member?.status !== 'APPROVED' && (
              <Button
                variant="contained"
                startIcon={<SettingsIcon />}
                onClick={() => setStatusDialogOpen(true)}
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 1.25,
                  fontSize: '0.95rem',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.45)}`,
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  },
                }}
              >
                Durum Değiştir
              </Button>
            )}
          </Stack>
        }
        mobileContent={
          <Stack spacing={1.5}>
            {canEditMember && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                fullWidth
                onClick={() => navigate(`/members/${id}/edit`)}
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  fontSize: '0.95rem',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`,
                }}
              >
                Düzenle
              </Button>
            )}
            {canChangeStatus && member?.status !== 'PENDING' && member?.status !== 'APPROVED' && (
              <Button
                variant="contained"
                startIcon={<SettingsIcon />}
                fullWidth
                onClick={() => setStatusDialogOpen(true)}
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  fontSize: '0.95rem',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`,
                }}
              >
                Durum Değiştir
              </Button>
            )}
          </Stack>
        }
      />

      {/* Panel kullanıcı bilgileri artık ayrı detay sayfasında */}
      {member.user && canViewPanelUserDetails && (
        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <SecurityIcon sx={{ fontSize: '1.4rem', color: theme.palette.primary.main }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Panel Kullanıcı Detayı
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Bu üyenin panel kullanıcı bilgileri ayrı detay sayfasında görüntülenir.
                  </Typography>
                </Box>
              </Box>

              <Stack direction="row" spacing={1}>
                {canDemoteToMember && member.user.id !== currentUser?.id && (
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={() => setDemoteDialogOpen(true)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Üyeliğe Düşür
                  </Button>
                )}
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => navigate(`/users/panel/${member.user!.id}`)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, whiteSpace: 'nowrap' }}
                >
                  Panel Kullanıcı Detayına Git
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={demoteDialogOpen}
        onClose={() => !demoteSubmitting && setDemoteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Panel erişimini kaldır</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            <strong>
              {member?.firstName} {member?.lastName}
            </strong>{' '}
            kullanıcısının panel hesabı kapatılacak; kişi yalnızca üye olarak kalacak.
            Devam edilsin mi?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDemoteDialogOpen(false)} disabled={demoteSubmitting}>
            Vazgeç
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => void handleConfirmDemoteToMember()}
            disabled={demoteSubmitting}
          >
            {demoteSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Evet, üyeliğe düşür'}
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* İhraç/İstifa Açıklaması */}
        {(member?.status === 'EXPELLED' || member?.status === 'RESIGNED') && (
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `2px solid ${alpha(
                member.status === 'EXPELLED' ? theme.palette.error.main : theme.palette.secondary.main,
                0.3
              )}`,
              background: `linear-gradient(135deg, ${alpha(
                member.status === 'EXPELLED' ? theme.palette.error.main : theme.palette.secondary.main,
                0.08
              )} 0%, ${alpha(
                member.status === 'EXPELLED' ? theme.palette.error.light : theme.palette.secondary.light,
                0.05
              )} 100%)`,
              boxShadow: `0 4px 16px ${alpha(
                member.status === 'EXPELLED' ? theme.palette.error.main : theme.palette.secondary.main,
                0.15
              )}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${
                      member.status === 'EXPELLED' ? theme.palette.error.main : theme.palette.info.main
                    } 0%, ${
                      member.status === 'EXPELLED' ? theme.palette.error.dark : theme.palette.info.dark
                    } 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 12px ${alpha(
                      member.status === 'EXPELLED' ? theme.palette.error.main : theme.palette.info.main,
                      0.3
                    )}`,
                    flexShrink: 0,
                  }}
                >
                  <CancelIcon sx={{ color: '#fff', fontSize: '1.5rem' }} />
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: '1.1rem', sm: '1.25rem' },
                        color: member.status === 'EXPELLED' ? theme.palette.error.dark : theme.palette.info.dark,
                      }}
                    >
                      {member.status === 'EXPELLED' ? 'İhraç Nedeni' : 'İstifa Nedeni'}
                    </Typography>
                    {!editingReason && canEditMember && (
                      <Tooltip title="Sebebi düzenle">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditReasonValue(member.cancellationReason ?? '');
                            setEditingReason(true);
                          }}
                          sx={{ color: member.status === 'EXPELLED' ? theme.palette.error.main : theme.palette.info.main }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>

                  {editingReason ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {(() => {
                        const raw = getSettingValue('MEMBERSHIP_DEFAULT_CANCELLATION_REASONS', '');
                        const presets = raw ? raw.split(',').map((r) => r.trim()).filter(Boolean) : [];
                        return presets.length > 0 ? (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                              Hızlı seçim:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                              {presets.map((preset) => (
                                <Chip
                                  key={preset}
                                  label={preset}
                                  size="small"
                                  clickable
                                  disabled={savingReason}
                                  onClick={() => setEditReasonValue(preset)}
                                  color={editReasonValue === preset ? 'primary' : 'default'}
                                  variant={editReasonValue === preset ? 'filled' : 'outlined'}
                                />
                              ))}
                            </Box>
                          </Box>
                        ) : null;
                      })()}
                      <TextField
                        value={editReasonValue}
                        onChange={(e) => setEditReasonValue(e.target.value)}
                        multiline
                        rows={3}
                        fullWidth
                        size="small"
                        placeholder="İptal sebebini girin..."
                        disabled={savingReason}
                        autoFocus
                        sx={{ backgroundColor: alpha(theme.palette.background.paper, 0.8), borderRadius: 1 }}
                      />
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={savingReason}
                          onClick={() => setEditingReason(false)}
                          startIcon={<CloseIcon />}
                        >
                          Vazgeç
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={savingReason || !editReasonValue.trim()}
                          onClick={async () => {
                            setSavingReason(true);
                            try {
                              await updateMember(member.id, { cancellationReason: editReasonValue.trim() });
                              const updated = await getMemberById(member.id);
                              setMember(updated);
                              setEditingReason(false);
                              toast.showSuccess('İptal sebebi güncellendi');
                            } catch {
                              toast.showError('İptal sebebi güncellenirken hata oluştu');
                            } finally {
                              setSavingReason(false);
                            }
                          }}
                          startIcon={savingReason ? <CircularProgress size={14} /> : <CheckIcon />}
                        >
                          Kaydet
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <>
                      {member.cancellationReason ? (
                        <Typography
                          variant="body1"
                          sx={{
                            color: theme.palette.text.primary,
                            lineHeight: 1.7,
                            fontSize: { xs: '0.9rem', sm: '1rem' },
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {member.cancellationReason}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Sebep girilmemiş
                        </Typography>
                      )}
                      {member.cancelledAt && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 2,
                            color: theme.palette.text.secondary,
                            fontSize: '0.875rem',
                            fontWeight: 500,
                          }}
                        >
                          Tarih: {new Date(member.cancelledAt).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </Typography>
                      )}
                    </>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Onaylama İşlemi Alanı - PENDING veya APPROVED durumları için */}
        {(member?.status === 'PENDING' || member?.status === 'APPROVED') && canChangeStatus && (
          <Card
            elevation={0}
            sx={{
              mb: 3,
              borderRadius: 3,
              border: `2px dashed ${alpha(theme.palette.warning.main, 0.3)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, ${alpha(theme.palette.warning.light, 0.02)} 100%)`,
              boxShadow: `0 4px 20px ${alpha(theme.palette.warning.main, 0.08)}`,
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: alpha(theme.palette.warning.main, 0.5),
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 28px ${alpha(theme.palette.warning.main, 0.15)}`,
              },
            }}
          >
            {/* Dekoratif arka plan */}
            <Box
              sx={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: alpha(theme.palette.warning.main, 0.06),
              }}
            />
            
            <CardContent sx={{ p: { xs: 2.5, sm: 4 }, position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2.5,
                      background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      boxShadow: `0 4px 14px ${alpha(theme.palette.warning.main, 0.35)}`,
                      flexShrink: 0,
                    }}
                  >
                    <AssignmentIcon sx={{ fontSize: '1.8rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 0.5, lineHeight: 1.3 }}>
                      {member?.status === 'PENDING' && 'Üye Başvurusu Onaylama'}
                      {member?.status === 'APPROVED' && 'Üyeyi Aktifleştirme'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary, lineHeight: 1.6, maxWidth: 500 }}>
                      {member?.status === 'PENDING' && 'Bu başvuruyu onaylayarak üyeyi bekleyen üyeler listesine ekleyebilir veya başvuruyu reddedebilirsiniz.'}
                      {member?.status === 'APPROVED' && 'Onaylanmış bu üyeyi aktif hale getirerek ana üye listesine ekleyebilirsiniz.'}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Chip 
                        icon={statusConfig.icon} 
                        label={statusConfig.label}
                        size="small" 
                        color={statusConfig.color}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      {member?.status === 'PENDING' && (
                        <Chip 
                          icon={<AssignmentIcon />} 
                          label="Başvuru Aşamasında" 
                          size="small" 
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                      {member?.status === 'APPROVED' && (
                        <Chip 
                          icon={<HourglassEmptyIcon />} 
                          label="Aktifleşme Bekliyor" 
                          size="small" 
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
                
                {/* Butonlar */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, minWidth: { xs: '100%', sm: 'auto' } }}>
                  {/* Üye Başvuruları için - PENDING durumu */}
                  {member?.status === 'PENDING' && (
                    <>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<CheckCircleIcon />}
                        onClick={handleOpenApproveDialog}
                        disabled={updatingStatus}
                        sx={{
                          borderRadius: 2.5,
                          textTransform: 'none',
                          fontWeight: 700,
                          bgcolor: theme.palette.success.main,
                          color: '#fff',
                          px: 3,
                          py: 1.5,
                          fontSize: '0.95rem',
                          boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`,
                          whiteSpace: 'nowrap',
                          '&:hover': {
                            bgcolor: theme.palette.success.dark,
                            transform: 'translateY(-2px)',
                            boxShadow: `0 8px 20px ${alpha(theme.palette.success.main, 0.4)}`,
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Başvuruyu Onayla
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        startIcon={<CancelIcon />}
                        onClick={handleOpenRejectDialog}
                        disabled={updatingStatus}
                        sx={{
                          borderRadius: 2.5,
                          textTransform: 'none',
                          fontWeight: 700,
                          px: 3,
                          py: 1.5,
                          fontSize: '0.95rem',
                          borderWidth: 2,
                          borderColor: theme.palette.error.main,
                          color: theme.palette.error.main,
                          whiteSpace: 'nowrap',
                          '&:hover': {
                            borderWidth: 2,
                            borderColor: theme.palette.error.dark,
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            transform: 'translateY(-2px)',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Başvuruyu Reddet
                      </Button>
                    </>
                  )}

                  {/* Bekleyen Üyeler için - APPROVED durumu */}
                  {member?.status === 'APPROVED' && (
                    <>
                      <ActivateMemberButton
                        memberId={id!}
                        memberName={`${member.firstName} ${member.lastName}`}
                        onActivated={handleMemberActivated}
                        disabled={updatingStatus}
                        variant="contained"
                        size="large"
                      />
                      <Button
                        variant="outlined"
                        size="large"
                        startIcon={<CancelIcon />}
                        onClick={handleOpenRejectDialog}
                        disabled={updatingStatus}
                        sx={{
                          borderRadius: 2.5,
                          textTransform: 'none',
                          fontWeight: 700,
                          px: 3,
                          py: 1.5,
                          fontSize: '0.95rem',
                          borderWidth: 2,
                          borderColor: theme.palette.error.main,
                          color: theme.palette.error.main,
                          whiteSpace: 'nowrap',
                          '&:hover': {
                            borderWidth: 2,
                            borderColor: theme.palette.error.dark,
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            transform: 'translateY(-2px)',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Üyeyi Reddet
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Kişisel Bilgiler */}
        <SectionCard title="Kişisel Bilgiler" icon={<PersonIcon />}>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
            <InfoRow label="TC Kimlik Numarası" value={member?.nationalId || '-'} icon={<BadgeIcon />} />
            <InfoRow label="Üye Numarası" value={member?.registrationNumber || '-'} icon={<BadgeIcon />} />
            <InfoRow label="Adı" value={member?.firstName || '-'} icon={<PersonIcon />} />
            <InfoRow label="Soyadı" value={member?.lastName || '-'} icon={<PersonIcon />} />
            <InfoRow label="Anne Adı" value={member?.motherName || '-'} icon={<PersonIcon />} />
            <InfoRow label="Baba Adı" value={member?.fatherName || '-'} icon={<PersonIcon />} />
            <InfoRow
              label="Doğum Tarihi"
              value={member?.birthDate ? new Date(member.birthDate).toLocaleDateString('tr-TR') : '-'}
              icon={<CalendarTodayIcon />}
            />
            <InfoRow label="Doğum Yeri" value={member?.birthplace || '-'} icon={<PlaceIcon />} />
            <InfoRow
              label="Cinsiyet"
              value={member?.gender === 'MALE' ? 'Erkek' : member?.gender === 'FEMALE' ? 'Kadın' : '-'}
              icon={<PersonIcon />}
            />
            <InfoRow
              label="Öğrenim Durumu"
              value={
                member?.educationStatus === 'COLLEGE'
                  ? 'Yüksekokul'
                  : member?.educationStatus === 'HIGH_SCHOOL'
                    ? 'Lise'
                    : member?.educationStatus === 'PRIMARY'
                      ? 'İlköğretim'
                      : '-'
              }
              icon={<SchoolIcon />}
            />
            <InfoRow label="Telefon" value={member?.phone || '-'} icon={<PhoneIcon />} />
            <InfoRow label="E-posta" value={member?.email || '-'} icon={<EmailIcon />} />
            <InfoRow 
              label="Bölge İl" 
              value={member?.province?.name || '-'} 
              icon={<PlaceIcon />} 
            />
            <InfoRow 
              label="Bölge İlçe" 
              value={member?.district?.name || '-'} 
              icon={<PlaceIcon />} 
            />
          </Box>
        </SectionCard>

        {/* Kurum, Şube, Tevkifat ve Üyelik Bilgileri - Yeni Düzen */}
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' } }}>
          {/* Sol Sütun - Kurum Bilgileri */}
          <SectionCard title="Kurum Bilgileri" icon={<WorkIcon />}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <InfoRow label="Kurum Adı" value={member?.institution?.name || '-'} icon={<AccountBalanceIcon />} />
              <InfoRow label="Görev Birimi" value={member?.dutyUnit || '-'} icon={<WorkIcon />} />
              <InfoRow label="Kurum Adresi" value={member?.institutionAddress || '-'} icon={<PlaceIcon />} />
              <InfoRow label="Kurum İli" value={member?.institutionProvince?.name || '-'} icon={<PlaceIcon />} />
              <InfoRow label="Kurum İlçesi" value={member?.institutionDistrict?.name || '-'} icon={<PlaceIcon />} />
              <InfoRow label="Meslek/Unvan" value={member?.profession?.name || '-'} icon={<WorkIcon />} />
              <InfoRow label="Kurum Sicil No" value={member?.institutionRegNo || '-'} icon={<BadgeIcon />} />
              <InfoRow label="Kadro Unvan Kodu" value={member?.staffTitleCode || '-'} icon={<BadgeIcon />} />
            </Box>
          </SectionCard>

          {/* Sağ Sütun - Şube, Tevkifat ve Üyelik Bilgileri */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Şube Bilgileri */}
            <SectionCard title="Şube Bilgileri" icon={<CorporateFareIcon />}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InfoRow
                  label="Şube"
                  value={member?.branch?.name ? `${member.branch.name}${member.branch.code ? ` (${member.branch.code})` : ''}` : '-'}
                  icon={<AccountBalanceIcon />}
                />
              </Box>
            </SectionCard>

            {/* Tevkifat Bilgileri */}
            <SectionCard title="Tevkifat Bilgileri" icon={<AccountBalanceIcon />}>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <InfoRow label="Tevkifat Kurumu" value={member?.tevkifatCenter?.name || '-'} icon={<CorporateFareIcon />} />
                <InfoRow label="Tevkifat Ünvanı" value={member?.tevkifatTitle?.name || '-'} icon={<WorkIcon />} />
              </Box>
            </SectionCard>

            {/* Üyelik Bilgileri */}
            <SectionCard title="Üyelik Bilgileri" icon={<PersonIcon />}>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <InfoRow label="Üyelik Durumu" value={statusConfig.label} icon={<CheckCircleIcon />} />
                <InfoRow
                  label="Üye Grubu"
                  value={member?.memberGroup?.name || member?.membershipInfoOption?.label || '-'}
                  icon={<PersonIcon />}
                />
                <InfoRow label="Yönetim Karar Defteri No" value={member?.boardDecisionBookNo || '-'} icon={<BadgeIcon />} />
                <InfoRow
                  label="Yönetim Kurulu Karar Tarihi"
                  value={member?.boardDecisionDate ? new Date(member.boardDecisionDate).toLocaleDateString('tr-TR') : '-'}
                  icon={<CalendarTodayIcon />}
                />
              </Box>
            </SectionCard>

          </Box>
        </Box>

        {canViewAdvances && advances.length > 0 && (
          <SectionCard title="Avans Bilgileri" icon={<PaymentIcon />}>
            {/* Özet Kartlar */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                mb: 3,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 2,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.warning.main, 0.07),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.18)}`,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.warning.main, 0.15),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.palette.warning.dark,
                    flexShrink: 0,
                  }}
                >
                  <PaymentIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      fontSize: '0.65rem',
                      display: 'block',
                    }}
                  >
                    Toplam Avans Sayısı
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: theme.palette.warning.dark, lineHeight: 1.2 }}>
                    {advances.length}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 2,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.success.main, 0.07),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.success.main, 0.15),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.palette.success.dark,
                    flexShrink: 0,
                  }}
                >
                  <AccountBalanceIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      fontSize: '0.65rem',
                      display: 'block',
                    }}
                  >
                    Toplam Tutar
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: theme.palette.success.dark, lineHeight: 1.2 }}>
                    {formatCurrency(totalAdvanceAmount)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Avans Tablosu */}
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                overflowX: 'auto',
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.warning.main, 0.05) }}>
                    <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary, fontSize: '0.8rem' }}>Tarih</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary, fontSize: '0.8rem' }}>Dönem</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: theme.palette.text.primary, fontSize: '0.8rem' }}>Tutar</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary, fontSize: '0.8rem' }}>Açıklama</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {advances.map((advance, index) => (
                    <TableRow
                      key={advance.id}
                      sx={{
                        bgcolor: index === 0 ? alpha(theme.palette.warning.main, 0.03) : 'transparent',
                        '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.05) },
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <CalendarTodayIcon sx={{ fontSize: '0.85rem', color: theme.palette.text.secondary }} />
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem' }}>
                            {new Date(advance.advanceDate).toLocaleDateString('tr-TR')}
                          </Typography>
                          {index === 0 && (
                            <Chip
                              label="Son"
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                bgcolor: alpha(theme.palette.warning.main, 0.15),
                                color: theme.palette.warning.dark,
                                ml: 0.5,
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem', color: theme.palette.text.secondary }}>
                          {String(advance.month).padStart(2, '0')}/{advance.year}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, fontSize: '0.85rem', color: theme.palette.success.dark }}
                        >
                          {formatCurrency(advance.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.8rem',
                            color: advance.description ? theme.palette.text.primary : theme.palette.text.disabled,
                            fontStyle: advance.description ? 'normal' : 'italic',
                          }}
                        >
                          {advance.description || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </SectionCard>
        )}

        {/* Üyelik Geçmişi / Hareketler */}
        {canViewMemberHistory && (
          <SectionCard title="Üyelik Geçmişi / Hareketler" icon={<TimelineIcon />}>
          {(() => {
            const periods = member?.membershipPeriods ?? [];
            const currentRegNo = member?.registrationNumber;
            const currentApprovedAt = member?.approvedAt;
            const history = memberHistory ?? [];

            // Güncel dönem sadece ACTIVE veya APPROVED iken gösterilir; PENDING (başvuru aşaması) iken "(Aktif)" satırı eklenmez
            const showCurrentPeriod =
              (member?.status === 'ACTIVE' || member?.status === 'APPROVED') &&
              currentRegNo &&
              !periods.some((p) => p.registrationNumber === currentRegNo && !p.periodEnd);

            type TimelineItem = { type: 'join' | 'leave' | 'status'; date: string; text: string };
            const items: TimelineItem[] = [];

            // Dönem satırında "X tarafından" metni
            const periodByStr = (user: { firstName?: string; lastName?: string } | null | undefined) => {
              if (!user?.firstName && !user?.lastName) return '';
              return `${[user.firstName, user.lastName].filter(Boolean).join(' ').trim()} tarafından `;
            };
            // 1) Dönem kayıtlarından: üye oldu + istifa/ihraç (onaylayan / iptal eden kişi varsa eklenir)
            periods.forEach((p) => {
              const startDate = p.periodStart
                ? new Date(p.periodStart).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '';
              const joinBy = periodByStr(p.approvedBy);
              items.push({
                type: 'join',
                date: p.periodStart,
                text: `${joinBy}${startDate}'de başvuru onaylandı; üye oldu, ${p.registrationNumber} numarası verildi.`,
              });
              const isLeave = p.status === 'RESIGNED' || p.status === 'EXPELLED' || p.status === 'INACTIVE';
              if (isLeave) {
                const leaveDate = p.cancelledAt ?? p.periodEnd;
                const endDateStr = leaveDate
                  ? new Date(leaveDate).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '';
                const statusLabel =
                  p.status === 'RESIGNED' ? 'istifa etti' : p.status === 'EXPELLED' ? 'ihraç edildi' : p.status === 'INACTIVE' ? 'pasif edildi' : 'üyelik sona erdi';
                const regNoPart = p.registrationNumber ? ` Üye numarası: ${p.registrationNumber}.` : '';
                const reasonSuffix = p.cancellationReason?.trim() ? ` İstifa/ihraç sebebi: ${p.cancellationReason.trim()}.` : '';
                const leaveBy = periodByStr(p.cancelledBy);
                const mainText = endDateStr
                  ? `${leaveBy}${endDateStr}'de üyelikten ${statusLabel}.`
                  : `${leaveBy}Üyelikten ${statusLabel}.`;
                items.push({
                  type: 'leave',
                  date: leaveDate || p.periodStart,
                  text: mainText + regNoPart + reasonSuffix,
                });
              }
            });

            // 2) Güncel dönem (aktif/onaylı, henüz period'a yazılmamış) – onaylayan kişi varsa eklenir
            if (showCurrentPeriod) {
              const approvedOrCreated = currentApprovedAt || member?.createdAt;
              const startDate = approvedOrCreated
                ? new Date(approvedOrCreated).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '';
              const approvedByUser = member?.approvedBy;
              const byStr =
                approvedByUser?.firstName || approvedByUser?.lastName
                  ? `${[approvedByUser.firstName, approvedByUser.lastName].filter(Boolean).join(' ').trim()} tarafından `
                  : '';
              const mainText =
                periods.length > 0
                  ? `tekrar üye oldu, ${currentRegNo} numarası verildi. (Aktif)`
                  : `üye oldu, ${currentRegNo} numarası verildi. (Aktif)`;
              items.push({
                type: 'join',
                date: approvedOrCreated || new Date().toISOString(),
                text: `${byStr}${startDate}'de başvuru onaylandı; ${mainText}`,
              });
            }

            // 3) Geçmiş kayıtlarından status değişikliklerini ekle (işlemi yapan kişi + tarih + işlem)
            const byUserStr = (user: { firstName?: string; lastName?: string } | null | undefined) => {
              if (!user?.firstName && !user?.lastName) return '';
              const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
              return name ? `${name} tarafından ` : '';
            };
            history.forEach((h) => {
              const dateStr = h.createdAt
                ? new Date(h.createdAt).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '';
              const by = byUserStr(h.changedByUser);
              const prefix = by ? `${by}${dateStr}'de ` : `${dateStr}'de `;
              if (h.action === 'CREATE') {
                items.push({
                  type: 'status',
                  date: h.createdAt,
                  text: `${prefix}üye başvurusu oluşturuldu.`,
                });
                return;
              }
              if (h.action !== 'UPDATE' || !h.updatedFields) return;
              const statusChange = h.updatedFields.status as { old?: string; new?: string } | undefined;
              if (!statusChange?.old || !statusChange?.new || statusChange.old === statusChange.new) return;
              const oldS = statusChange.old;
              const newS = statusChange.new;
              const reason = (h.updatedFields.cancellationReason as { new?: string } | undefined)?.new;
              const reasonSuffix = reason?.trim() ? ` Sebep: ${reason.trim()}.` : '';

              // İstifa/ihraç/pasif zaten dönem kaydından (leave) gösteriliyor; history'den tekrar ekleme
              if (oldS === 'ACTIVE' && (newS === 'RESIGNED' || newS === 'EXPELLED' || newS === 'INACTIVE')) return;

              let text = '';
              if (oldS === 'PENDING' && newS === 'APPROVED') text = `${prefix}üye başvurusu onaylandı.`;
              else if (oldS === 'PENDING' && newS === 'REJECTED') text = `${prefix}üye başvurusu reddedildi.`;
              else if (oldS === 'APPROVED' && newS === 'ACTIVE') text = `${prefix}onaylanmış üye aktifleştirildi.`;
              else if ((oldS === 'RESIGNED' || oldS === 'EXPELLED' || oldS === 'INACTIVE') && newS === 'PENDING')
                text = `${prefix}üye istifa/ihraç sonrası tekrar üye başvurusu yaptı.`;
              else text = `${prefix}üyelik durumu ${oldS} → ${newS} olarak güncellendi.`;

              if (text) items.push({ type: 'status', date: h.createdAt, text: text + reasonSuffix });
            });

            items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (items.length === 0) {
              return (
                <Alert
                  severity="info"
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                    bgcolor: alpha(theme.palette.info.main, 0.05),
                  }}
                >
                  Henüz üyelik hareketi kaydı bulunmuyor.
                </Alert>
              );
            }

            const bulletColor = (type: TimelineItem['type']) =>
              type === 'join' ? theme.palette.success.main : type === 'leave' ? theme.palette.error.main : theme.palette.info.main;

            return (
              <Box component="ul" sx={{ m: 0, pl: 2.5, listStyle: 'none' }}>
                {items.map((item, idx) => (
                  <Box
                    component="li"
                    key={idx}
                    sx={{
                      position: 'relative',
                      pb: 1.5,
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: -20,
                        top: 8,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: bulletColor(item.type),
                      },
                      '&:not(:last-child)::after': {
                        content: '""',
                        position: 'absolute',
                        left: -17,
                        top: 18,
                        bottom: 0,
                        width: 2,
                        bgcolor: alpha(theme.palette.divider, 0.5),
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                      {item.text}
                    </Typography>
                  </Box>
                ))}
              </Box>
            );
          })()}
          </SectionCard>
        )}

        {/* Üyelik Evrakları */}
        {canViewMembershipDocuments && (
          <SectionCard title="Üyelik Evrakları" icon={<AssignmentIcon />}>
          {loadingDocuments ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : documents.length === 0 ? (
            <Alert 
              severity="info" 
              sx={{ 
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                bgcolor: alpha(theme.palette.info.main, 0.05),
              }}
            >
              Bu üye için henüz evrak yüklenmemiştir.
            </Alert>
          ) : (
            <TableContainer 
              component={Paper} 
              variant="outlined" 
              sx={{ 
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                boxShadow: 'none',
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  height: 8,
                },
                '&::-webkit-scrollbar-track': {
                  bgcolor: alpha(theme.palette.divider, 0.05),
                },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: alpha(theme.palette.primary.main, 0.3),
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.5),
                  },
                },
              }}
            >
              <Table sx={{ minWidth: { xs: 650, sm: 'auto' } }}>
                <TableHead>
                  <TableRow 
                    sx={{ 
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, whiteSpace: 'nowrap' }}>Doküman Türü</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, whiteSpace: 'nowrap' }}>Dosya Adı</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>Oluşturulma Tarihi</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, whiteSpace: 'nowrap', display: { xs: 'none', lg: 'table-cell' } }}>Oluşturan</TableCell>
                    {(canDownloadDocuments || canUploadDocument) && (
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, whiteSpace: 'nowrap' }}>İşlemler</TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.map(document => (
                    <TableRow 
                      key={document.id} 
                      hover
                      sx={{
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.03),
                        },
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          {getDocumentTypeLabel(document.documentType)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          {document.fileName}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          {document.generatedAt ? new Date(document.generatedAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }) : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          {document.generatedByUser ? `${document.generatedByUser.firstName} ${document.generatedByUser.lastName}` : '-'}
                        </Typography>
                      </TableCell>
                      {(canDownloadDocuments || canUploadDocument) && (
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {canDownloadDocuments && (
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={deletingDocumentId === document.id}
                                startIcon={<PictureAsPdfIcon />}
                                onClick={async () => {
                                  try {
                                    setLoadingPdf(true);
                                    const blob = await fetchMemberDocumentBlob(document.id);
                                    const blobUrl = window.URL.createObjectURL(blob);
                                    setPdfUrl(blobUrl);
                                    setPdfTitle(document.fileName || 'Belge');
                                    setPdfViewerOpen(true);
                                  } catch (error) {
                                    console.error('Dosya görüntülenirken hata:', error);
                                    toast.showError('Dosya görüntülenemedi');
                                  } finally {
                                    setLoadingPdf(false);
                                  }
                                }}
                                sx={{
                                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                  px: { xs: 1, sm: 1.5 },
                                  py: { xs: 0.5, sm: 0.75 },
                                  minWidth: 'auto',
                                }}
                              >
                                Görüntüle
                              </Button>
                            )}
                            {canUploadDocument && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                disabled={deletingDocumentId === document.id}
                                startIcon={
                                  deletingDocumentId === document.id ? (
                                    <CircularProgress size={14} color="inherit" />
                                  ) : (
                                    <DeleteIcon fontSize="small" />
                                  )
                                }
                                onClick={async () => {
                                  const confirmed = window.confirm(
                                    `"${document.fileName || 'Bu evrak'}" silinecek. Devam etmek istiyor musunuz?`,
                                  );
                                  if (!confirmed || !id) return;

                                  setDeletingDocumentId(document.id);
                                  try {
                                    await deleteMemberDocument(document.id);
                                    toast.showSuccess('Evrak başarıyla silindi');
                                    const data = await getMemberDocuments(id);
                                    setDocuments(data);
                                  } catch (error: unknown) {
                                    console.error('Evrak silinirken hata:', error);
                                    toast.showError(getApiErrorMessage(error, 'Evrak silinirken bir hata oluştu'));
                                  } finally {
                                    setDeletingDocumentId(null);
                                  }
                                }}
                                sx={{
                                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                  px: { xs: 1, sm: 1.5 },
                                  py: { xs: 0.5, sm: 0.75 },
                                  minWidth: 'auto',
                                }}
                              >
                                {deletingDocumentId === document.id ? 'Siliniyor...' : 'Sil'}
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          </SectionCard>
        )}

        {/* Kesintiler */}
        {canViewPaymentHistory && (
          <SectionCard title="Kesinti / Kesinti Geçmişi" icon={<PaymentIcon />}>
            {loadingPayments ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : payments.length === 0 ? (
              <Alert 
                severity="info" 
                sx={{ 
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  bgcolor: alpha(theme.palette.info.main, 0.05),
                }}
              >
                Bu üye için henüz Kesinti kaydı bulunmamaktadır.
              </Alert>
            ) : (
              <TableContainer 
                component={Paper} 
                variant="outlined" 
                sx={{ 
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  boxShadow: 'none',
                  overflow: 'auto',
                  '&::-webkit-scrollbar': {
                    height: 8,
                  },
                  '&::-webkit-scrollbar-track': {
                    bgcolor: alpha(theme.palette.divider, 0.05),
                  },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: alpha(theme.palette.primary.main, 0.3),
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.5),
                    },
                  },
                }}
              >
                <Table sx={{ minWidth: { xs: 650, sm: 'auto' } }}>
                  <TableHead>
                    <TableRow 
                      sx={{ 
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>Dönem</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>Tutar</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center', verticalAlign: 'middle' }}>Kesinti Türü</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>Durum</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.9rem' }, whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' }, textAlign: 'center', verticalAlign: 'middle' }}>Belge</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map(payment => {
                      const monthNames = [
                        'Ocak',
                        'Şubat',
                        'Mart',
                        'Nisan',
                        'Mayıs',
                        'Haziran',
                        'Temmuz',
                        'Ağustos',
                        'Eylül',
                        'Ekim',
                        'Kasım',
                        'Aralık',
                      ];
                      const monthName = monthNames[payment.paymentPeriodMonth - 1];

                      const paymentTypeLabels: any = {
                        TEVKIFAT: 'Tevkifat',
                        ELDEN: 'Elden',
                        HAVALE: 'Havale',
                      };

                      return (
                        <TableRow 
                          key={payment.id} 
                          hover
                          sx={{
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.03),
                            },
                            transition: 'background-color 0.2s ease',
                          }}
                        >
                          <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              {monthName} {payment.paymentPeriodYear}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.success.main, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              {parseFloat(payment.amount).toLocaleString('tr-TR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              TL
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, textAlign: 'center', verticalAlign: 'middle' }}>
                            <Chip
                              label={paymentTypeLabels[payment.paymentType]}
                              size="small"
                              color={payment.paymentType === 'TEVKIFAT' ? 'primary' : payment.paymentType === 'ELDEN' ? 'secondary' : 'default'}
                              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            {payment.isApproved ? (
                              <Chip 
                                icon={<CheckCircleIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />} 
                                label="Onaylı" 
                                color="success" 
                                size="small" 
                                sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' } }} 
                              />
                            ) : (
                              <Chip 
                                icon={<WarningIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />} 
                                label="Beklemede" 
                                color="warning" 
                                size="small" 
                                sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' } }} 
                              />
                            )}
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, textAlign: 'center', verticalAlign: 'middle' }}>
                            {payment.documentUrl ? (
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<PictureAsPdfIcon />}
                                  onClick={async () => {
                                    try {
                                      setLoadingPdf(true);
                                      const blob = await fetchPaymentDocumentBlob(payment.id);
                                      const blobUrl = window.URL.createObjectURL(blob);
                                      const urlParts = payment.documentUrl!.split('/');
                                      const fileName = urlParts[urlParts.length - 1] || 'Kesinti Belgesi';
                                      setPdfUrl(blobUrl);
                                      setPdfTitle(fileName);
                                      setPdfViewerOpen(true);
                                    } catch (error) {
                                      console.error('Dosya görüntülenirken hata:', error);
                                      toast.showError('Dosya görüntülenemedi');
                                    } finally {
                                      setLoadingPdf(false);
                                    }
                                  }}
                                  sx={{
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                    px: { xs: 1, sm: 1.5 },
                                    py: { xs: 0.5, sm: 0.75 },
                                    minWidth: 'auto',
                                  }}
                                >
                                  Görüntüle
                                </Button>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>
        )}

        {/* Üyelik İstatistikleri */}
        {canViewMemberHistory && (
          <SectionCard title="Üyelik ve Zaman İstatistikleri" icon={<CalendarTodayIcon />}>
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
              <InfoRow 
                label="Kayıt Tarihi" 
                value={member?.createdAt ? formatDate(new Date(member.createdAt)) : '-'} 
                icon={<CalendarTodayIcon />} 
              />
              <InfoRow 
                label="Onay Tarihi" 
                value={member?.approvedAt ? formatDate(new Date(member.approvedAt)) : '-'} 
                icon={<CheckCircleIcon />} 
              />
              <InfoRow 
                label="Onay Süresi" 
                value={calculateApprovalDuration() || '-'} 
                icon={<HourglassEmptyIcon />} 
              />
              <InfoRow 
                label="Üyelik Süresi" 
                value={calculateMembershipDuration() || '-'} 
                icon={<CalendarTodayIcon />} 
              />
              <InfoRow 
                label="Aktif Üyelik Süresi" 
                value={calculateActiveMembershipDuration() || '-'} 
                icon={<CheckCircleIcon />} 
              />
              <InfoRow 
                label="Üyelik Yaşı" 
                value={calculateMembershipDuration() || '-'} 
                icon={<PersonIcon />} 
              />
              <InfoRow 
                label="Durum Değişiklik Sayısı" 
                value={getStatusChangeCount()} 
                icon={<SettingsIcon />} 
              />
              <InfoRow 
                label="Son Durum Değişikliği" 
                value={formatDate(getLastStatusChangeDate())} 
                icon={<SettingsIcon />} 
              />
              <InfoRow 
                label="Son Aktivite Tarihi" 
                value={formatDate(getLastActivityDate())} 
                icon={<CalendarTodayIcon />} 
              />
            </Box>
          )}
          </SectionCard>
        )}

        {/* Onay Bilgileri */}
        {member?.approvedBy && member?.approvedAt && (
          <Alert
            severity="success"
            icon={<CheckCircleIcon />}
            sx={{
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
              bgcolor: alpha(theme.palette.success.main, 0.08),
              '& .MuiAlert-icon': { 
                fontSize: '1.8rem',
                color: theme.palette.success.main,
              },
              boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.1)}`,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75, fontSize: '1rem', color: theme.palette.success.dark }}>
              ✓ Üyelik Onayı
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
              <strong>
                {member.approvedBy.firstName} {member.approvedBy.lastName}
              </strong>{' '}
              tarafından{' '}
              <strong>
                {new Date(member.approvedAt).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>{' '}
              tarihinde onaylanmıştır.
            </Typography>
          </Alert>
        )}

        {/* Üyelik ve Durum Tarihleri */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.background.default, 1)} 100%)`,
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            mt: 3,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Üyelik Tarihi */}
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    mb: 0.5,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Üyelik Tarihi
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    fontSize: '1rem',
                  }}
                >
                  {member?.approvedAt
                    ? new Date(member.approvedAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : member?.createdAt
                      ? new Date(member.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '-'}
                </Typography>
              </Box>

              {/* Durum Değişiklik Tarihleri */}
              {(member?.status === 'RESIGNED' || member?.status === 'EXPELLED' || member?.status === 'REJECTED') && member?.cancelledAt && (
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      mb: 0.5,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {member.status === 'RESIGNED'
                      ? 'İstifa Tarihi'
                      : member.status === 'EXPELLED'
                        ? 'İhraç Tarihi'
                        : member.status === 'REJECTED'
                          ? 'Reddedilme Tarihi'
                          : 'Durum Değişiklik Tarihi'}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 600,
                      color:
                        member.status === 'RESIGNED'
                          ? theme.palette.grey[700]
                          : member.status === 'EXPELLED'
                            ? theme.palette.error.main
                            : member.status === 'REJECTED'
                              ? theme.palette.error.main
                              : theme.palette.text.primary,
                      fontSize: '1rem',
                    }}
                  >
                    {new Date(member.cancelledAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Durum Değiştirme Dialog */}
      {member && (
        <MemberStatusChangeDialog
          open={statusDialogOpen}
          onClose={() => setStatusDialogOpen(false)}
          onConfirm={handleStatusChange}
          currentStatus={member.status}
          memberName={`${member.firstName} ${member.lastName}`}
          loading={updatingStatus}
        />
      )}

      {/* Üye Başvurusu Onaylama Dialog */}
      {member && member.status === 'PENDING' && (
        <MemberApprovalDialog
          open={approveDialogOpen}
          onClose={() => {
            if (!updatingStatus) {
              setApproveDialogOpen(false);
              setInitialApproveFormData(undefined);
            }
          }}
          onConfirm={handleApproveApplication}
          loading={updatingStatus}
          initialFormData={initialApproveFormData}
          successMessage="Bu başvuruyu onaylamak istediğinize emin misiniz? Onaylandıktan sonra üye bekleyen üyeler listesine eklenecektir."
        />
      )}

      {/* Boş Alanlar Bilgilendirme Dialog'u */}
      <Dialog
        open={emptyFieldsInfoDialogOpen}
        onClose={() => setEmptyFieldsInfoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>Bilgilendirme</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Üye başvurusu başarıyla onaylandı. Aşağıdaki alanlar boş olarak kaydedildi. İsterseniz üye düzenleme sayfasından bu bilgileri ekleyebilirsiniz:
          </Alert>
          <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
            {emptyFieldsList.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setEmptyFieldsInfoDialogOpen(false)}>
            Tamam
          </Button>
        </DialogActions>
      </Dialog>

      {/* Başvuru Reddetme Onay Dialog'u */}
      {member && (
        <Dialog
          open={rejectDialogOpen}
          onClose={() => {
            if (!updatingStatus) {
              setRejectDialogOpen(false);
            }
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              boxShadow: `0 20px 60px ${alpha(theme.palette.common.black, 0.2)}`,
            },
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pb: 2.5,
              pt: 3,
              px: 3,
              borderBottom: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.02)} 0%, ${alpha(theme.palette.error.light, 0.01)} 100%)`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.error.main, 0.35)}`,
                }}
              >
                <CancelIcon sx={{ fontSize: '2rem', color: '#fff' }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
                  Başvuruyu Reddet
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Bu işlem geri alınamaz
                </Typography>
              </Box>
            </Box>
            {!updatingStatus && (
              <IconButton
                onClick={() => setRejectDialogOpen(false)}
                size="medium"
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                    color: theme.palette.error.main,
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            )}
          </DialogTitle>

          <DialogContent sx={{ pt: 3.5, pb: 3, px: 3 }}>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              sx={{ 
                mb: 2, 
                lineHeight: 1.7,
                fontSize: '0.95rem',
              }}
            >
              <strong>{member.firstName} {member.lastName}</strong> isimli üyenin başvurusunu reddetmek istediğinize emin misiniz?
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme.palette.error.main,
                fontWeight: 600,
                p: 2,
                borderRadius: 2,
                background: alpha(theme.palette.error.main, 0.1),
              }}
            >
              ⚠️ Bu işlem geri alınamaz ve üye bilgileri kalıcı olarak reddedilmiş duruma geçecektir.
            </Typography>
          </DialogContent>

          <DialogActions
            sx={{
              px: 3,
              pb: 3,
              pt: 2,
              gap: 1.5,
              borderTop: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.8)} 0%, ${alpha(theme.palette.grey[50], 0.5)} 100%)`,
              justifyContent: 'flex-end',
            }}
          >
            <Button
              onClick={() => setRejectDialogOpen(false)}
              disabled={!!updatingStatus}
              variant="outlined"
              size="large"
              sx={{
                borderRadius: 2.5,
                px: 4,
                py: 1.25,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '0.95rem',
                borderWidth: '2px',
                '&:hover': {
                  borderWidth: '2px',
                  backgroundColor: alpha(theme.palette.grey[500], 0.08),
                },
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleRejectApplication}
              disabled={!!updatingStatus}
              variant="contained"
              size="large"
              color="error"
              startIcon={updatingStatus ? <CircularProgress size={20} color="inherit" /> : <CancelIcon />}
              sx={{
                borderRadius: 2.5,
                px: 4,
                py: 1.25,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '0.95rem',
                background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                boxShadow: `0 8px 24px ${alpha(theme.palette.error.main, 0.35)}`,
                '&:hover': {
                  boxShadow: `0 12px 32px ${alpha(theme.palette.error.main, 0.45)}`,
                  background: `linear-gradient(135deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 100%)`,
                },
              }}
            >
              {updatingStatus ? 'Reddediliyor...' : 'Evet, Reddet'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* PDF Görüntüleme Dialog */}
      <Dialog
        open={pdfViewerOpen}
        onClose={() => {
          setPdfViewerOpen(false);
          if (pdfUrl) {
            window.URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
          }
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            height: '90vh',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            pb: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {pdfTitle}
          </Typography>
          <IconButton
            onClick={() => {
              setPdfViewerOpen(false);
              if (pdfUrl) {
                window.URL.revokeObjectURL(pdfUrl);
                setPdfUrl(null);
              }
            }}
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 0,
            height: 'calc(90vh - 80px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {loadingPdf ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
              <CircularProgress size={48} />
              <Typography variant="body2" color="text.secondary">
                PDF yükleniyor...
              </Typography>
            </Box>
          ) : pdfUrl ? (
            <DraftPdfCanvasPreview blobUrl={pdfUrl} variant="document" />
          ) : null}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default MemberDetailPage;

