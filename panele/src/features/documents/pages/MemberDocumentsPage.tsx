import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  CircularProgress,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Chip,
  Paper,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import Autocomplete from '@mui/material/Autocomplete';
import { getMemberDocuments, deleteMemberDocument, fetchMemberDocumentBlob, downloadDocument } from '../services/documentsApi';
import type { MemberDocument } from '../services/documentsApi';
import { getMembers } from '../../members/services/membersApi';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import type { MemberListItem } from '../../../types/member';
import { getDocumentTypeLabel } from '../../../shared/utils/documentTypes';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import { DraftPdfCanvasPreview } from '../components/DraftPdfCanvasPreview';

const MemberDocumentsPage: React.FC = () => {
  const { memberId: paramMemberId } = useParams<{ memberId?: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [selectedMember, setSelectedMember] = useState<MemberListItem | null>(null);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [rows, setRows] = useState<MemberDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>('');
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);

  const canManageDocuments = hasPermission('DOCUMENT_GENERATE_PDF');
  const canDownloadDocuments = hasPermission('DOCUMENT_DOWNLOAD');

  const loadMembers = async () => {
    try {
      const data = await getMembers();
      setMembers(data);
      if (paramMemberId) {
        const member = data.find((m) => m.id === paramMemberId);
        setSelectedMember(member || null);
      }
    } catch (e: unknown) {
      console.error('Uyeler yuklenirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Uyeler yuklenirken bir hata olustu'));
    }
  };

  useEffect(() => {
    loadMembers();
  }, [paramMemberId]);

  useEffect(() => {
    if (selectedMember) {
      loadDocuments();
    } else {
      setRows([]);
    }
  }, [selectedMember]);

  const loadDocuments = async () => {
    if (!selectedMember) return;
    setLoading(true);
    try {
      const data = await getMemberDocuments(selectedMember.id);
      setRows(data);
    } catch (e: unknown) {
      console.error('Dokumanlar yuklenirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Dokumanlar yuklenirken bir hata olustu'));
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'documentType',
      headerName: 'Doküman Türü',
      flex: 1,
      minWidth: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const label = getDocumentTypeLabel(params.value || 'UPLOADED');
        const colors: Record<string, string> = {
          'MEMBER_REGISTRATION': theme.palette.primary.main,
          'PAYMENT_RECEIPT': theme.palette.success.main,
          'ADVANCE_DOCUMENT': theme.palette.warning.main,
          'DOCUMENT': theme.palette.info.main,
          'UPLOADED': theme.palette.secondary.main,
        };
        const color = colors[params.value] || theme.palette.grey[500];
        
        return (
          <Chip
            label={label}
            size="small"
            sx={{
              bgcolor: alpha(color, 0.1),
              color: color,
              fontWeight: 600,
              fontSize: '0.75rem',
              height: 24,
              borderRadius: 1.5,
              border: `1px solid ${alpha(color, 0.2)}`,
            }}
          />
        );
      },
    },
    {
      field: 'fileName',
      headerName: 'Dosya Adı',
      flex: 2,
      minWidth: 250,
      align: 'left',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <PictureAsPdfIcon sx={{ color: theme.palette.error.main, fontSize: '1.2rem', flexShrink: 0 }} />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {params.value || 'Belge'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'generatedAt',
      headerName: 'Oluşturulma Tarihi',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        if (!params.value) return '-';
        const date = new Date(params.value);
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.4 }}>
              {date.toLocaleDateString('tr-TR')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
              {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'generatedByUser',
      headerName: 'Oluşturan',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const user = params.row.generatedByUser;
        if (!user) return <Typography variant="body2" color="text.secondary">-</Typography>;
        return (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {user.firstName} {user.lastName}
          </Typography>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: 220,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const doc = params.row as MemberDocument;
        const isDeleting = deletingDocumentId === doc.id;
        const isDownloading = downloadingDocumentId === doc.id;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Tooltip title="PDF Görüntüle">
              <span>
                <IconButton
                  size="small"
                  disabled={isDeleting || isDownloading}
                  onClick={async () => {
                    try {
                      setLoadingPdf(true);
                      const blob = await fetchMemberDocumentBlob(doc.id);
                      const blobUrl = window.URL.createObjectURL(blob);
                      setPdfUrl(blobUrl);
                      setPdfTitle(doc.fileName || 'Belge');
                      setPdfViewerOpen(true);
                    } catch (error) {
                      console.error('Dosya görüntülenirken hata:', error);
                      toast.showError('Dosya görüntülenemedi');
                    } finally {
                      setLoadingPdf(false);
                    }
                  }}
                  sx={{
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.info.main, 0.2),
                    },
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canDownloadDocuments ? 'PDF İndir' : 'Evrak indirme yetkiniz yok'}>
              <span>
                <IconButton
                  size="small"
                  disabled={isDeleting || isDownloading || !canDownloadDocuments}
                  onClick={async () => {
                    if (!canDownloadDocuments) return;
                    const baseName = doc.fileName?.replace(/\.pdf$/i, '') || 'belge';
                    const safeName = baseName.endsWith('.pdf') ? baseName : `${baseName}.pdf`;
                    setDownloadingDocumentId(doc.id);
                    try {
                      await downloadDocument(doc.id, safeName);
                      toast.showSuccess('Dosya indirildi');
                    } catch (error) {
                      console.error('Dosya indirilirken hata:', error);
                      toast.showError(getApiErrorMessage(error, 'Dosya indirilemedi'));
                    } finally {
                      setDownloadingDocumentId(null);
                    }
                  }}
                  sx={{
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.success.main, 0.2),
                    },
                  }}
                >
                  {isDownloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            {canManageDocuments && (
              <Tooltip title="Evrak Sil">
                <span>
                  <IconButton
                    size="small"
                    disabled={isDeleting || isDownloading}
                    onClick={async () => {
                      const confirmed = window.confirm(
                        `"${doc.fileName || 'Bu evrak'}" silinecek. Devam etmek istiyor musunuz?`,
                      );
                      if (!confirmed) return;

                      setDeletingDocumentId(doc.id);
                      try {
                        await deleteMemberDocument(doc.id);
                        toast.showSuccess('Evrak başarıyla silindi');
                        await loadDocuments();
                      } catch (error) {
                        console.error('Evrak silinirken hata:', error);
                        toast.showError('Evrak silinirken bir hata oluştu');
                      } finally {
                        setDeletingDocumentId(null);
                      }
                    }}
                    sx={{
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      color: theme.palette.error.main,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.error.main, 0.2),
                      },
                    }}
                  >
                    {isDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        icon={<DescriptionIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title={selectedMember 
          ? `${selectedMember.firstName} ${selectedMember.lastName} - Dokümanlar`
          : 'Üye Doküman Geçmişi'}
        description={selectedMember 
          ? `${selectedMember.firstName} ${selectedMember.lastName} adlı üyenin doküman geçmişi`
          : 'Üyelerin doküman geçmişini görüntüleyin - Üye seçin'}
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
      />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 3 }}>
          <Autocomplete
            options={members}
            getOptionLabel={(option) =>
              `${option.firstName} ${option.lastName}${option.registrationNumber ? ` (${option.registrationNumber})` : ''}`
            }
            value={selectedMember}
            onChange={(_, newValue) => {
              setSelectedMember(newValue);
              // URL'yi güncelle
              if (newValue) {
                navigate(`/documents/members/${newValue.id}`, { replace: true });
              } else {
                navigate('/documents/members', { replace: true });
              }
            }}
            sx={{ flexGrow: 1, minWidth: 300, maxWidth: 500 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Üye Seçimi"
                placeholder={paramMemberId ? "Üye seçildi" : "Üye seçin"}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <PersonIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />,
                }}
              />
            )}
          />
          {paramMemberId && (
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => {
                setSelectedMember(null);
                navigate('/documents/members', { replace: true });
              }}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              Üye Seçimini Temizle
            </Button>
          )}
        </Box>

      {selectedMember ? (
        <>
          {/* İstatistik Kartları */}
          {rows.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  minWidth: 200,
                  p: 2.5,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                  Toplam Doküman
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                  {rows.length}
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  minWidth: 200,
                  p: 2.5,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.success.main, 0.02)} 100%)`,
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                  Oluşturulan PDF
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                  {rows.filter(r => r.documentType !== 'UPLOADED').length}
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  minWidth: 200,
                  p: 2.5,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.08)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                  Yüklenen Doküman
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                  {rows.filter(r => r.documentType === 'UPLOADED').length}
                </Typography>
              </Paper>
            </Box>
          )}

          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              autoHeight
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 25 },
                },
              }}
              localeText={{
                noRowsLabel: 'Doküman bulunamadı',
                noResultsOverlayLabel: 'Sonuç bulunamadı',
                errorOverlayDefaultLabel: 'Bir hata oluştu',
                toolbarExportLabel: 'Dışa Aktar',
                toolbarExportCSV: 'CSV olarak indir',
                toolbarExportPrint: 'Yazdır',
                toolbarColumnsLabel: 'Sütunlar',
                toolbarFiltersLabel: 'Filtreler',
                toolbarDensityLabel: 'Yoğunluk',
                toolbarDensityCompact: 'Kompakt',
                toolbarDensityStandard: 'Standart',
                toolbarDensityComfortable: 'Rahat',
                filterPanelOperators: 'Operatörler',
                filterPanelColumns: 'Sütunlar',
                filterPanelInputLabel: 'Değer',
                filterPanelInputPlaceholder: 'Filtre değeri',
                columnMenuLabel: 'Menü',
                columnMenuShowColumns: 'Sütunları göster',
                columnMenuFilter: 'Filtrele',
                columnMenuHideColumn: 'Gizle',
                columnMenuUnsort: 'Sıralamayı kaldır',
                columnMenuSortAsc: 'Artan sırala',
                columnMenuSortDesc: 'Azalan sırala',
                columnsPanelTextFieldLabel: 'Sütun bul',
                columnsPanelTextFieldPlaceholder: 'Sütun başlığı',
                columnsPanelDeleteIconLabel: 'Sil',
                columnsPanelShowAllButton: 'Tümünü göster',
                columnsPanelHideAllButton: 'Tümünü gizle',
                filterPanelDeleteIconLabel: 'Sil',
                filterPanelLogicOperator: 'Mantık operatörü',
                filterPanelOperator: 'Operatör',
                filterOperatorContains: 'İçerir',
                filterOperatorEquals: 'Eşittir',
                filterOperatorStartsWith: 'İle başlar',
                filterOperatorEndsWith: 'İle biter',
                filterOperatorIs: 'Eşittir',
                filterOperatorNot: 'Eşit değildir',
                filterOperatorAfter: 'Sonrası',
                filterOperatorOnOrAfter: 'Sonrası veya eşit',
                filterOperatorBefore: 'Öncesi',
                filterOperatorOnOrBefore: 'Öncesi veya eşit',
                filterOperatorIsEmpty: 'Boş',
                filterOperatorIsNotEmpty: 'Boş değil',
                filterOperatorIsAnyOf: 'Herhangi biri',
                filterValueInputLabel: 'Değer',
                filterValueInputPlaceholder: 'Filtre değeri',
                MuiTablePagination: {
                  labelRowsPerPage: 'Sayfa başına satır:',
                  labelDisplayedRows: ({ from, to, count }) =>
                    `${from}–${to} / ${count !== -1 ? count : `${to}'den fazla`}`,
                },
              }}
              sx={{
                border: 'none',
                borderRadius: 3,
                overflow: 'hidden',
                '& .MuiDataGrid-row': {
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.03),
                    boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
                  },
                  '&:nth-of-type(even)': {
                    backgroundColor: alpha(theme.palette.grey[50], 0.3),
                  },
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                  py: 2,
                  display: 'flex',
                  alignItems: 'center',
                },
                '& .MuiDataGrid-columnHeaders': {
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                  borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                  minHeight: '56px !important',
                  maxHeight: '56px !important',
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 700,
                  fontSize: '0.9rem',
                },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
                  backgroundColor: alpha(theme.palette.grey[50], 0.5),
                  minHeight: '52px',
                },
              }}
            />
            </Box>
          </Card>

          {rows.length === 0 && !loading && (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                px: 2,
              }}
            >
              <DescriptionIcon
                sx={{
                  fontSize: 80,
                  color: alpha(theme.palette.text.secondary, 0.3),
                  mb: 2,
                }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Henüz doküman bulunmuyor
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Bu üye için henüz doküman oluşturulmamış veya yüklenmemiş.
              </Typography>
              {canManageDocuments && (
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={() => navigate('/documents/generate')}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      boxShadow: `0 4px 14px 0 ${alpha(theme.palette.error.main, 0.3)}`,
                      bgcolor: theme.palette.error.main,
                      '&:hover': {
                        bgcolor: theme.palette.error.dark,
                      },
                    }}
                  >
                    PDF Olustur Sayfasina Git
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </>
      ) : (
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
            p: 6,
            textAlign: 'center',
          }}
        >
          <PersonIcon
            sx={{
              fontSize: 80,
              color: alpha(theme.palette.primary.main, 0.3),
              mb: 2,
            }}
          />
          <Typography variant="h6" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
            Üye Seçiniz
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Doküman geçmişini görüntülemek için yukarıdan bir üye seçin
          </Typography>
        </Card>
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

export default MemberDocumentsPage;



