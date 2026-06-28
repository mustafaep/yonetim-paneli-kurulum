// src/features/members/pages/BulkMemberRegistrationPage.tsx
import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  useTheme,
  alpha,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  Chip,
  Divider,
  Collapse,
  RadioGroup,
  Radio,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import {
  validateMemberImport,
  downloadMemberImportTemplate,
  bulkImportMembers,
  type ValidateMemberImportResponse,
  type BulkImportResponse,
} from '../services/membersApi';
import { MAX_FILE_SIZE_MB, MAX_ROWS, PREVIEW_COLUMN_LABELS } from '../constants/memberImportTemplate';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import { useToast } from '../../../shared/hooks/useToast';
import { approveInstitution, createInstitution, getDistricts, getProvinces } from '../../regions/services/regionsApi';
import { createTevkifatCenter } from '../../accounting/services/accountingApi';

interface BulkMemberRegistrationPageProps {
  embedded?: boolean;
}

interface BulkRowResult {
  line: number;
  name: string;
  status: 'success' | 'error';
  message?: string;
}

interface BulkPreviewRow {
  line: number;
  name: string;
  province?: string;
  district?: string;
  provinceId?: string;
  districtId?: string;
  status: 'valid' | 'error';
  message?: string;
}

const STATUS_LABELS: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  valid: { label: 'Geçerli', Icon: CheckCircleIcon, color: 'success.main' },
  warning: { label: 'Uyarı', Icon: WarningIcon, color: 'warning.main' },
  error: { label: 'Hata', Icon: ErrorIcon, color: 'error.main' },
};

const BULK_MAX_FILE_SIZE = 5 * 1024 * 1024;

