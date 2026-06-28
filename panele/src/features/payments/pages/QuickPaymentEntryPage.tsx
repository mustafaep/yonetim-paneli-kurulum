// src/pages/payments/QuickPaymentEntryPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  useTheme,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  Tooltip,
  Stack,
  Autocomplete,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BusinessIcon from '@mui/icons-material/Business';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getMembers } from '../../members/services/membersApi';
import { createPayment, updatePayment, getPayments, type PaymentType, type CreateMemberPaymentDto, type UpdateMemberPaymentDto, type MemberPayment } from '../services/paymentsApi';
import type { MemberListItem, MemberStatus } from '../../../types/member';
import { getTevkifatCenters } from '../../accounting/services/accountingApi';
import type { TevkifatCenter } from '../../accounting/services/accountingApi';
import { getProvinces } from '../../regions/services/regionsApi';
import type { Province } from '../../../types/region';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

interface PaymentRow {
  id: string;
  paymentId?: string; // Mevcut Kesinti ID'si (düzenleme için)
  memberId: string | null;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  institution: string;
  tevkifatCenter: string;
  provinceName: string;
  amount: string;
  paymentType: PaymentType;
  description: string;
  status: 'DRAFT' | 'SAVED';
  member?: MemberListItem;
}

const QuickPaymentEntryPage: React.FC = () => {
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [tevkifatCenters, setTevkifatCenters] = useState<TevkifatCenter[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filtreler
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    tevkifatCenterId: '',
    provinceId: '',
  });

  // Tablo filtreleri
  const [tableFilters, setTableFilters] = useState({
    registrationNumber: '',
    name: '',
    nationalId: '',
    tevkifatCenter: '',
    province: '',
  });

  // Debounced filtreler (performans için)
  const [debouncedFilters, setDebouncedFilters] = useState(tableFilters);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(tableFilters);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [tableFilters]);

  // Tablo satırları
  const [rows, setRows] = useState<PaymentRow[]>([]);
  
  // Pagination (performans için)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50); // Sayfa başına 50 satır
  
  // Aynı ay Kesinti mevcut: mevcut Kesintiyi göster ve güncelle
  const [duplicatePaymentDialog, setDuplicatePaymentDialog] = useState<{
    open: boolean;
    memberName: string;
    memberId: string;
    rowId: string;
    existingPayment: MemberPayment | null;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    open: false,
    memberName: '',
    memberId: '',
    rowId: '',
    existingPayment: null,
  });
  const [duplicateDialogEditForm, setDuplicateDialogEditForm] = useState<{
    amount: string;
    paymentType: PaymentType;
    tevkifatCenterId: string;
    description: string;
  }>({ amount: '', paymentType: 'TEVKIFAT', tevkifatCenterId: '', description: '' });
  const [duplicateDialogTevkifatCenters, setDuplicateDialogTevkifatCenters] = useState<Array<{ id: string; name: string }>>([]);
  const [duplicateDialogSaving, setDuplicateDialogSaving] = useState(false);

  // Aynı ay Kesinti dialog'u açıldığında formu doldur ve tevkifat merkezlerini yükle (sadece aktif merkezler)
  useEffect(() => {
    if (!duplicatePaymentDialog.open || !duplicatePaymentDialog.existingPayment) return;
    const p = duplicatePaymentDialog.existingPayment;
    const existingCenterId = p.tevkifatCenterId || p.tevkifatCenter?.id || '';
    setDuplicateDialogEditForm({
      amount: p.amount || '',
      paymentType: (p.paymentType as PaymentType) || 'TEVKIFAT',
      tevkifatCenterId: existingCenterId,
      description: p.description || '',
    });
    getTevkifatCenters({ activeOnly: true })
      .then((data) => {
        setDuplicateDialogTevkifatCenters(data);
        // Mevcut Kesintinin tevkifat merkezi kaldırılmışsa seçimi sıfırla
        if (existingCenterId && !data.some((c) => c.id === existingCenterId)) {
          setDuplicateDialogEditForm((prev) => ({
            ...prev,
            tevkifatCenterId: data[0]?.id ?? '',
          }));
        }
      })
      .catch(() => setDuplicateDialogTevkifatCenters([]));
  }, [duplicatePaymentDialog.open, duplicatePaymentDialog.existingPayment]);

  const canView = hasPermission('MEMBER_PAYMENT_LIST');

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  const paymentTypeLabels: Record<PaymentType, string> = {
    TEVKIFAT: 'Tevkifat',
    ELDEN: 'Elden',
    HAVALE: 'Havale',
  };

  const loadTevkifatCenters = useCallback(async (provinceIdFilter: string) => {
    try {
      const data = await getTevkifatCenters({
        activeOnly: true,
        ...(provinceIdFilter ? { provinceId: provinceIdFilter } : {}),
      });
      setTevkifatCenters(data);
      setFilters((prev) => {
        if (!prev.tevkifatCenterId) return prev;
        if (data.some((c) => c.id === prev.tevkifatCenterId)) return prev;
        return { ...prev, tevkifatCenterId: '' };
      });
    } catch (e) {
      console.error('Tevkifat merkezleri yüklenirken hata:', e);
      toast.showError('Tevkifat merkezleri yüklenirken bir hata oluştu');
    }
  }, [toast]);

  useEffect(() => {
    if (canView) {
      loadProvinces();
    }
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    void loadTevkifatCenters(filters.provinceId);
  }, [canView, filters.provinceId, loadTevkifatCenters]);

  const loadProvinces = async () => {
    try {
      const data = await getProvinces();
      setProvinces(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('İller yüklenirken hata:', e);
    }
  };

  const loadMembers = async () => {
    if (loadingMembers) {
      return;
    }

    setLoadingMembers(true);
    try {
      // Tevkifat merkezi seçilmemişse uyarı ver ve çık
      if (!filters.tevkifatCenterId) {
        toast.showWarning('Lütfen önce bir tevkifat merkezi seçin. Tüm üyeleri yüklemek performans sorunlarına yol açar.');
        setLoadingMembers(false);
        return;
      }

      // Reddedilenler ve istifalar hariç tüm üyeleri yükle.
      const includedStatuses: MemberStatus[] = [
        'ACTIVE',
        'PENDING',
        'APPROVED',
        'INACTIVE',
        'EXPELLED',
      ];
      const memberGroups = await Promise.all(
        includedStatuses.map((status) =>
          getMembers(status, filters.provinceId || undefined),
        ),
      );
      const allMembers = memberGroups.flat();

      // Tevkifat merkezi filtresi uygula (zorunlu)
      let filteredMembers = allMembers.filter(
        (m) => m.tevkifatCenter?.id === filters.tevkifatCenterId
      );

      // İl filtresi backend'de provinceId parametresi ile uygulanıyor (getMembers'a gönderildi)

      // Mevcut satırlardaki üye ID'lerini topla (duplicate kontrolü için)
      setRows((prevRows) => {
        const existingMemberIds = new Set(
          prevRows.filter((r) => r.memberId).map((r) => r.memberId)
        );

        // Gelen üyeleri tabloya yeni satırlar olarak ekle (batch processing ile)
        let membersToAdd = filteredMembers.filter(
          (member) => !existingMemberIds.has(member.id)
        );
        
        if (membersToAdd.length === 0) {
          const centerLabel = 'Seçilen tevkifat merkezi için';
          if (filteredMembers.length === 0) {
            toast.showInfo(`${centerLabel} üye bulunamadı.`);
          } else {
            toast.showInfo(`${centerLabel} tüm üyeler zaten tabloda mevcut.`);
          }
          return prevRows;
        }

        // Çok fazla üye varsa uyarı ver ve limit uygula
        const MAX_MEMBERS = 1000;
        if (membersToAdd.length > MAX_MEMBERS) {
          toast.showWarning(`Performans için maksimum ${MAX_MEMBERS} üye eklenebilir. İlk ${MAX_MEMBERS} üye ekleniyor. Lütfen filtreleme kullanın.`);
          membersToAdd = membersToAdd.slice(0, MAX_MEMBERS);
        }

        // Batch processing: Çok fazla üye varsa parça parça ekle (requestAnimationFrame ile optimize edildi)
        // Küçük batch size ile UI donmasını önle
        const BATCH_SIZE = 25; // Daha küçük batch size (daha akıcı)
        const batches: PaymentRow[][] = [];
        
        // Batch'leri oluştur
        for (let i = 0; i < membersToAdd.length; i += BATCH_SIZE) {
          const batch = membersToAdd.slice(i, i + BATCH_SIZE).map((member) => ({
            id: `draft-${Date.now()}-${Math.random()}-${member.id}`,
            paymentId: undefined,
            memberId: member.id,
            registrationNumber: member.registrationNumber || '',
            firstName: member.firstName,
            lastName: member.lastName,
            nationalId: member.nationalId || '',
            institution: member.institution?.name || '',
            tevkifatCenter: member.tevkifatCenter?.name || '',
            provinceName:
              member.workingProvince?.name ||
              member.province?.name ||
              '',
            amount: '',
            paymentType: 'TEVKIFAT' as PaymentType,
            description: '',
            status: 'DRAFT' as const,
            member: member,
          }));
          batches.push(batch);
        }

        // Batch'lerin boş olmamasını kontrol et
        if (batches.length === 0) {
          return prevRows;
        }

        // İlk batch'i hemen ekle (kullanıcı hemen bir şey görsün)
        const firstBatch = batches[0];
        const initialRows = [...prevRows, ...firstBatch];
        
        // Diğer batch'leri requestAnimationFrame ile akıcı şekilde ekle
        if (batches.length > 1) {
          let batchIndex = 1;
          
          const addNextBatch = () => {
            // Index kontrolü
            if (batchIndex >= batches.length) {
              return;
            }
            
            requestAnimationFrame(() => {
              // Batch'in varlığını kontrol et
              const currentBatch = batches[batchIndex];
              if (!currentBatch || !Array.isArray(currentBatch)) {
                return;
              }
              
              setRows((currentRows) => {
                const newRows = [...currentRows, ...currentBatch];
                batchIndex++;
                
                // Sonraki batch'i ekle (eğer varsa)
                if (batchIndex < batches.length) {
                  // Her batch arasında kısa bir bekleme (UI'nin nefes alması için)
                  setTimeout(() => {
                    requestAnimationFrame(addNextBatch);
                  }, 10); // 10ms bekle (çok hızlı ama UI'yi bloklamıyor)
                }
                
                return newRows;
              });
            });
          };
          
          // İlk batch'ten sonra diğer batch'leri eklemeye başla
          requestAnimationFrame(() => {
            setTimeout(() => {
              requestAnimationFrame(addNextBatch);
            }, 16); // ~1 frame bekle (60fps için)
          });
        }

        const centerLabel = 'Seçilen tevkifat merkezi için';

        // Başarı mesajını state güncellemesi dışında, bir kez göstermek için
        const addedCount = membersToAdd.length;

        // State'i güncelle
        const nextRows = initialRows;

        // Toast'ı sadece gerçek eklenen satır sayısı > 0 ise göster
        if (addedCount > 0) {
          toast.showSuccess(
            `${centerLabel} ${addedCount} üye tabloya ekleniyor.`
          );
        }

        return nextRows;
      });

      // Members state'ini en son hal ile güncelle
      setMembers(filteredMembers);
    } catch (e) {
      console.error('Üyeler yüklenirken hata:', e);
      toast.showError('Üyeler yüklenirken bir hata oluştu');
    } finally {
      setLoadingMembers(false);
    }
  };



  const handleRowChange = useCallback((id: string, field: keyof PaymentRow, value: any) => {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id === id) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  }, []);

  // Filtrelenmiş satırları hesapla (useMemo ile optimize edildi)
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesRegistrationNumber = !debouncedFilters.registrationNumber ||
        row.registrationNumber.toLowerCase().includes(debouncedFilters.registrationNumber.toLowerCase());
      const matchesName = !debouncedFilters.name ||
        `${row.firstName} ${row.lastName}`.toLowerCase().includes(debouncedFilters.name.toLowerCase());
      const matchesNationalId = !debouncedFilters.nationalId ||
        row.nationalId.includes(debouncedFilters.nationalId);
      const matchesTevkifatCenter = !debouncedFilters.tevkifatCenter ||
        row.tevkifatCenter.toLowerCase().includes(debouncedFilters.tevkifatCenter.toLowerCase());
      const matchesProvince = !debouncedFilters.province ||
        (row.provinceName || '').toLowerCase().includes(debouncedFilters.province.toLowerCase());

      return matchesRegistrationNumber && matchesName && matchesNationalId && matchesTevkifatCenter && matchesProvince;
    });
  }, [rows, debouncedFilters]);

  // Pagination için sayfalanmış satırlar (useMemo ile optimize edildi)
  const paginatedRows = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredRows.slice(startIndex, endIndex);
  }, [filteredRows, page, rowsPerPage]);

  const validateRow = (row: PaymentRow): string | null => {
    if (!row.memberId) {
      return 'Üye seçilmelidir';
    }
    if (!row.amount || parseFloat(row.amount) <= 0) {
      return 'Geçerli bir tutar girilmelidir';
    }
    return null;
  };

  const handleSave = useCallback(async () => {
    // Para eklenen satırları kaydet
    const rowsToSave = rows.filter(
      (r) => r.status === 'DRAFT' && r.amount && parseFloat(r.amount) > 0 && r.memberId
    );

    if (rowsToSave.length === 0) {
      toast.showError('Kaydedilecek Kesinti bulunamadı. Lütfen en az bir üye için tutar girin.');
      return;
    }

    await saveRows(rowsToSave);
  }, [rows, toast]);

  const saveRows = async (rowsToSave: PaymentRow[]) => {
    // Validasyon
    const errors: string[] = [];
    rowsToSave.forEach((row, index) => {
      const error = validateRow(row);
      if (error) {
        errors.push(`Satır ${index + 1}: ${error}`);
      }
    });

    if (errors.length > 0) {
      toast.showError(errors.join('\n'));
      return;
    }

    setSaving(true);
    try {
      // Tevkifat merkezi kontrolü
      const rowsWithMissingCenter: number[] = [];
      const rowsWithMissingCenterInfo: Array<{ rowNumber: number; memberName: string }> = [];
      
      rowsToSave.forEach((row, index) => {
        const member = row.member || members.find((m) => m.id === row.memberId);
        const tevkifatCenterId = member?.tevkifatCenter?.id;
        
        if (!tevkifatCenterId) {
          rowsWithMissingCenter.push(index + 1);
          rowsWithMissingCenterInfo.push({
            rowNumber: index + 1,
            memberName: member ? `${member.firstName} ${member.lastName}` : 'Bilinmeyen Üye',
          });
        }
      });

      if (rowsWithMissingCenter.length > 0) {
        const errorMessage = rowsWithMissingCenterInfo
          .map((info) => `Satır ${info.rowNumber}: ${info.memberName} - Tevkifat merkezi tanımlı değil`)
          .join('\n');
        toast.showError(errorMessage);
        setSaving(false);
        return;
      }

      // Yeni Kesintiler için aynı ay/yıl kontrolü yap; mevcut Kesintiyi göster/güncelle dialog'u aç
      const newPaymentRows = rowsToSave.filter((r) => !r.paymentId);
      const rowsWithExistingPayments: Array<{ row: PaymentRow; existingPayment: MemberPayment }> = [];
      
      if (newPaymentRows.length > 0) {
        try {
          const existingPayments = await getPayments({
            year: filters.year,
            month: filters.month,
            isApproved: true,
          });

          for (const row of newPaymentRows) {
            const existingPayment = existingPayments.find(
              (p) => p.memberId === row.memberId
            );
            if (existingPayment) {
              rowsWithExistingPayments.push({ row, existingPayment });
            }
          }
        } catch (e) {
          console.error('Kesintiler kontrol edilirken hata:', e);
        }
      }

      const rowsToSkip: Set<string> = new Set();
      
      if (rowsWithExistingPayments.length > 0) {
        for (const { row, existingPayment } of rowsWithExistingPayments) {
          const member = row.member || members.find((m) => m.id === row.memberId);
          const memberName = member ? `${member.firstName} ${member.lastName}` : 'Bilinmeyen Üye';
          
          const shouldContinue = await new Promise<boolean>((resolve) => {
            setDuplicatePaymentDialog({
              open: true,
              memberName,
              memberId: row.memberId!,
              rowId: row.id,
              existingPayment,
              onConfirm: () => {
                setDuplicatePaymentDialog((prev) => ({ ...prev, open: false, existingPayment: null }));
                resolve(true);
              },
              onCancel: () => {
                setDuplicatePaymentDialog((prev) => ({ ...prev, open: false, existingPayment: null }));
                resolve(false);
              },
            });
          });

          if (!shouldContinue) {
            rowsToSkip.add(row.id);
          }
        }
      }

      // İptal edilen satırları filtrele
      const finalRowsToSave = rowsToSave.filter((r) => !rowsToSkip.has(r.id));
      
      if (finalRowsToSave.length === 0) {
        toast.showInfo('Tüm satırlar iptal edildi');
        setSaving(false);
        return;
      }

      const promises = finalRowsToSave.map(async (row) => {
        // Üyenin tevkifat merkezini al
        const member = row.member || members.find((m) => m.id === row.memberId);
        const tevkifatCenterId = member?.tevkifatCenter?.id;

        // Eğer paymentId varsa güncelleme, yoksa yeni oluşturma
        if (row.paymentId) {
          // Güncelleme
          const updatePayload: UpdateMemberPaymentDto = {
            memberId: row.memberId!,
            paymentPeriodMonth: filters.month,
            paymentPeriodYear: filters.year,
            amount: row.amount,
            paymentType: row.paymentType,
            tevkifatCenterId: tevkifatCenterId!,
            description: undefined,
          };
          return updatePayment(row.paymentId, updatePayload);
        } else {
          // Yeni oluşturma
          const createPayload: CreateMemberPaymentDto = {
            memberId: row.memberId!,
            paymentPeriodMonth: filters.month,
            paymentPeriodYear: filters.year,
            amount: row.amount,
            paymentType: row.paymentType,
            tevkifatCenterId: tevkifatCenterId!,
            description: undefined,
          };
          return createPayment(createPayload);
        }
      });

      const results = await Promise.all(promises);

      // Başarılı satırları güncelle ve paymentId'yi sakla (functional update ile optimize edildi)
      setRows((prevRows) =>
        prevRows.map((row) => {
          const savedRowIndex = finalRowsToSave.findIndex((r) => r.id === row.id);
          if (savedRowIndex !== -1) {
            const savedPayment = results[savedRowIndex];
            return { 
              ...row, 
              status: 'SAVED' as const,
              paymentId: savedPayment.id, // Payment ID'yi sakla
            };
          }
          return row;
        })
      );

      toast.showSuccess(`${finalRowsToSave.length} Kesinti başarıyla kaydedildi`);
    } catch (e: unknown) {
      console.error('Kesintiler kaydedilirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Kesintiler kaydedilirken bir hata oluştu'));
    } finally {
      setSaving(false);
    }
  };

  if (!canView) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">Bu sayfaya erişim yetkiniz bulunmamaktadır.</Alert>
      </Box>
    );
  }

  // Optimize edilmiş hesaplamalar (useMemo ile)
  const draftRows = useMemo(() => rows.filter((r) => r.status === 'DRAFT'), [rows]);
  const savedRows = useMemo(() => rows.filter((r) => r.status === 'SAVED'), [rows]);
  
  // Para eklenen üyeler (tutar girilmiş ve üye seçilmiş satırlar)
  const rowsWithAmount = useMemo(() => {
    return rows.filter(
      (r) => r.status === 'DRAFT' && r.amount && parseFloat(r.amount) > 0 && r.memberId
    );
  }, [rows]);
  
  const totalAmount = useMemo(() => {
    return rowsWithAmount.reduce((sum, row) => sum + parseFloat(row.amount || '0'), 0);
  }, [rowsWithAmount]);

  // Tevkifat merkezi bazlı özet (para eklenen üyeler için)
  const tevkifatCenterSummaries = useMemo(() => {
    const map = new Map<
      string,
      {
        tevkifatCenter: string;
        count: number;
        total: number;
      }
    >();

    rowsWithAmount.forEach((row) => {
      const key = row.tevkifatCenter || 'Tevkifat merkezi yok';
      const existing = map.get(key);
      const amount = parseFloat(row.amount || '0') || 0;

      if (existing) {
        existing.count += 1;
        existing.total += amount;
      } else {
        map.set(key, {
          tevkifatCenter: key,
          count: 1,
          total: amount,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.tevkifatCenter.localeCompare(b.tevkifatCenter, 'tr')
    );
  }, [rowsWithAmount]);

  // Tablodaki satırlara göre tevkifat merkezi bazlı özet (tüm satırlar için)
  const tevkifatCenterRowSummaries = useMemo(() => {
    const map = new Map<
      string,
      {
        tevkifatCenter: string;
        count: number;
      }
    >();

    rows.forEach((row) => {
      const key = row.tevkifatCenter || 'Tevkifat merkezi yok';
      const existing = map.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          tevkifatCenter: key,
          count: 1,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.tevkifatCenter.localeCompare(b.tevkifatCenter, 'tr')
    );
  }, [rows]);

  // Tek satırın tutarını temizle
  const handleClearAmount = useCallback((rowId: string) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              amount: '',
            }
          : row
      )
    );
  }, []);

  // Belirli bir tevkifat merkezine ait tüm satırların tutarını temizle
  const handleClearTevkifatCenterAmounts = useCallback((tevkifatCenterName: string) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        (row.tevkifatCenter || 'Tevkifat merkezi yok') === tevkifatCenterName
          ? {
              ...row,
              amount: '',
            }
          : row
      )
    );
  }, []);

  // Belirli bir tevkifat merkezine ait tüm satırları tamamen kaldır
  const handleRemoveTevkifatCenterRows = useCallback(
    (tevkifatCenterName: string) => {
      setRows((prevRows) =>
        prevRows.filter(
          (row) => (row.tevkifatCenter || 'Tevkifat merkezi yok') !== tevkifatCenterName
        )
      );

      const summary = tevkifatCenterRowSummaries.find(
        (s) => s.tevkifatCenter === tevkifatCenterName
      );
      if (summary && summary.count > 0) {
        toast.showInfo(
          `${summary.count} adet "${tevkifatCenterName}" tevkifat merkezine ait satır kaldırıldı.`
        );
      }
    },
    [tevkifatCenterRowSummaries, toast]
  );

  // Tüm para eklenen üyeleri temizle
  const handleClearAllAmounts = useCallback(() => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.amount && parseFloat(row.amount) > 0
          ? {
              ...row,
              amount: '',
            }
          : row
      )
    );
  }, []);

  return (
    <PageLayout>
      <PageHeader
        icon={<PaymentIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Kesinti Girişi"
        description={`Toplu Kesinti girişi ve yönetimi • ${rows.length} satır (${draftRows.length} taslak, ${savedRows.length} kaydedildi)`}
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
      />

      {/* Kullanım İpuçları kaldırıldı */}

      {/* Filtreler */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SearchIcon sx={{ fontSize: '1.25rem', color: '#fff' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                Filtreler ve Üye Seçimi
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                İl seçerek tevkifat merkezlerini daraltın; ardından merkez ve dönem seçin
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end', mb: 3 }}>
            <FormControl size="medium" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
              <InputLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarMonthIcon fontSize="small" />
                  Yıl
                </Box>
              </InputLabel>
              <Select
                value={filters.year}
                label="Yıl"
                onChange={(e) => setFilters({ ...filters, year: Number(e.target.value) })}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="medium" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
              <InputLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarMonthIcon fontSize="small" />
                  Ay
                </Box>
              </InputLabel>
              <Select
                value={filters.month}
                label="Ay"
                onChange={(e) => setFilters({ ...filters, month: Number(e.target.value) })}
              >
                {monthNames.map((month, index) => (
                  <MenuItem key={index} value={index + 1}>
                    {month}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              size="medium"
              sx={{ minWidth: { xs: '100%', sm: 220 }, flexShrink: 0 }}
              options={provinces}
              getOptionLabel={(p) => p.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              filterOptions={(options, state) => {
                const q = state.inputValue.trim().toLocaleLowerCase('tr');
                if (!q) return options;
                return options.filter((p) => p.name.toLocaleLowerCase('tr').includes(q));
              }}
              value={provinces.find((p) => p.id === filters.provinceId) ?? null}
              onChange={(_, v) => setFilters({ ...filters, provinceId: v?.id ?? '' })}
              clearOnEscape
              noOptionsText="Eşleşen il yok"
              renderInput={(params) => (
                <TextField {...params} label="İl" placeholder="Tüm iller" />
              )}
            />

            <Autocomplete
              size="medium"
              sx={{ minWidth: { xs: '100%', sm: 250 }, flexGrow: 1 }}
              options={tevkifatCenters}
              getOptionLabel={(c) => c.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              filterOptions={(options, state) => {
                const q = state.inputValue.trim().toLocaleLowerCase('tr');
                if (!q) return options;
                return options.filter((c) => c.name.toLocaleLowerCase('tr').includes(q));
              }}
              value={tevkifatCenters.find((c) => c.id === filters.tevkifatCenterId) ?? null}
              onChange={(_, v) => setFilters({ ...filters, tevkifatCenterId: v?.id ?? '' })}
              noOptionsText="Eşleşen merkez yok"
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label={
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <BusinessIcon sx={{ fontSize: '1.125rem', verticalAlign: 'middle' }} />
                      Tevkifat Merkezi
                    </Box>
                  }
                  placeholder={
                    filters.provinceId
                      ? 'Bu il için merkez ara / seç'
                      : 'Merkez ara / seç'
                  }
                />
              )}
            />

            <Button
              variant="outlined"
              onClick={() => loadMembers()}
              disabled={loadingMembers || !filters.tevkifatCenterId}
              startIcon={loadingMembers ? <CircularProgress size={18} /> : <CheckCircleIcon />}
              sx={{
                minWidth: { xs: '100%', sm: 170 },
                height: 56,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              Üyeleri Getir
            </Button>
          </Box>
          {!filters.tevkifatCenterId && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Önce bir tevkifat merkezi seçin; ardından üyeleri getirin.
            </Alert>
          )}
        </Box>
      </Card>

      {/* Tablo ve İşlemler */}
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
        {/* Üst Bilgi */}
        <Box
          sx={{
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Chip
            label={`${rows.length} satır • ${draftRows.length} taslak • ${savedRows.length} kaydedildi • ${filteredRows.length} görüntüleniyor`}
            size="small"
            sx={{
              alignSelf: 'flex-start',
              fontWeight: 600,
              fontSize: '0.75rem',
              bgcolor: alpha(theme.palette.info.main, 0.08),
              color: 'text.primary',
            }}
          />

          {tevkifatCenterRowSummaries.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              {tevkifatCenterRowSummaries.map((item) => (
                <Box
                  key={item.tevkifatCenter}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.75,
                    py: 0.65,
                    borderRadius: 999,
                    background: alpha(theme.palette.primary.main, 0.12),
                    boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}`,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontSize: '0.8rem', fontWeight: 600, color: theme.palette.primary.dark }}
                  >
                    {item.count} {item.tevkifatCenter} üyesi listeleniyor
                  </Typography>
                  <Tooltip
                    title={`"${item.tevkifatCenter}" tevkifat merkezine ait tüm satırları kaldır`}
                  >
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveTevkifatCenterRows(item.tevkifatCenter)}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        ×
                      </Typography>
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Tablo */}
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', fontSize: '0.8125rem' }}>Üye Kayıt No</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', fontSize: '0.8125rem' }}>Ad Soyad</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', fontSize: '0.8125rem' }}>TC Kimlik No</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', fontSize: '0.8125rem' }}>Tevkifat Merkezi</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', fontSize: '0.8125rem' }}>İl</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', fontSize: '0.8125rem' }}>Kesinti Tutarı</TableCell>
              </TableRow>
              {/* Filtre Satırı */}
              <TableRow>
                <TableCell sx={{ bgcolor: alpha(theme.palette.grey[100], 0.5), p: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Filtrele..."
                    value={tableFilters.registrationNumber}
                    onChange={(e) => setTableFilters({ ...tableFilters, registrationNumber: e.target.value })}
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.75rem' } }}
                  />
                </TableCell>
                <TableCell sx={{ bgcolor: alpha(theme.palette.grey[100], 0.5), p: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Filtrele..."
                    value={tableFilters.name}
                    onChange={(e) => setTableFilters({ ...tableFilters, name: e.target.value })}
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.75rem' } }}
                  />
                </TableCell>
                <TableCell sx={{ bgcolor: alpha(theme.palette.grey[100], 0.5), p: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Filtrele..."
                    value={tableFilters.nationalId}
                    onChange={(e) => setTableFilters({ ...tableFilters, nationalId: e.target.value })}
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.75rem' } }}
                  />
                </TableCell>
                <TableCell sx={{ bgcolor: alpha(theme.palette.grey[100], 0.5), p: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Filtrele..."
                    value={tableFilters.tevkifatCenter}
                    onChange={(e) => setTableFilters({ ...tableFilters, tevkifatCenter: e.target.value })}
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.75rem' } }}
                  />
                </TableCell>
                <TableCell sx={{ bgcolor: alpha(theme.palette.grey[100], 0.5), p: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Filtrele..."
                    value={tableFilters.province}
                    onChange={(e) => setTableFilters({ ...tableFilters, province: e.target.value })}
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.75rem' } }}
                  />
                </TableCell>
                <TableCell sx={{ bgcolor: alpha(theme.palette.grey[100], 0.5) }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {rows.length === 0 
                        ? 'Henüz satır eklenmedi. Üstteki butonlardan birine tıklayarak üyeleri getirin.'
                        : 'Filtre kriterlerine uygun satır bulunamadı.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => {
                  const isSaved = row.status === 'SAVED';
                  return (
                    <TableRow
                      key={row.id}
                      sx={{
                        bgcolor: isSaved ? alpha(theme.palette.success.main, 0.06) : 'transparent',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.02),
                        },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {row.registrationNumber || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {row.firstName} {row.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {row.nationalId || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {row.tevkifatCenter || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {row.provinceName || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {isSaved ? (
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: theme.palette.success.main,
                              fontSize: '0.875rem',
                            }}
                          >
                            ₺{parseFloat(row.amount || '0').toFixed(2)}
                          </Typography>
                        ) : (
                          <TextField
                            size="small"
                            type="number"
                            value={row.amount}
                            onChange={(e) => handleRowChange(row.id, 'amount', e.target.value)}
                            placeholder="0.00"
                            inputProps={{ min: 0, step: 0.01 }}
                            sx={{ minWidth: 120 }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {filteredRows.length > 0 && (
          <TablePagination
            component="div"
            count={filteredRows.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100, 200]}
            labelRowsPerPage="Sayfa başına satır:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
            sx={{
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontSize: '0.875rem',
              },
            }}
          />
        )}
      </Card>

      {/* Para Eklenen Üyeler Bölümü */}
      {rowsWithAmount.length > 0 && (
        <Card
          elevation={0}
          sx={{
            mt: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.04)}`,
            overflow: 'hidden',
            background: '#fff',
          }}
        >
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PaymentIcon sx={{ fontSize: '1.25rem', color: '#fff' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                  Para Eklenen Üyeler
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}
                >
                  {rowsWithAmount.length} üye • Toplam: ₺{totalAmount.toFixed(2)}
                </Typography>
              </Box>
              <Box>
                <Tooltip title="Tüm para eklenen üyelerdeki tutarları temizler">
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={handleClearAllAmounts}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                    }}
                  >
                    Tümünü Temizle
                  </Button>
                </Tooltip>
              </Box>
            </Box>

            {/* Tevkifat Merkezi Bazlı Özet */}
            {tevkifatCenterSummaries.length > 0 && (
              <Box
                sx={{
                  mb: 2.5,
                  p: 1.5,
                  borderRadius: 2,
                  background: alpha(theme.palette.success.main, 0.03),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}
                >
                  Tevkifat Merkezi Bazlı Özet
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  {tevkifatCenterSummaries.map((item) => (
                    <Box
                      key={item.tevkifatCenter}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.25,
                        py: 0.75,
                        borderRadius: 999,
                        background: alpha(theme.palette.success.main, 0.06),
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        {item.tevkifatCenter}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: '0.8rem', color: 'text.secondary' }}
                      >
                        {item.count} üye • ₺{item.total.toFixed(2)}
                      </Typography>
                      <Tooltip title="Bu tevkifat merkezine ait satırlardaki tutarları temizle">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() =>
                            handleClearTevkifatCenterAmounts(item.tevkifatCenter)
                          }
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            ×
                          </Typography>
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', fontSize: '0.8125rem' }}>Üye Kayıt No</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', fontSize: '0.8125rem' }}>Ad Soyad</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', fontSize: '0.8125rem' }}>TC Kimlik No</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', fontSize: '0.8125rem' }}>Tevkifat Merkezi</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', fontSize: '0.8125rem' }} align="right">Tutar</TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        bgcolor: 'background.paper',
                        fontSize: '0.8125rem',
                        textAlign: 'center',
                      }}
                    >
                      İşlemler
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rowsWithAmount.map((row) => (
                    <TableRow
                      key={row.id}
                      sx={{
                        bgcolor: alpha(theme.palette.success.main, 0.04),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.success.main, 0.08),
                        },
                      }}
                    >
                      <TableCell>{row.registrationNumber || '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {row.firstName} {row.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.nationalId || '-'}</TableCell>
                      <TableCell>{row.tevkifatCenter || '-'}</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: theme.palette.success.main,
                            fontSize: '0.875rem',
                          }}
                        >
                          ₺{parseFloat(row.amount || '0').toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Bu satırdaki tutarı temizle">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleClearAmount(row.id)}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              ×
                            </Typography>
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Kaydet Butonu - sağa hizalı */}
            <Box
              sx={{
                mt: 2.5,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                variant="contained"
                color="success"
                size="medium"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving || rowsWithAmount.length === 0}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  px: 3,
                  py: 1,
                  minWidth: 180,
                }}
              >
                {saving ? 'Kaydediliyor...' : `Kaydet (${rowsWithAmount.length} Kesinti)`}
              </Button>
            </Box>
          </Box>
        </Card>
      )}

      {/* Aynı Ay Kesinti Mevcut: Kesinti bilgilerini göster ve güncelle */}
      <Dialog
        open={duplicatePaymentDialog.open}
        onClose={() => {
          duplicatePaymentDialog.onCancel?.();
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PaymentIcon sx={{ fontSize: '1.5rem', color: '#fff' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                Mevcut Kesinti Bilgisi
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                <strong>{duplicatePaymentDialog.memberName}</strong> — {filters.year} yılı {monthNames[filters.month - 1]} ayı
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Bu dönem için kayıtlı Kesinti aşağıdadır. Bilgileri güncelleyip kaydedebilir veya iptal edebilirsiniz.
          </Alert>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tutar"
              type="number"
              value={duplicateDialogEditForm.amount}
              onChange={(e) =>
                setDuplicateDialogEditForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              inputProps={{ min: 0, step: '0.01' }}
              fullWidth
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Kesinti Türü</InputLabel>
              <Select
                value={duplicateDialogEditForm.paymentType}
                label="Kesinti Türü"
                onChange={(e) =>
                  setDuplicateDialogEditForm((prev) => ({
                    ...prev,
                    paymentType: e.target.value as PaymentType,
                  }))
                }
              >
                {(Object.entries(paymentTypeLabels) as Array<[PaymentType, string]>).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Tevkifat Merkezi</InputLabel>
              <Select
                value={duplicateDialogEditForm.tevkifatCenterId}
                label="Tevkifat Merkezi"
                onChange={(e) =>
                  setDuplicateDialogEditForm((prev) => ({
                    ...prev,
                    tevkifatCenterId: e.target.value,
                  }))
                }
              >
                {duplicateDialogTevkifatCenters.map((center) => (
                  <MenuItem key={center.id} value={center.id}>
                    {center.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Açıklama"
              value={duplicateDialogEditForm.description}
              onChange={(e) =>
                setDuplicateDialogEditForm((prev) => ({ ...prev, description: e.target.value }))
              }
              fullWidth
              size="small"
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button
            onClick={() => {
              duplicatePaymentDialog.onCancel?.();
            }}
            variant="outlined"
            disabled={duplicateDialogSaving}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            İptal Et
          </Button>
          <Button
            onClick={async () => {
              const payment = duplicatePaymentDialog.existingPayment;
              if (!payment) return;
              const { amount, paymentType, tevkifatCenterId, description } = duplicateDialogEditForm;
              if (!amount || parseFloat(amount) <= 0) {
                toast.showWarning('Lütfen geçerli bir tutar girin.');
                return;
              }
              if (!tevkifatCenterId) {
                toast.showWarning('Lütfen tevkifat merkezi seçin.');
                return;
              }
              setDuplicateDialogSaving(true);
              try {
                await updatePayment(payment.id, {
                  amount,
                  paymentType,
                  tevkifatCenterId: tevkifatCenterId || undefined,
                  description: description || undefined,
                });
                // Satırı kayıtlı yap: Para eklenen üyelerden çıksın, tabloda son değerle kayıtlı görünsün
                const rowId = duplicatePaymentDialog.rowId;
                setRows((prev) =>
                  prev.map((r) =>
                    r.id === rowId
                      ? {
                          ...r,
                          status: 'SAVED' as const,
                          paymentId: payment.id,
                          amount,
                          paymentType,
                        }
                      : r
                  )
                );
                toast.showSuccess('Kesinti bilgisi güncellendi.');
                duplicatePaymentDialog.onCancel?.();
              } catch (e: unknown) {
                toast.showError(getApiErrorMessage(e, 'Kesinti güncellenirken bir hata oluştu'));
              } finally {
                setDuplicateDialogSaving(false);
              }
            }}
            variant="contained"
            color="primary"
            disabled={duplicateDialogSaving}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            {duplicateDialogSaving ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

    </PageLayout>
  );
};

export default QuickPaymentEntryPage;

