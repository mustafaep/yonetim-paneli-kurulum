import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonIcon from '@mui/icons-material/Person';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { DocumentTemplate, GenerateDocumentDto, GenerateMemberListDocumentDto } from '../services/documentsApi';
import {
  commitDocumentPreview,
  discardDocumentPreview,
  fetchMemberDocumentBlob,
  getDocumentTemplates,
  getRecentPanelPdfs,
  previewDocument,
  previewMemberListDocument,
  uploadMemberDocument,
  viewDocumentPreview,
} from '../services/documentsApi';
import type { RecentPanelPdf } from '../services/documentsApi';
import { useAuth } from '../../../app/providers/AuthContext';
import { getMembers } from '../../members/services/membersApi';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import { sanitizePdfFileBaseName } from '../../../shared/utils/sanitizePdfFileBaseName';
import type { MemberListItem } from '../../../types/member';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import { DOCUMENT_TYPES } from '../../../shared/utils/documentTypes';
import { DraftPdfCanvasPreview } from '../components/DraftPdfCanvasPreview';

type PdfPreviewFlow = 'single' | 'list' | 'upload' | null;

/** Liste hücrelerinde uzun dosya adları: N karakter + "..." */
const truncateWithEllipsis = (text: string, maxChars = 36): string => {
  if (!text || text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 3)}...`;
};

const PdfGeneratePage: React.FC = () => {
  const theme = useTheme();
  const toast = useToast();
  /** useToast her render'da yeni nesne döndürür; ref ile useCallback/useEffect döngüsü önlenir */
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const { hasRole, hasPermission } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const canUploadMemberDocument = hasPermission('DOCUMENT_UPLOAD');

  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberListItem | null>(null);

  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [extraVariables, setExtraVariables] = useState<Record<string, string>>({});
  const [pdfFileName, setPdfFileName] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [generating, setGenerating] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFlow, setPreviewFlow] = useState<PdfPreviewFlow>(null);

  const [listGenerateDialogOpen, setListGenerateDialogOpen] = useState(false);
  const [listSelectedMembers, setListSelectedMembers] = useState<MemberListItem[]>([]);
  const [listSelectedTemplate, setListSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [listExtraVariables, setListExtraVariables] = useState<Record<string, string>>({});
  const [listPdfFileName, setListPdfFileName] = useState('');
  const [listGenerating, setListGenerating] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('UPLOADED');
  const [description, setDescription] = useState<string>('');
  const [customFileName, setCustomFileName] = useState<string>('');

  const [recentPdfs, setRecentPdfs] = useState<RecentPanelPdf[]>([]);
  const [loadingRecentPdfs, setLoadingRecentPdfs] = useState(false);
  const [recentViewOpen, setRecentViewOpen] = useState(false);
  const [recentViewUrl, setRecentViewUrl] = useState<string | null>(null);
  const [recentViewTitle, setRecentViewTitle] = useState('');
  const [recentViewLoading, setRecentViewLoading] = useState(false);

  const loadRecentPdfs = useCallback(async () => {
    setLoadingRecentPdfs(true);
    try {
      const rows = await getRecentPanelPdfs();
      setRecentPdfs(rows);
    } catch (e: unknown) {
      toastRef.current.showError(getApiErrorMessage(e, 'Son PDF listesi yuklenemedi'));
    } finally {
      setLoadingRecentPdfs(false);
    }
  }, []);

  useEffect(() => {
    void loadRecentPdfs();
  }, [loadRecentPdfs]);

  const memberListTemplates = useMemo(
    () => templates.filter((t) => t.type === 'BULK_MEMBER_LIST'),
    [templates],
  );

  const perMemberPdfTemplates = useMemo(
    () => templates.filter((t) => t.type !== 'BULK_MEMBER_LIST'),
    [templates],
  );

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const data = await getMembers();
      setMembers(data);
    } catch (e: unknown) {
      toast.showError(getApiErrorMessage(e, 'Uyeler yuklenirken bir hata olustu'));
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const data = await getDocumentTemplates();
      setTemplates(data.filter((t) => t.isActive));
    } catch (e: unknown) {
      toast.showError(getApiErrorMessage(e, 'Sablonlar yuklenirken bir hata olustu'));
    } finally {
      setLoadingTemplates(false);
    }
  };

  const toDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const getExtraVariablesFromTemplate = (template: DocumentTemplate): string[] => {
    const standardVars = new Set([
      'firstName', 'lastName', 'fullName', 'memberNumber', 'nationalId', 'phone', 'email',
      'province', 'district', 'institution', 'branch', 'date', 'joinDate', 'applicationDate',
      'validUntil', 'birthPlace', 'gender', 'educationStatus', 'position', 'workUnitAddress',
      'birthDate', 'motherName', 'fatherName', 'dutyUnit', 'institutionAddress',
      'boardDecisionDate', 'boardDecisionBookNo', 'membershipInfoOption', 'memberGroup',
    ]);
    const varRegex = /\{\{\s*(\w+)\s*\}\}/g;
    const foundVars = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = varRegex.exec(template.template)) !== null) {
      const varName = match[1];
      if (!standardVars.has(varName)) foundVars.add(varName);
    }
    if (template.type === 'MEMBER_CARD') {
      foundVars.add('photoDataUrl');
    }
    return Array.from(foundVars);
  };

  const getVariableLabel = (varName: string): string => {
    const labels: Record<string, string> = {
      oldProvince: 'Eski Il',
      oldDistrict: 'Eski Ilce',
      oldInstitution: 'Eski Kurum',
      oldBranch: 'Eski Sube',
      transferReason: 'Nakil Nedeni',
      photoDataUrl: 'Fotograf',
      eventName: 'Etkinlik Adi',
      eventDate: 'Etkinlik Tarihi',
      eventPlace: 'Etkinlik Yeri',
      eventDescription: 'Etkinlik Aciklamasi',
      invitationDate: 'Davet Tarihi',
      meetingDate: 'Toplanti Tarihi',
      meetingPlace: 'Toplanti Yeri',
      subject: 'Konu',
      reason: 'Sebep',
      description: 'Aciklama',
      sayi: 'Sayi',
      tevkifatMerkezi: 'Tevkifat merkezi (alici)',
    };
    return labels[varName] || varName.replace(/([A-Z])/g, ' $1').trim();
  };

  const handleOpenGenerateDialog = async () => {
    if (members.length === 0) await loadMembers();
    await loadTemplates();
    setGenerateDialogOpen(true);
    setSelectedTemplate(null);
    setExtraVariables({});
    setPdfFileName('');
    setPhotoPreview('');
  };

  const handleOpenListGenerateDialog = async () => {
    if (members.length === 0) await loadMembers();
    await loadTemplates();
    setListGenerateDialogOpen(true);
    setListSelectedMembers([]);
    setListSelectedTemplate(null);
    setListExtraVariables({});
    setListPdfFileName('');
  };

  const handleOpenUploadDialog = async () => {
    if (!canUploadMemberDocument) {
      toast.showError('Evrak yukleme yetkiniz bulunmuyor');
      return;
    }
    if (members.length === 0) await loadMembers();
    setUploadDialogOpen(true);
    setSelectedFile(null);
    setDocumentType('UPLOADED');
    setDescription('');
    setCustomFileName('');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.showError('Sadece PDF dosyalari yuklenebilir');
      return;
    }
    setSelectedFile(file);
  };

  const handleStartUploadPreview = () => {
    if (!canUploadMemberDocument) {
      toast.showError('Evrak yukleme yetkiniz bulunmuyor');
      return;
    }
    if (!selectedMember || !selectedFile) {
      toast.showError('Lutfen bir uye ve PDF dosyasi secin');
      return;
    }
    if (!documentType) {
      toast.showError('Lutfen dokuman tipi secin');
      return;
    }
    const url = window.URL.createObjectURL(selectedFile);
    setPreviewPdfUrl(url);
    setPreviewFileName(selectedFile.name);
    setPreviewId(null);
    setPreviewFlow('upload');
    setPreviewLoading(false);
    setPreviewDialogOpen(true);
    setUploadDialogOpen(false);
  };

  const handleGenerate = async () => {
    if (!selectedMember || !selectedTemplate) return;
    const emptyVars = Object.entries(extraVariables).filter(([key, value]) =>
      key === 'photoDataUrl' ? !value : !value || value.trim() === '',
    );
    if (emptyVars.length > 0) {
      toast.showError(`Lutfen tum alanlari doldurun: ${emptyVars.map(([k]) => getVariableLabel(k)).join(', ')}`);
      return;
    }
    setGenerating(true);
    try {
      const payload: GenerateDocumentDto = {
        memberId: selectedMember.id,
        templateId: selectedTemplate.id,
        variables: Object.keys(extraVariables).length > 0 ? extraVariables : undefined,
        fileName: pdfFileName ? sanitizePdfFileBaseName(pdfFileName) : undefined,
      };
      const preview = await previewDocument(payload);
      setPreviewId(preview.previewId);
      setPreviewFileName(preview.fileName);
      setPreviewFlow('single');
      setPreviewLoading(true);
      const blob = await viewDocumentPreview(preview.previewId);
      const url = window.URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setPreviewDialogOpen(true);
      setGenerateDialogOpen(false);
      toast.showSuccess('PDF onizleme hazirlandi. Kaydetmek icin onaylayin.');
    } catch (e: unknown) {
      toast.showError(getApiErrorMessage(e, 'PDF olusturulurken bir hata olustu'));
    } finally {
      setPreviewLoading(false);
      setGenerating(false);
    }
  };

  const handleCommitPreview = async () => {
    if (previewFlow === 'upload') {
      if (!canUploadMemberDocument) {
        toast.showError('Evrak yukleme yetkiniz bulunmuyor');
        return;
      }
      if (!selectedMember || !selectedFile) {
        toast.showError('Lutfen bir uye ve PDF dosyasi secin');
        return;
      }
      setUploading(true);
      try {
        const fileName = customFileName.trim() || selectedFile.name.replace(/\.pdf$/i, '');
        await uploadMemberDocument(selectedMember.id, selectedFile, documentType, description, fileName);
        toast.showSuccess('Dokuman basariyla yuklendi');
        void loadRecentPdfs();
        setPreviewDialogOpen(false);
        if (previewPdfUrl) {
          window.URL.revokeObjectURL(previewPdfUrl);
        }
        setPreviewPdfUrl(null);
        setPreviewFileName('');
        setPreviewFlow(null);
        setSelectedFile(null);
      } catch (e: unknown) {
        toast.showError(getApiErrorMessage(e, 'Dokuman yuklenirken bir hata olustu'));
      } finally {
        setUploading(false);
      }
      return;
    }

    if (!previewId) return;
    try {
      await commitDocumentPreview(previewId);
      if (previewFlow === 'list') {
        toast.showSuccess('Liste PDF kalici olarak kaydedildi');
      } else {
        toast.showSuccess('PDF kalici olarak kaydedildi');
      }
      void loadRecentPdfs();
      setPreviewDialogOpen(false);
      if (previewPdfUrl) {
        window.URL.revokeObjectURL(previewPdfUrl);
      }
      setPreviewPdfUrl(null);
      setPreviewId(null);
      setPreviewFileName('');
      setPreviewFlow(null);
    } catch (e: unknown) {
      toast.showError(getApiErrorMessage(e, 'Preview kaydedilirken bir hata olustu'));
    }
  };

  const handleCloseRecentPdfView = () => {
    if (recentViewUrl) {
      window.URL.revokeObjectURL(recentViewUrl);
    }
    setRecentViewUrl(null);
    setRecentViewOpen(false);
    setRecentViewTitle('');
  };

  const handleOpenRecentPdf = async (row: RecentPanelPdf) => {
    if (recentViewUrl) {
      window.URL.revokeObjectURL(recentViewUrl);
      setRecentViewUrl(null);
    }
    setRecentViewLoading(true);
    setRecentViewTitle(row.fileName);
    setRecentViewOpen(true);
    try {
      const blob = await fetchMemberDocumentBlob(row.id);
      const url = window.URL.createObjectURL(blob);
      setRecentViewUrl(url);
    } catch (e: unknown) {
      toast.showError(getApiErrorMessage(e, 'PDF goruntulenemedi'));
      setRecentViewOpen(false);
      setRecentViewTitle('');
    } finally {
      setRecentViewLoading(false);
    }
  };

  const handleDiscardPreview = async () => {
    if (previewId) {
      try {
        await discardDocumentPreview(previewId);
      } catch {
        // no-op
      }
    }
    if (previewPdfUrl) {
      window.URL.revokeObjectURL(previewPdfUrl);
    }
    setPreviewDialogOpen(false);
    setPreviewPdfUrl(null);
    setPreviewId(null);
    setPreviewFileName('');
    setPreviewFlow(null);
  };

  const handleListGenerate = async () => {
    if (!listSelectedTemplate || listSelectedMembers.length === 0) {
      toast.showError('Lutfen en az bir uye ve bir sablon secin');
      return;
    }
    const emptyVars = Object.entries(listExtraVariables).filter(([, value]) => !value || value.trim() === '');
    if (emptyVars.length > 0) {
      toast.showError(`Lutfen tum alanlari doldurun: ${emptyVars.map(([k]) => getVariableLabel(k)).join(', ')}`);
      return;
    }
    setListGenerating(true);
    try {
      const payload: GenerateMemberListDocumentDto = {
        memberIds: listSelectedMembers.map((m) => m.id),
        templateId: listSelectedTemplate.id,
        variables: Object.keys(listExtraVariables).length > 0 ? listExtraVariables : undefined,
        fileName: listPdfFileName ? sanitizePdfFileBaseName(listPdfFileName) : undefined,
      };
      const preview = await previewMemberListDocument(payload);
      setPreviewId(preview.previewId);
      setPreviewFileName(preview.fileName);
      setPreviewFlow('list');
      setPreviewLoading(true);
      const blob = await viewDocumentPreview(preview.previewId);
      const url = window.URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setPreviewDialogOpen(true);
      setListGenerateDialogOpen(false);
      toast.showSuccess('Liste PDF onizlemesi hazir. Kaydetmek icin onaylayin.');
    } catch (e: unknown) {
      toast.showError(getApiErrorMessage(e, 'Liste PDF onizlemesi olusturulamadi'));
    } finally {
      setPreviewLoading(false);
      setListGenerating(false);
    }
  };

  return (
    <PageLayout>
      <PageHeader
        icon={<PictureAsPdfIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="PDF Olustur"
        description="Tekil ve toplu liste PDF olusturma ile dokuman yukleme islemlerini buradan yonetin"
        color={theme.palette.error.main}
        darkColor={theme.palette.error.dark}
        lightColor={theme.palette.error.light}
      />

      <Paper sx={{ p: 3, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          PDF Islemleri
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Burada sadece PDF olusturma islemleri yapilir. Asagida son kayitlarinizi gorebilirsiniz; ayrintili gecmis icin PDF
          Olusturma Gecmisi sayfasini kullanabilirsiniz.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<PictureAsPdfIcon />} onClick={handleOpenGenerateDialog}>
            PDF Olustur
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<UploadFileIcon />}
            onClick={handleOpenUploadDialog}
            disabled={!canUploadMemberDocument}
          >
            Dokuman Yukle
          </Button>
          <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={handleOpenListGenerateDialog}>
            Toplu Liste Olustur
          </Button>
        </Box>
      </Paper>

      <Paper
        sx={{
          mt: 3,
          p: 3,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Son yuklenen ve olusturulan PDF&apos;ler
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {isAdmin
                ? 'Son 10 PDF kaydi (tum panel kullanicilari, olusturulma zamani azalan).'
                : 'Son 10 PDF kaydi (yalnizca sizin olusturdugunuz veya yuklediginiz belgeler).'}
            </Typography>
          </Box>
          <Tooltip title="Listeyi yenile">
            <span>
              <IconButton onClick={() => void loadRecentPdfs()} disabled={loadingRecentPdfs} color="primary" size="small">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {loadingRecentPdfs && recentPdfs.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : recentPdfs.length === 0 ? (
          <Alert severity="info">Henuz listeleyecek PDF kaydi yok.</Alert>
        ) : (
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Dosya</TableCell>
                  <TableCell>Uye</TableCell>
                  <TableCell>Kaynak</TableCell>
                  {isAdmin && <TableCell>Olusturan</TableCell>}
                  <TableCell align="right" width={72}>
                    Onizle
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentPdfs.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(row.generatedAt).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Tooltip title={row.fileName} placement="top-start" enterDelay={400}>
                        <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                          {truncateWithEllipsis(row.fileName)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {[row.member.firstName, row.member.lastName].filter(Boolean).join(' ')}
                      {row.member.registrationNumber ? (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {row.member.registrationNumber}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {row.fromTemplate ? (
                        <Typography variant="body2">{row.templateName || 'Sablon'}</Typography>
                      ) : (
                        <Typography variant="body2">Dosya yukleme</Typography>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {row.generatedByUser
                          ? `${row.generatedByUser.firstName} ${row.generatedByUser.lastName}`.trim()
                          : '—'}
                      </TableCell>
                    )}
                    <TableCell align="right">
                      <Tooltip title="PDF onizle">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => void handleOpenRecentPdf(row)}
                          disabled={recentViewLoading}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={generateDialogOpen} onClose={() => !generating && setGenerateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>PDF Dokuman Olustur</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <Autocomplete
              options={members}
              loading={loadingMembers}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName}${option.registrationNumber ? ` (${option.registrationNumber})` : ''}`}
              value={selectedMember}
              onChange={(_, newValue) => setSelectedMember(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Uye Secimi"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <PersonIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />,
                  }}
                />
              )}
            />
            {loadingTemplates ? <CircularProgress /> : (
              <FormControl fullWidth>
                <InputLabel>Sablon Sec</InputLabel>
                <Select
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => {
                    const template = perMemberPdfTemplates.find((t) => t.id === e.target.value);
                    setSelectedTemplate(template || null);
                    if (template) {
                      const vars: Record<string, string> = {};
                      getExtraVariablesFromTemplate(template).forEach((v) => { vars[v] = ''; });
                      setExtraVariables(vars);
                      setPdfFileName(sanitizePdfFileBaseName(`${template.name}_${selectedMember?.firstName || ''}_${selectedMember?.lastName || ''}`.trim()));
                      setPhotoPreview('');
                    } else {
                      setExtraVariables({});
                      setPdfFileName('');
                      setPhotoPreview('');
                    }
                  }}
                  label="Sablon Sec"
                >
                  {perMemberPdfTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>{template.name}</MenuItem>
                  ))}
                </Select>
                {perMemberPdfTemplates.length === 0 && <FormHelperText>Bu islem icin uygun aktif sablon yok.</FormHelperText>}
              </FormControl>
            )}
            <TextField
              label="PDF Dosya Adi"
              value={pdfFileName}
              onChange={(e) => setPdfFileName(sanitizePdfFileBaseName(e.target.value))}
              fullWidth
              size="small"
            />
            {Object.keys(extraVariables).map((varName) => {
              if (varName === 'photoDataUrl') {
                return (
                  <Box key={varName}>
                    <Button component="label" variant="outlined" disabled={generating}>
                      Fotograf Sec
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const dataUrl = await toDataUrl(file);
                          setExtraVariables((prev) => ({ ...prev, photoDataUrl: dataUrl }));
                          setPhotoPreview(dataUrl);
                        }}
                      />
                    </Button>
                    {!photoPreview && <FormHelperText>Bu alan zorunludur</FormHelperText>}
                  </Box>
                );
              }
              const value = extraVariables[varName] || '';
              const isMulti = varName.toLowerCase().includes('reason') || varName.toLowerCase().includes('description');
              return (
                <TextField
                  key={varName}
                  label={getVariableLabel(varName)}
                  value={value}
                  onChange={(e) => setExtraVariables((prev) => ({ ...prev, [varName]: e.target.value }))}
                  fullWidth
                  size="small"
                  required
                  error={!value.trim()}
                  helperText={!value.trim() ? 'Bu alan zorunludur' : ''}
                  multiline={isMulti}
                  rows={isMulti ? 3 : 1}
                />
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)} disabled={generating}>Iptal</Button>
          <Button onClick={handleGenerate} variant="contained" disabled={!selectedMember || !selectedTemplate || generating}>
            {generating ? 'Olusturuluyor...' : 'PDF Olustur'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={previewDialogOpen} onClose={() => !uploading && handleDiscardPreview()} maxWidth="lg" fullWidth>
        <DialogTitle>{previewFileName || 'PDF Onizleme'}</DialogTitle>
        <DialogContent
          sx={{
            height: '75vh',
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {previewFlow === 'list' && (
            <Alert severity="info" sx={{ borderRadius: 0 }}>
              Bu PDF tum secilen uyeleri <strong>tek bir liste belgesinde</strong> birlestirir.
            </Alert>
          )}
          {previewFlow === 'upload' && (
            <Alert severity="info" sx={{ borderRadius: 0 }}>
              Yuklemek uzere sectiginiz dosyanin onizlemesi. Onaylarsaniz dokuman sunucuya yuklenir (inceleme akisi
              uygulanabilir).
            </Alert>
          )}
          {previewLoading ? (
            <Box sx={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <CircularProgress />
            </Box>
          ) : previewPdfUrl ? (
            <DraftPdfCanvasPreview
              blobUrl={previewPdfUrl}
              variant="draft"
              draftWatermarkText={previewFlow === 'upload' ? 'ÖNİZLEME' : undefined}
            />
          ) : (
            <Box sx={{ p: 3 }}>
              <Alert severity="error">Onizleme yuklenemedi.</Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDiscardPreview} disabled={uploading}>Vazgec</Button>
          <Button
            variant="contained"
            onClick={handleCommitPreview}
            disabled={
              previewLoading ||
              uploading ||
              (previewFlow !== 'upload' && !previewId)
            }
          >
            {uploading ? 'Yukleniyor...' : previewFlow === 'upload' ? 'Onayla ve Yukle' : 'Onayla ve Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={listGenerateDialogOpen} onClose={() => !listGenerating && setListGenerateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Toplu Uye Listesi PDF Olustur</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <Autocomplete
              multiple
              options={members}
              loading={loadingMembers}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName}${option.registrationNumber ? ` (${option.registrationNumber})` : ''}`}
              value={listSelectedMembers}
              onChange={(_, newValue) => setListSelectedMembers(newValue)}
              renderInput={(params) => <TextField {...params} label="Uyeleri Secin" />}
            />
            {loadingTemplates ? <CircularProgress /> : (
              <FormControl fullWidth>
                <InputLabel>Sablon Sec</InputLabel>
                <Select
                  value={listSelectedTemplate?.id || ''}
                  onChange={(e) => {
                    const template = memberListTemplates.find((t) => t.id === e.target.value);
                    setListSelectedTemplate(template || null);
                    if (template) {
                      const vars: Record<string, string> = {};
                      getExtraVariablesFromTemplate(template).filter((v) => v !== 'memberTable').forEach((v) => { vars[v] = ''; });
                      setListExtraVariables(vars);
                      setListPdfFileName(sanitizePdfFileBaseName(template.name));
                    } else {
                      setListExtraVariables({});
                      setListPdfFileName('');
                    }
                  }}
                  label="Sablon Sec"
                >
                  {memberListTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>{template.name}</MenuItem>
                  ))}
                </Select>
                {memberListTemplates.length === 0 && (
                  <FormHelperText>Toplu liste icin BULK_MEMBER_LIST turunde aktif sablon gereklidir.</FormHelperText>
                )}
              </FormControl>
            )}
            <TextField
              label="PDF Dosya Adi"
              value={listPdfFileName}
              onChange={(e) => setListPdfFileName(sanitizePdfFileBaseName(e.target.value))}
              fullWidth
              size="small"
            />
            {Object.keys(listExtraVariables).map((varName) => {
              const value = listExtraVariables[varName] || '';
              return (
                <TextField
                  key={varName}
                  label={getVariableLabel(varName)}
                  value={value}
                  onChange={(e) => setListExtraVariables((prev) => ({ ...prev, [varName]: e.target.value }))}
                  fullWidth
                  size="small"
                  required
                  error={!value.trim()}
                  helperText={!value.trim() ? 'Bu alan zorunludur' : ''}
                />
              );
            })}
            {listSelectedTemplate && (
              <Alert severity="info">Bu islem secilen tum uyeleri tek bir PDF dosyasinda olusturur.</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setListGenerateDialogOpen(false)} disabled={listGenerating}>Iptal</Button>
          <Button onClick={handleListGenerate} variant="contained" disabled={!listSelectedTemplate || listSelectedMembers.length === 0 || listGenerating}>
            {listGenerating ? 'Onizleme hazirlaniyor...' : `Onizle (${listSelectedMembers.length} uye)`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={uploadDialogOpen} onClose={() => !uploading && setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dokuman Yukle</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
            <Autocomplete
              options={members}
              loading={loadingMembers}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName}${option.registrationNumber ? ` (${option.registrationNumber})` : ''}`}
              value={selectedMember}
              onChange={(_, newValue) => setSelectedMember(newValue)}
              renderInput={(params) => <TextField {...params} label="Uye Secimi" />}
            />
            <TextField
              fullWidth
              type="file"
              inputProps={{ accept: 'application/pdf' }}
              onChange={handleFileSelect}
              label="PDF Dosyasi Sec"
              InputLabelProps={{ shrink: true }}
              helperText="Sadece PDF dosyalari yuklenebilir"
            />
            <TextField
              fullWidth
              label="Dosya Adi"
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              placeholder="Dosya adini girin (uzanti otomatik eklenir)"
            />
            <FormControl fullWidth>
              <InputLabel id="document-type-label">Dokuman Tipi</InputLabel>
              <Select
                labelId="document-type-label"
                value={documentType}
                label="Dokuman Tipi"
                onChange={(e) => setDocumentType(e.target.value)}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Aciklama (Opsiyonel)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>Iptal</Button>
          <Button
            onClick={handleStartUploadPreview}
            variant="contained"
            disabled={uploading || !selectedMember || !selectedFile || !documentType}
            startIcon={<UploadFileIcon />}
          >
            Onizle ve Devam
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={recentViewOpen} onClose={handleCloseRecentPdfView} maxWidth="lg" fullWidth>
        <DialogTitle>{recentViewTitle || 'PDF'}</DialogTitle>
        <DialogContent
          sx={{
            height: '75vh',
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {recentViewLoading || !recentViewUrl ? (
            <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
              <CircularProgress />
            </Box>
          ) : (
            <DraftPdfCanvasPreview blobUrl={recentViewUrl} variant="document" />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRecentPdfView}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default PdfGeneratePage;