const BulkMemberRegistrationPage: React.FC<BulkMemberRegistrationPageProps> = ({ embedded = false }) => {
  const theme = useTheme();
  const toast = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ValidateMemberImportResponse | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [directActiveSave, setDirectActiveSave] = useState(false);
  const [confirmActiveOpen, setConfirmActiveOpen] = useState(false);
  const [pendingSkipErrors, setPendingSkipErrors] = useState<boolean | null>(null);

  const [embeddedExpanded, setEmbeddedExpanded] = useState(false);
  const [embeddedInstitutionsExpanded, setEmbeddedInstitutionsExpanded] = useState(false);
  const [embeddedTevkifatExpanded, setEmbeddedTevkifatExpanded] = useState(false);

  const [institutionFile, setInstitutionFile] = useState<File | null>(null);
  const [institutionValidating, setInstitutionValidating] = useState(false);
  const [institutionImporting, setInstitutionImporting] = useState(false);
  const [institutionPreviewRows, setInstitutionPreviewRows] = useState<BulkPreviewRow[]>([]);
  const [institutionResults, setInstitutionResults] = useState<BulkRowResult[]>([]);
  const [institutionError, setInstitutionError] = useState<string | null>(null);
  const institutionFileRef = useRef<HTMLInputElement>(null);

  const [tevkifatFile, setTevkifatFile] = useState<File | null>(null);
  const [tevkifatValidating, setTevkifatValidating] = useState(false);
  const [tevkifatImporting, setTevkifatImporting] = useState(false);
  const [tevkifatPreviewRows, setTevkifatPreviewRows] = useState<BulkPreviewRow[]>([]);
  const [tevkifatResults, setTevkifatResults] = useState<BulkRowResult[]>([]);
  const [tevkifatError, setTevkifatError] = useState<string | null>(null);
  const tevkifatFileRef = useRef<HTMLInputElement>(null);

  const provinceCacheRef = useRef<{ id: string; name: string }[] | null>(null);
  const districtCacheRef = useRef<Record<string, { id: string; name: string }[]>>({});

  // --- Helpers ---

  const parseCsvText = (text: string): string[][] => {
    const cleaned = text.replace(/^\uFEFF/, '');
    const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    const sample = lines[0];
    const delimiter = sample.split(';').length > sample.split(',').length ? ';' : ',';
    return lines.map((line) =>
      line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, '')),
    );
  };

  const normalizeText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/İ/g, 'i')
      .trim();

  const findHeaderIndex = (headers: string[], aliases: string[]) =>
    headers.findIndex((header) => aliases.includes(normalizeText(header)));

  const getCachedProvinces = async () => {
    if (provinceCacheRef.current) return provinceCacheRef.current;
    const data = await getProvinces();
    provinceCacheRef.current = data;
    return data;
  };

  const getCachedDistricts = async (provinceId: string) => {
    if (districtCacheRef.current[provinceId]) return districtCacheRef.current[provinceId];
    const data = await getDistricts(provinceId);
    districtCacheRef.current[provinceId] = data;
    return data;
  };

  const resolveProvinceDistrict = async (
    provinceNameRaw?: string,
    districtNameRaw?: string,
  ): Promise<{ provinceId?: string; districtId?: string }> => {
    const provinceName = normalizeText(provinceNameRaw || '');
    const districtName = normalizeText(districtNameRaw || '');
    if (!provinceName && !districtName) return {};

    const provinces = await getCachedProvinces();
    const province = provinces.find((p) => normalizeText(p.name) === provinceName);
    if (!province) return {};

    if (!districtName) return { provinceId: province.id };

    const districts = await getCachedDistricts(province.id);
    const district = districts.find((d) => normalizeText(d.name) === districtName);
    return { provinceId: province.id, districtId: district?.id };
  };

  const downloadSampleCsv = (filename: string, rows: string[][]) => {
    const bom = '\uFEFF';
    const content = bom + rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const validateFileBasic = (f: File | null, label: string): boolean => {
    if (!f) {
      toast.showWarning(`Lütfen bir ${label} CSV dosyası seçin.`);
      return false;
    }
    if (f.size > BULK_MAX_FILE_SIZE) {
      toast.showError('Dosya boyutu 5 MB sınırını aşamaz.');
      return false;
    }
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      toast.showError('Sadece .csv dosyası yükleyebilirsiniz.');
      return false;
    }
    return true;
  };

  // --- Member handlers ---

  const handleDownloadTemplate = useCallback(async () => {
    setTemplateLoading(true);
    try {
      await downloadMemberImportTemplate();
      toast.showSuccess('Şablon indirildi.');
    } catch (err) {
      toast.showError(getApiErrorMessage(err, 'Şablon indirilirken bir hata oluştu.'));
    } finally {
      setTemplateLoading(false);
    }
  }, [toast]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setResult(null);
    setImportResult(null);
    setError(null);
  }, []);

  const handleValidate = useCallback(async () => {
    if (!file) { toast.showWarning('Lütfen bir CSV dosyası seçin.'); return; }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) { toast.showError(`Dosya boyutu ${MAX_FILE_SIZE_MB} MB sınırını aşamaz.`); return; }
    setValidating(true);
    setError(null);
    setResult(null);
    setImportResult(null);
    try {
      const data = await validateMemberImport(file);
      if (data && typeof data.totalRows === 'number' && Array.isArray(data.previewRows)) {
        setResult(data);
        if (data.summary.error > 0) {
          toast.showInfo(`Doğrulama tamamlandı: ${data.summary.valid} geçerli, ${data.summary.error} hatalı.`);
        } else {
          toast.showSuccess(`Doğrulama tamamlandı: ${data.summary.valid} geçerli satır.`);
        }
      } else {
        setError('Sunucu beklenmeyen yanıt döndürdü.');
        toast.showError('Sunucu beklenmeyen yanıt döndürdü.');
      }
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Dosya doğrulanırken bir hata oluştu.');
      setError(msg);
      toast.showError(msg);
    } finally {
      setValidating(false);
    }
  }, [file, toast]);

  const executeImport = useCallback(async (skipErrors: boolean) => {
    if (!file) return;
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const data = await bulkImportMembers(file, skipErrors, directActiveSave);
      setImportResult(data);
      if (data.imported > 0) toast.showSuccess(`${data.imported} üye başarıyla kaydedildi.`);
      if (data.skipped > 0 && data.imported === 0) toast.showWarning('Hiçbir üye kaydedilemedi.');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'İçe aktarma sırasında bir hata oluştu.');
      setError(msg);
      toast.showError(msg);
    } finally {
      setImporting(false);
    }
  }, [file, toast, directActiveSave]);

  const handleImport = useCallback((skipErrors: boolean) => {
    if (directActiveSave) {
      setPendingSkipErrors(skipErrors);
      setConfirmActiveOpen(true);
      return;
    }
    void executeImport(skipErrors);
  }, [directActiveSave, executeImport]);

  const handleConfirmDirectActive = useCallback(() => {
    if (pendingSkipErrors === null) return;
    setConfirmActiveOpen(false);
    const skipErrors = pendingSkipErrors;
    setPendingSkipErrors(null);
    void executeImport(skipErrors);
  }, [pendingSkipErrors, executeImport]);

  // --- Institution handlers ---

  const handleDownloadInstitutionSample = () => {
    downloadSampleCsv('toplu-kurumlar-ornek.csv', [
      ['ad', 'il', 'ilce'],
      ['Örnek İlköğretim Okulu', 'Ankara', 'Çankaya'],
      ['Atatürk Lisesi', 'İstanbul', 'Kadıköy'],
    ]);
  };

  const handleValidateInstitutions = useCallback(async () => {
    if (!validateFileBasic(institutionFile, 'kurum')) return;
    setInstitutionValidating(true);
    setInstitutionPreviewRows([]);
    setInstitutionResults([]);
    setInstitutionError(null);
    try {
      const text = await institutionFile!.text();
      const rows = parseCsvText(text);
      if (rows.length < 2) { toast.showError('CSV boş veya geçersiz.'); return; }
      const headers = rows[0];
      const nameIdx = findHeaderIndex(headers, ['name', 'ad', 'adi', 'kurum', 'kurum adi', 'kurumadi']);
      const provinceIdx = findHeaderIndex(headers, ['province', 'il', 'sehir']);
      const districtIdx = findHeaderIndex(headers, ['district', 'ilce']);
      if (nameIdx < 0) { toast.showError('"ad" veya "name" kolonu bulunamadı.'); return; }

      const preview: BulkPreviewRow[] = [];
      for (let i = 1; i < rows.length; i += 1) {
        const line = i + 1;
        const row = rows[i];
        const name = (row[nameIdx] || '').trim();
        const province = provinceIdx >= 0 ? (row[provinceIdx] || '').trim() : '';
        const district = districtIdx >= 0 ? (row[districtIdx] || '').trim() : '';
        if (!name) {
          preview.push({ line, name: '-', province, district, status: 'error', message: 'Ad alanı boş' });
          continue;
        }
        try {
          const loc = await resolveProvinceDistrict(province, district);
          const locErr = province && !loc.provinceId;
          const distErr = district && loc.provinceId && !loc.districtId;
          const msg = locErr ? `İl bulunamadı: ${province}` : distErr ? `İlçe bulunamadı: ${district}` : undefined;
          preview.push({ line, name, province, district, ...loc, status: locErr ? 'error' : 'valid', message: msg });
        } catch {
          preview.push({ line, name, province, district, status: 'error', message: 'İl/ilçe çözümlenirken hata' });
        }
      }
      setInstitutionPreviewRows(preview);
      const validCount = preview.filter((r) => r.status === 'valid').length;
      const errorCount = preview.filter((r) => r.status === 'error').length;
      toast.showInfo(`Doğrulama tamamlandı: ${validCount} geçerli, ${errorCount} hatalı.`);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'CSV doğrulanırken bir hata oluştu.');
      setInstitutionError(msg);
      toast.showError(msg);
    } finally {
      setInstitutionValidating(false);
    }
  }, [institutionFile, toast]);

  const handleSaveInstitutions = useCallback(async () => {
    const validRows = institutionPreviewRows.filter((r) => r.status === 'valid');
    if (validRows.length === 0) { toast.showWarning('Kaydedilecek geçerli satır bulunamadı.'); return; }
    setInstitutionImporting(true);
    setInstitutionResults([]);
    setInstitutionError(null);
    try {
      const results: BulkRowResult[] = [];
      for (const row of validRows) {
        try {
          const createdInstitution = await createInstitution({
            name: row.name,
            provinceId: row.provinceId,
            districtId: row.districtId,
          });
          await approveInstitution(createdInstitution.id);
          results.push({ line: row.line, name: row.name, status: 'success' });
        } catch (err) {
          results.push({ line: row.line, name: row.name, status: 'error', message: getApiErrorMessage(err, 'Kayıt hatası') });
        }
      }
      setInstitutionResults(results);
      const ok = results.filter((r) => r.status === 'success').length;
      const fail = results.filter((r) => r.status === 'error').length;
      if (ok > 0 && fail === 0) toast.showSuccess(`${ok} kurum başarıyla eklendi.`);
      else if (ok > 0) toast.showInfo(`${ok} kurum eklendi, ${fail} satırda hata oluştu.`);
      else toast.showError('Hiçbir kurum eklenemedi.');
    } finally {
      setInstitutionImporting(false);
    }
  }, [institutionPreviewRows, toast]);

  const resetInstitutions = () => {
    setInstitutionFile(null);
    setInstitutionPreviewRows([]);
    setInstitutionResults([]);
    setInstitutionError(null);
    if (institutionFileRef.current) institutionFileRef.current.value = '';
  };

  // --- Tevkifat handlers ---

  const handleDownloadTevkifatSample = () => {
    downloadSampleCsv('toplu-tevkifat-merkezi-ornek.csv', [
      ['ad', 'il', 'ilce'],
      ['Merkez Hastane Tevkifat', 'Ankara', 'Çankaya'],
      ['Eğitim Araştırma Merkezi', 'İstanbul', 'Şişli'],
    ]);
  };

  const handleValidateTevkifatCenters = useCallback(async () => {
    if (!validateFileBasic(tevkifatFile, 'tevkifat merkezi')) return;
    setTevkifatValidating(true);
    setTevkifatPreviewRows([]);
    setTevkifatResults([]);
    setTevkifatError(null);
    try {
      const text = await tevkifatFile!.text();
      const rows = parseCsvText(text);
      if (rows.length < 2) { toast.showError('CSV boş veya geçersiz.'); return; }
      const headers = rows[0];
      const nameIdx = findHeaderIndex(headers, ['name', 'ad', 'adi', 'merkez', 'tevkifat merkezi', 'tevkifat merkez adi']);
      const provinceIdx = findHeaderIndex(headers, ['province', 'il', 'sehir']);
      const districtIdx = findHeaderIndex(headers, ['district', 'ilce']);
      if (nameIdx < 0) { toast.showError('"ad" veya "name" kolonu bulunamadı.'); return; }

      const preview: BulkPreviewRow[] = [];
      for (let i = 1; i < rows.length; i += 1) {
        const line = i + 1;
        const row = rows[i];
        const name = (row[nameIdx] || '').trim();
        const province = provinceIdx >= 0 ? (row[provinceIdx] || '').trim() : '';
        const district = districtIdx >= 0 ? (row[districtIdx] || '').trim() : '';
        if (!name) {
          preview.push({ line, name: '-', province, district, status: 'error', message: 'Ad alanı boş' });
          continue;
        }
        try {
          const loc = await resolveProvinceDistrict(province, district);
          const locErr = province && !loc.provinceId;
          const distErr = district && loc.provinceId && !loc.districtId;
          const msg = locErr ? `İl bulunamadı: ${province}` : distErr ? `İlçe bulunamadı: ${district}` : undefined;
          preview.push({ line, name, province, district, ...loc, status: locErr ? 'error' : 'valid', message: msg });
        } catch {
          preview.push({ line, name, province, district, status: 'error', message: 'İl/ilçe çözümlenirken hata' });
        }
      }
      setTevkifatPreviewRows(preview);
      const validCount = preview.filter((r) => r.status === 'valid').length;
      const errorCount = preview.filter((r) => r.status === 'error').length;
      toast.showInfo(`Doğrulama tamamlandı: ${validCount} geçerli, ${errorCount} hatalı.`);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'CSV doğrulanırken bir hata oluştu.');
      setTevkifatError(msg);
      toast.showError(msg);
    } finally {
      setTevkifatValidating(false);
    }
  }, [tevkifatFile, toast]);

  const handleSaveTevkifatCenters = useCallback(async () => {
    const validRows = tevkifatPreviewRows.filter((r) => r.status === 'valid');
    if (validRows.length === 0) { toast.showWarning('Kaydedilecek geçerli satır bulunamadı.'); return; }
    setTevkifatImporting(true);
    setTevkifatResults([]);
    setTevkifatError(null);
    try {
      const results: BulkRowResult[] = [];
      for (const row of validRows) {
        try {
          await createTevkifatCenter({ name: row.name, provinceId: row.provinceId, districtId: row.districtId });
          results.push({ line: row.line, name: row.name, status: 'success' });
        } catch (err) {
          results.push({ line: row.line, name: row.name, status: 'error', message: getApiErrorMessage(err, 'Kayıt hatası') });
        }
      }
      setTevkifatResults(results);
      const ok = results.filter((r) => r.status === 'success').length;
      const fail = results.filter((r) => r.status === 'error').length;
      if (ok > 0 && fail === 0) toast.showSuccess(`${ok} tevkifat merkezi başarıyla eklendi.`);
      else if (ok > 0) toast.showInfo(`${ok} merkez eklendi, ${fail} satırda hata oluştu.`);
      else toast.showError('Hiçbir merkez eklenemedi.');
    } finally {
      setTevkifatImporting(false);
    }
  }, [tevkifatPreviewRows, toast]);

  const resetTevkifat = () => {
    setTevkifatFile(null);
    setTevkifatPreviewRows([]);
    setTevkifatResults([]);
    setTevkifatError(null);
    if (tevkifatFileRef.current) tevkifatFileRef.current.value = '';
  };

  // --- Shared UI ---

  const previewColumns = result?.previewRows[0]
    ? Object.keys(result.previewRows[0].data).filter((k) => k && !k.startsWith('col_'))
    : [];
  const hasValidRows = result && result.summary.valid > 0;
  const hasErrors = result && result.summary.error > 0;
  const allValid = result && result.summary.error === 0 && result.summary.valid > 0;

  const sectionCardSx = {
    borderRadius: 4,
    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.6)} 100%)`,
    boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.06)}`,
    overflow: 'hidden',
  };

  const sectionHeaderSx = (color: string, darkColor: string) => ({
    p: { xs: 2.5, sm: 3 },
    pb: 2.5,
    background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(darkColor, 0.04)} 100%)`,
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none' as const,
  });

  const iconBoxSx = (color: string, darkColor: string) => ({
    width: { xs: 40, sm: 44 },
    height: { xs: 40, sm: 44 },
    borderRadius: 2,
    background: `linear-gradient(135deg, ${color} 0%, ${darkColor} 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 4px 16px ${alpha(color, 0.35)}`,
  });

  const expandBtnSx = (color: string) => ({
    width: 36,
    height: 36,
    border: `1px solid ${alpha(color, 0.25)}`,
    backgroundColor: theme.palette.background.paper,
    color,
    boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.1)}`,
    '&:hover': { backgroundColor: alpha(color, 0.08) },
  });

  const stepTitleSx = {
    fontWeight: 700,
    fontSize: '0.95rem',
    color: theme.palette.text.primary,
    mb: 1,
  };

  const stepDescSx = {
    mb: 2,
    color: theme.palette.text.secondary,
    fontSize: '0.85rem',
  };

  const renderBulkPreviewTable = (rows: BulkPreviewRow[]) => (
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300, borderRadius: 2 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>Satır</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>Durum</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>Ad</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>İl</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>İlçe</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>Mesaj</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={`preview-${row.line}-${row.name}`}
              sx={{
                backgroundColor: row.status === 'error' ? alpha(theme.palette.error.main, 0.04) : 'transparent',
              }}
            >
              <TableCell>{row.line}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  icon={row.status === 'valid' ? <CheckCircleIcon /> : <ErrorIcon />}
                  color={row.status === 'valid' ? 'success' : 'error'}
                  label={row.status === 'valid' ? 'Geçerli' : 'Hatalı'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 500 }}>{row.name}</TableCell>
              <TableCell>{row.province || '—'}</TableCell>
              <TableCell>{row.district || '—'}</TableCell>
              <TableCell>
                {row.message ? (
                  <Typography variant="caption" color="error.main">{row.message}</Typography>
                ) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderBulkResults = (results: BulkRowResult[], label: string, onReset: () => void) => {
    const ok = results.filter((r) => r.status === 'success').length;
    const fail = results.filter((r) => r.status === 'error').length;
    const errors = results.filter((r) => r.status === 'error');

    return (
      <Box sx={{ mt: 2 }}>
        <Alert
          severity={fail === 0 ? 'success' : ok > 0 ? 'warning' : 'error'}
          sx={{ borderRadius: 2, mb: 1.5 }}
        >
          <strong>{ok}</strong> {label} başarıyla kaydedildi.
          {fail > 0 && <> <strong>{fail}</strong> satırda hata oluştu.</>}
        </Alert>
        {errors.length > 0 && (
          <Box sx={{ maxHeight: 120, overflowY: 'auto', mb: 1.5 }}>
            {errors.slice(0, 10).map((r) => (
              <Typography key={`err-${r.line}-${r.name}`} variant="caption" display="block" color="error.main" sx={{ mb: 0.25 }}>
                Satır {r.line} — {r.name}: {r.message}
              </Typography>
            ))}
            {errors.length > 10 && (
              <Typography variant="caption" color="text.secondary">
                ...ve {errors.length - 10} hata daha
              </Typography>
            )}
          </Box>
        )}
        <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={onReset} sx={{ borderRadius: 2 }}>
          Yeni dosya yükle
        </Button>
      </Box>
    );
  };

  const renderBulkSection = (
    previewRows: BulkPreviewRow[],
    results: BulkRowResult[],
    errorMsg: string | null,
    isValidating: boolean,
    isImporting: boolean,
    selectedFile: File | null,
    fileRef: React.RefObject<HTMLInputElement | null>,
    onFileChange: (f: File | null) => void,
    onDownloadSample: () => void,
    onValidate: () => void,
    onSave: () => void,
    onReset: () => void,
    entityLabel: string,
  ) => (
    <Box sx={{ p: { xs: 2.5, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Step 1 */}
      <Typography sx={stepTitleSx}>1. Şablon indir</Typography>
      <Typography variant="body2" sx={stepDescSx}>
        CSV dosyasını doldurmak için örnek şablonu indirin. Kolonlar: <strong>ad</strong>, <strong>il</strong>, <strong>ilçe</strong>
      </Typography>
      <Button
        variant="outlined"
        size="small"
        startIcon={<DownloadIcon />}
        onClick={onDownloadSample}
        sx={{ borderRadius: 2, alignSelf: 'flex-start', mb: 0.5 }}
      >
        Örnek CSV indir
      </Button>

      <Divider sx={{ my: 2.5 }} />

      {/* Step 2 */}
      <Typography sx={stepTitleSx}>2. Dosya yükle ve doğrula</Typography>
      <Typography variant="body2" sx={stepDescSx}>
        .csv dosyasını seçin ve doğrulama yaparak önizleme oluşturun.
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          component="label"
          size="small"
          startIcon={<UploadFileIcon />}
          disabled={isValidating || isImporting}
          sx={{ borderRadius: 2 }}
        >
          CSV seç
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,application/csv"
            hidden
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={onValidate}
          disabled={!selectedFile || isValidating || isImporting}
          startIcon={isValidating ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ borderRadius: 2 }}
        >
          {isValidating ? 'Doğrulanıyor…' : 'Doğrula'}
        </Button>
        {selectedFile && (
          <Chip label={selectedFile.name} size="small" variant="outlined" onDelete={() => onFileChange(null)} />
        )}
      </Box>
      {errorMsg && (
        <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }} onClose={() => onReset()}>
          {errorMsg}
        </Alert>
      )}

      {/* Step 3 */}
      {previewRows.length > 0 && !results.length && (
        <>
          <Divider sx={{ my: 2.5 }} />
          <Typography sx={stepTitleSx}>3. İçeriği görüntüle</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <Chip size="small" label={`Toplam: ${previewRows.length}`} variant="outlined" />
            <Chip size="small" icon={<CheckCircleIcon />} color="success" label={`Geçerli: ${previewRows.filter((r) => r.status === 'valid').length}`} variant="outlined" />
            {previewRows.some((r) => r.status === 'error') && (
              <Chip size="small" icon={<ErrorIcon />} color="error" label={`Hatalı: ${previewRows.filter((r) => r.status === 'error').length}`} variant="outlined" />
            )}
          </Box>
          {renderBulkPreviewTable(previewRows)}

          <Divider sx={{ my: 2.5 }} />
          <Typography sx={stepTitleSx}>4. Kaydet</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={onSave}
              disabled={isImporting || previewRows.filter((r) => r.status === 'valid').length === 0}
              startIcon={isImporting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              sx={{ borderRadius: 2 }}
            >
              {isImporting ? 'Kaydediliyor…' : `Geçerli satırları kaydet (${previewRows.filter((r) => r.status === 'valid').length})`}
            </Button>
            {previewRows.some((r) => r.status === 'error') && (
              <Typography variant="caption" color="text.secondary">
                {previewRows.filter((r) => r.status === 'error').length} hatalı satır atlanacak
              </Typography>
            )}
          </Box>
        </>
      )}

      {/* Results */}
      {results.length > 0 && renderBulkResults(results, entityLabel, onReset)}
    </Box>
  );

  // --- Member content ---

  const memberFormContent = (
    <Box sx={{ p: { xs: 2.5, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Step 1 */}
      <Typography sx={stepTitleSx}>1. Şablon indir</Typography>
      <Typography variant="body2" sx={stepDescSx}>
        CSV dosyasını doldurmak için şablonu indirin. En fazla <strong>{MAX_FILE_SIZE_MB} MB</strong>, <strong>{MAX_ROWS} satır</strong>
      </Typography>
      <Button
        variant="outlined"
        size="small"
        startIcon={templateLoading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
        onClick={handleDownloadTemplate}
        disabled={templateLoading}
        sx={{ borderRadius: 2, alignSelf: 'flex-start', mb: 0.5 }}
      >
        {templateLoading ? 'İndiriliyor…' : 'Örnek CSV indir'}
      </Button>

      <Divider sx={{ my: 2.5 }} />

      {/* Step 2 */}
      <Typography sx={stepTitleSx}>2. Dosya yükle ve doğrula</Typography>
      <Typography variant="body2" sx={stepDescSx}>
        .csv dosyasını seçin ve doğrulama yaparak önizleme oluşturun.
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          component="label"
          size="small"
          startIcon={<UploadFileIcon />}
          disabled={validating || importing}
          sx={{ borderRadius: 2 }}
        >
          CSV seç
          <input type="file" accept=".csv,text/csv,application/csv" hidden onChange={handleFileChange} />
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleValidate}
          disabled={!file || validating || importing}
          startIcon={validating ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ borderRadius: 2 }}
        >
          {validating ? 'Doğrulanıyor…' : 'Doğrula'}
        </Button>
        {file && (
          <Chip label={file.name} size="small" variant="outlined" onDelete={() => { setFile(null); setResult(null); setImportResult(null); setError(null); }} />
        )}
      </Box>
      {error && (
        <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Step 3 */}
      {result && !importResult && (
        <>
          <Divider sx={{ my: 2.5 }} />
          <Typography sx={stepTitleSx}>3. İçeriği görüntüle</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <Chip size="small" label={`Toplam: ${result.totalRows}`} variant="outlined" />
            <Chip size="small" icon={<CheckCircleIcon />} color="success" label={`Geçerli: ${result.summary.valid}`} variant="outlined" />
            {result.summary.warning > 0 && <Chip size="small" icon={<WarningIcon />} color="warning" label={`Uyarı: ${result.summary.warning}`} variant="outlined" />}
            {result.summary.error > 0 && <Chip size="small" icon={<ErrorIcon />} color="error" label={`Hatalı: ${result.summary.error}`} variant="outlined" />}
          </Box>
          {result.errors.length > 0 && (
            <Alert severity="info" sx={{ mb: 1.5, borderRadius: 2 }}>Hatalı satırları düzeltip tekrar yükleyebilirsiniz.</Alert>
          )}
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300, borderRadius: 2 }}>
            <Table size="small" stickyHeader sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>Satır</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>Durum</TableCell>
                  {previewColumns.map((col) => (
                    <TableCell key={col} sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.04), minWidth: 100, maxWidth: 180, whiteSpace: 'nowrap' }}>
                      <Tooltip title={PREVIEW_COLUMN_LABELS[col] ?? col}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{PREVIEW_COLUMN_LABELS[col] ?? col}</span></Tooltip>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {result.previewRows.map((row) => {
                  const conf = STATUS_LABELS[row.status] ?? STATUS_LABELS.error;
                  const Icon = conf.Icon;
                  const errorTitle = row.errors?.length && `Satır ${row.rowIndex} hataları:\n${row.errors.map((e) => `• ${PREVIEW_COLUMN_LABELS[e.column ?? ''] ?? e.column ?? '—'}: ${e.message}`).join('\n')}`;
                  return (
                    <TableRow key={row.rowIndex} sx={{ backgroundColor: row.status === 'error' ? alpha(theme.palette.error.main, 0.04) : 'transparent' }}>
                      <TableCell>{row.rowIndex}</TableCell>
                      <TableCell>
                        <Tooltip title={errorTitle ? <Box component="span" sx={{ whiteSpace: 'pre-line' }}>{errorTitle}</Box> : conf.label}>
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <IconButton size="small" sx={{ color: conf.color }}><Icon fontSize="small" /></IconButton>
                            <Typography component="span" variant="caption" sx={{ color: conf.color, ml: 0.5 }}>{conf.label}{row.status === 'error' && row.errors?.length && row.errors.length > 1 ? ` (${row.errors.length})` : ''}</Typography>
                          </span>
                        </Tooltip>
                      </TableCell>
                      {previewColumns.map((col) => (
                        <TableCell key={col} sx={{ minWidth: 100, maxWidth: 180 }} title={String(row.data[col] ?? '')}>
                          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180, whiteSpace: 'nowrap' }}>{row.data[col] || '—'}</Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {result.totalRows > result.previewRows.length && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              İlk {result.previewRows.length} satır gösteriliyor. Toplam {result.totalRows} satır.
            </Typography>
          )}

          {/* Step 4 */}
          {hasValidRows && (
            <>
              <Divider sx={{ my: 2.5 }} />
              <Typography sx={stepTitleSx}>4. Kaydet</Typography>
              <Box
                sx={{
                  mb: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
                  backgroundColor: alpha(theme.palette.warning.main, 0.06),
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
                  Kayıt tipi
                </Typography>
                <RadioGroup
                  row
                  value={directActiveSave ? 'ACTIVE' : 'PENDING'}
                  onChange={(e) => setDirectActiveSave(e.target.value === 'ACTIVE')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                    <Radio value="PENDING" size="small" />
                    <Typography variant="body2">Normal kayıt (bekleyen başvuru)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Radio value="ACTIVE" size="small" />
                    <Typography variant="body2">Doğrudan aktif üye olarak kaydet</Typography>
                  </Box>
                </RadioGroup>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                {allValid && (
                  <Button variant="contained" color="success" size="small" startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={() => handleImport(false)} disabled={importing} sx={{ borderRadius: 2 }}>
                    {importing ? 'Kaydediliyor…' : `Geçerli satırları kaydet (${result.summary.valid})`}
                  </Button>
                )}
                {hasErrors && hasValidRows && (
                  <>
                    <Button variant="contained" color="warning" size="small" startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <PublishIcon />} onClick={() => handleImport(true)} disabled={importing} sx={{ borderRadius: 2 }}>
                      {importing ? 'Kaydediliyor…' : `Geçerli satırları kaydet (${result.summary.valid})`}
                    </Button>
                    <Typography variant="caption" color="text.secondary">{result.summary.error} hatalı satır atlanacak</Typography>
                  </>
                )}
                {hasErrors && !hasValidRows && <Alert severity="error" sx={{ flex: 1, borderRadius: 2 }}>Tüm satırlarda hata var.</Alert>}
              </Box>
            </>
          )}
        </>
      )}

      {/* Results */}
      {importResult && (
        <Box sx={{ mt: 2 }}>
          <Alert
            severity={importResult.imported > 0 && importResult.skipped === 0 ? 'success' : importResult.imported > 0 ? 'warning' : 'error'}
            sx={{ borderRadius: 2, mb: 1.5 }}
          >
            <strong>{importResult.imported}</strong> üye başarıyla kaydedildi.
            {importResult.skipped > 0 && <> <strong>{importResult.skipped}</strong> satır atlandı.</>}
          </Alert>
          {importResult.duplicateNationalIds.length > 0 && (
            <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
              <strong>{importResult.duplicateNationalIds.length}</strong> TC zaten kayıtlı:
              <Box component="span" sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {importResult.duplicateNationalIds.slice(0, 10).join(', ')}{importResult.duplicateNationalIds.length > 10 && ` ve ${importResult.duplicateNationalIds.length - 10} daha...`}
              </Box>
            </Alert>
          )}
          {importResult.errors.length > 0 && (
            <Box sx={{ maxHeight: 120, overflowY: 'auto', mb: 1.5 }}>
              {importResult.errors.slice(0, 10).map((e, idx) => (
                <Typography key={idx} variant="caption" display="block" color="error.main" sx={{ mb: 0.25 }}>
                  Satır {e.rowIndex}: {e.message}
                </Typography>
              ))}
              {importResult.errors.length > 10 && (
                <Typography variant="caption" color="text.secondary">...ve {importResult.errors.length - 10} hata daha</Typography>
              )}
            </Box>
          )}
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={() => { setFile(null); setResult(null); setImportResult(null); setError(null); }} sx={{ borderRadius: 2 }}>
            Yeni dosya yükle
          </Button>
        </Box>
      )}

      <Dialog open={confirmActiveOpen} onClose={() => setConfirmActiveOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Doğrudan Aktif Üye Onayı</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Seçili işlem üyeleri beklemeye almadan doğrudan aktif üye olarak kaydedecek. Devam etmek istediğinize emin misiniz?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmActiveOpen(false)} color="inherit">
            Vazgeç
          </Button>
          <Button onClick={handleConfirmDirectActive} variant="contained" color="warning">
            Onayla ve Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  // --- Accordion renderer ---

  const renderAccordionSection = (
    expanded: boolean,
    toggle: () => void,
    icon: React.ReactNode,
    title: string,
    description: string,
    color: string,
    darkColor: string,
    children: React.ReactNode,
  ) => (
    <Card elevation={0} sx={sectionCardSx}>
      <Box onClick={toggle} sx={sectionHeaderSx(color, darkColor)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={iconBoxSx(color, darkColor)}>{icon}</Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}>{title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{description}</Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggle(); }} sx={expandBtnSx(color)}>
          <ExpandMoreIcon sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
        </IconButton>
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>{children}</Collapse>
    </Card>
  );

  // --- Final layout ---

  const content = embedded ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {renderAccordionSection(
        embeddedExpanded,
        () => setEmbeddedExpanded((p) => !p),
        <GroupAddIcon sx={{ color: '#fff', fontSize: '1.35rem' }} />,
        'Toplu Üye Kayıt Girişi',
        'CSV dosyası ile toplu üye kayıt işlemleri',
        theme.palette.info.main,
        theme.palette.info.dark,
        memberFormContent,
      )}
      {renderAccordionSection(
        embeddedInstitutionsExpanded,
        () => setEmbeddedInstitutionsExpanded((p) => !p),
        <BusinessIcon sx={{ color: '#fff', fontSize: '1.35rem' }} />,
        'Toplu Kurumlar Girişi',
        'CSV dosyası ile toplu kurum ekleme',
        theme.palette.success.main,
        theme.palette.success.dark,
        renderBulkSection(
          institutionPreviewRows, institutionResults, institutionError,
          institutionValidating, institutionImporting,
          institutionFile, institutionFileRef,
          (f) => { setInstitutionFile(f); setInstitutionPreviewRows([]); setInstitutionResults([]); setInstitutionError(null); },
          handleDownloadInstitutionSample, handleValidateInstitutions, handleSaveInstitutions, resetInstitutions,
          'kurum',
        ),
      )}
      {renderAccordionSection(
        embeddedTevkifatExpanded,
        () => setEmbeddedTevkifatExpanded((p) => !p),
        <AccountBalanceIcon sx={{ color: '#fff', fontSize: '1.35rem' }} />,
        'Toplu Tevkifat Merkezi Girişi',
        'CSV dosyası ile toplu tevkifat merkezi ekleme',
        theme.palette.warning.main,
        theme.palette.warning.dark,
        renderBulkSection(
          tevkifatPreviewRows, tevkifatResults, tevkifatError,
          tevkifatValidating, tevkifatImporting,
          tevkifatFile, tevkifatFileRef,
          (f) => { setTevkifatFile(f); setTevkifatPreviewRows([]); setTevkifatResults([]); setTevkifatError(null); },
          handleDownloadTevkifatSample, handleValidateTevkifatCenters, handleSaveTevkifatCenters, resetTevkifat,
          'tevkifat merkezi',
        ),
      )}
    </Box>
  ) : (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{memberFormContent}</Box>
  );

  if (embedded) return content;

  return (
    <PageLayout>
      <PageHeader icon={<GroupAddIcon />} title="Toplu Üye Kayıt" description="Birden fazla üyeyi CSV dosyası ile toplu olarak sisteme kaydedin" />
      {content}
    </PageLayout>
  );
};

export default BulkMemberRegistrationPage;
