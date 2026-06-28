// src/pages/members/MemberApplicationCreatePage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid,
  TextField,
  Button,
  useTheme,
  useMediaQuery,
  alpha,
  InputAdornment,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  FormHelperText,
  Autocomplete,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import PlaceIcon from '@mui/icons-material/Place';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WorkIcon from '@mui/icons-material/Work';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SchoolIcon from '@mui/icons-material/School';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import ErrorIcon from '@mui/icons-material/Error';

import { useAuth } from '../../../app/providers/AuthContext';
import { useSystemSettings } from '../../../app/providers/SystemSettingsContext';
import { createMemberApplication, checkCancelledMemberByNationalId } from '../services/membersApi';
import { uploadMemberDocument } from '../../documents/services/documentsApi';
import httpClient from '../../../shared/services/httpClient';
import type { MemberDetail } from '../../../types/member';
import type {
  Province,
  District,
} from '../../../types/region';
import {
  getProvinces,
  getDistricts,
  getUserScopes,
} from '../../regions/services/regionsApi';
import { getRoles } from '../../roles/services/rolesApi';
import { getBranches } from '../../regions/services/branchesApi';
import { getInstitutions } from '../../regions/services/institutionsApi';
import { getTevkifatCenters, getTevkifatTitles } from '../../accounting/services/accountingApi';
import { getProfessions } from '../../professions/services/professionsApi';
import { getMemberGroups } from '../../system/services/memberGroupsApi';
import type { CustomRole } from '../../../types/role';
import type { Branch } from '../../regions/services/branchesApi';
import type { Institution } from '../../regions/services/institutionsApi';
import type { Profession } from '../../professions/services/professionsApi';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const MemberApplicationCreatePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, user } = useAuth();
  const { getSettingValue } = useSystemSettings();

  // Başvuru zorunlu alanları – Sistem Ayarları > Üyelik’ten okunur
  const requireMotherName = getSettingValue('MEMBERSHIP_REQUIRE_MOTHER_NAME') === 'true';
  const requireFatherName = getSettingValue('MEMBERSHIP_REQUIRE_FATHER_NAME') === 'true';
  const requireBirthplace = getSettingValue('MEMBERSHIP_REQUIRE_BIRTHPLACE') === 'true';
  const requireGender = getSettingValue('MEMBERSHIP_REQUIRE_GENDER') === 'true';
  const requireEducation = getSettingValue('MEMBERSHIP_REQUIRE_EDUCATION') === 'true';
  const requirePhone = getSettingValue('MEMBERSHIP_REQUIRE_PHONE') === 'true';
  const requireEmail = getSettingValue('MEMBERSHIP_REQUIRE_EMAIL') === 'true';
  const requireWorkUnit = getSettingValue('MEMBERSHIP_REQUIRE_WORK_UNIT') === 'true';
  const requireInstitutionRegNo = getSettingValue('MEMBERSHIP_REQUIRE_INSTITUTION_REG_NO') === 'true';

  const canCreateApplication = hasPermission('MEMBER_CREATE_APPLICATION');
  const canUploadDocuments = hasPermission('DOCUMENT_UPLOAD');
  const hasMemberListByProvince = hasPermission('MEMBER_LIST_BY_PROVINCE');
  const hasMemberList = hasPermission('MEMBER_LIST');

  const searchParams = new URLSearchParams(location.search);
  const prefillNationalId = (searchParams.get('nationalId') ?? '').replace(/\D/g, '').slice(0, 11);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [checkingNationalId, setCheckingNationalId] = useState(false);
  const [cancelledMemberDialogOpen, setCancelledMemberDialogOpen] = useState(false);
  /** 'info' = TC girildiğinde sadece bilgi (Tamam), 'confirm_submit' = Kaydet tıklandığında onay (Vazgeç + Başvuruyu Gönder) */
  const [cancelledMemberDialogMode, setCancelledMemberDialogMode] = useState<'info' | 'confirm_submit'>('info');
  const [cancelledMember, setCancelledMember] = useState<MemberDetail | null>(null);
  const [previousCancelledMemberId, setPreviousCancelledMemberId] = useState<string | undefined>(undefined);

  const [form, setForm] = useState<{
    // Kişisel Bilgiler
    firstName: string;
    lastName: string;
    nationalId: string;
    phone: string;
    email: string;
    motherName: string;
    fatherName: string;
    birthDate: string;
    birthplace: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    educationStatus: 'PRIMARY' | 'HIGH_SCHOOL' | 'COLLEGE';
    // Bölge Bilgileri (Kayıtlı olduğu yer - ikamet)
    provinceId: string;
    districtId: string;
    institutionId: string;
    // Şube ve Tevkifat (branchId seçmeli)
    branchId: string;
    tevkifatCenterId: string;
    tevkifatTitle: string;
    // Üye Grubu
    memberGroupId: string;
    // Kurum Detay Bilgileri
    dutyUnit: string;
    institutionAddress: string;
    institutionProvinceId: string;
    institutionDistrictId: string;
    professionId: string;
    institutionRegNo: string;
    staffTitleCode: string;
  }>({
    firstName: '',
    lastName: '',
    nationalId: prefillNationalId,
    phone: '',
    email: '',
    motherName: '',
    fatherName: '',
    birthDate: '',
    birthplace: '',
    gender: '',
    educationStatus: '',
    provinceId: '',
    districtId: '',
    institutionId: '',
    branchId: '',
    tevkifatCenterId: '',
    tevkifatTitle: '',
    memberGroupId: '',
    dutyUnit: '',
    institutionAddress: '',
    institutionProvinceId: '',
    institutionDistrictId: '',
    professionId: '',
    institutionRegNo: '',
    staffTitleCode: '',
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [provinces, setProvinces] = useState<Province[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [districts, setDistricts] = useState<District[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [tevkifatCenters, setTevkifatCenters] = useState<Array<{ id: string; name: string; title: string | null }>>([]);
  const [tevkifatTitles, setTevkifatTitles] = useState<Array<{ id: string; name: string; isActive: boolean }>>([]);
  const [memberGroups, setMemberGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [institutionProvinces, setInstitutionProvinces] = useState<Province[]>([]);
  const [institutionDistricts, setInstitutionDistricts] = useState<District[]>([]);
  const [provinceDisabled, setProvinceDisabled] = useState(false);
  const [districtDisabled, setDistrictDisabled] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  // Her dosya için özel ad ve tip (index bazlı)
  const [fileNames, setFileNames] = useState<Record<number, string>>({});
  const [fileTypes, setFileTypes] = useState<Record<number, string>>({});
  // Validation states
  const [nationalIdError, setNationalIdError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const data = await getProvinces();
        
        // Eğer kullanıcının sadece MEMBER_LIST_BY_PROVINCE izni varsa, role'ünden provinceId/districtId'yi al
        if (hasMemberListByProvince && !hasMemberList && user?.roles) {
          try {
            const allRoles = await getRoles();
            const userRoleNames = user.roles || [];
            let userDistrictId: string | null = null;
            let userProvinceId: string | null = null;

            for (const roleName of userRoleNames) {
              const role = allRoles.find((r): r is CustomRole => 'id' in r && r.name === roleName);
              if (role && role.permissions.includes('MEMBER_LIST_BY_PROVINCE')) {
                if (role.districtId) {
                  userDistrictId = role.districtId;
                  userProvinceId = role.provinceId || null;
                  break;
                } else if (role.provinceId) {
                  userProvinceId = role.provinceId;
                  break;
                }
              }
            }

            if (!userProvinceId && user?.id) {
              const scopes = await getUserScopes(user.id);
              const scope = Array.isArray(scopes) ? scopes[0] : scopes;
              if (scope?.district?.id) {
                userDistrictId = scope.district.id;
                userProvinceId = scope.province?.id || null;
              } else if (scope?.province?.id) {
                userProvinceId = scope.province.id;
              }
            }

            if (userProvinceId) {
              const allowedProvince = data.find(p => p.id === userProvinceId);
              if (allowedProvince) {
                setProvinces([allowedProvince]);
                setForm((prev) => ({ ...prev, provinceId: userProvinceId! }));
                setProvinceDisabled(true);

                if (userDistrictId) {
                  const districtsData = await getDistricts(userProvinceId);
                  const allowedDistrict = districtsData.find(d => d.id === userDistrictId);
                  if (allowedDistrict) {
                    setDistricts([allowedDistrict]);
                    setForm((prev) => ({ ...prev, districtId: userDistrictId! }));
                    setDistrictDisabled(true);
                  }
                }
              } else {
                setProvinces([]);
              }
            } else {
              setProvinces([]);
            }
          } catch (error: unknown) {
            console.error('User role/scope alınırken hata:', error);
            setProvinces([]);
          }
        } else {
          setProvinces(data);
        }
      } catch (e) {
        console.error('İller alınırken hata:', e);
      }
    };
    loadProvinces();
  }, [hasMemberListByProvince, hasMemberList, user?.id, user?.roles]);

  // Şubeleri yükle
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await getBranches({ isActive: true });
        setBranches(data);
      } catch (e) {
        console.error('Şubeler alınırken hata:', e);
      }
    };
    loadBranches();
  }, []);

  // Kurumları yükle
  const loadInstitutions = useCallback(async () => {
    try {
      const data = await getInstitutions();
      // Tüm kurumları göster (aktif ve pasif)
      setInstitutions(data);
    } catch (e) {
      console.error('Kurumlar alınırken hata:', e);
    }
  }, []);

  useEffect(() => {
    loadInstitutions();
  }, [loadInstitutions]);

  // Tevkifat merkezlerini yükle
  useEffect(() => {
    const loadTevkifatCenters = async () => {
      try {
        const data = await getTevkifatCenters({ activeOnly: true });
        setTevkifatCenters(data.map(c => ({ id: c.id, name: c.name, title: (c as any).title ?? null })));
      } catch (e) {
        console.error('Tevkifat merkezleri yüklenirken hata:', e);
      }
    };
    loadTevkifatCenters();
  }, []);

  // Tevkifat unvanlarını yükle
  useEffect(() => {
    const loadTevkifatTitles = async () => {
      try {
        const data = await getTevkifatTitles();
        const activeTitles = data.filter(t => t.isActive);
        setTevkifatTitles(activeTitles);
      } catch (e) {
        console.error('Tevkifat unvanları yüklenirken hata:', e);
      }
    };
    loadTevkifatTitles();
  }, []);

  // Üye gruplarını yükle
  useEffect(() => {
    const loadMemberGroups = async () => {
      try {
        const data = await getMemberGroups();
        setMemberGroups(data || []);
      } catch (e) {
        console.error('Üye grupları yüklenirken hata:', e);
      }
    };
    loadMemberGroups();
  }, []);

  // Meslek/Unvanları yükle
  useEffect(() => {
    const loadProfessions = async () => {
      try {
        const data = await getProfessions();
        setProfessions(data);
      } catch (e) {
        console.error('Meslek/Unvanlar yüklenirken hata:', e);
      }
    };
    loadProfessions();
  }, []);

  // Kurum İli için illeri yükle (tüm iller)
  useEffect(() => {
    const loadInstitutionProvinces = async () => {
      try {
        const data = await getProvinces();
        setInstitutionProvinces(data);
      } catch (e) {
        console.error('Kurum illeri yüklenirken hata:', e);
      }
    };
    loadInstitutionProvinces();
  }, []);

  // Kurum İli değiştiğinde ilçeleri yükle
  useEffect(() => {
    const loadForInstitutionProvince = async () => {
      const provinceId = form.institutionProvinceId;
      if (!provinceId) {
        setInstitutionDistricts([]);
        return;
      }

      try {
        const dists = await getDistricts(provinceId);
        setInstitutionDistricts(dists);
      } catch (e) {
        console.error('Kurum ili değişince ilçe verisi alınırken hata:', e);
      }
    };

    loadForInstitutionProvince();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.institutionProvinceId]);



  useEffect(() => {
    const loadForProvince = async () => {
      const provinceId = form.provinceId;
      if (!provinceId) {
        setDistricts([]);
        return;
      }

      try {
        const dists = await getDistricts(provinceId);
        setDistricts(dists);
      } catch (e) {
        console.error('İl değişince ilçe verisi alınırken hata:', e);
      }
    };

    loadForProvince();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.provinceId]);

  // Bölge Bilgileri'ndeki İl/İlçe değiştiğinde Kurum İli/İlçesi'ni otomatik olarak eşitle
  useEffect(() => {
    setForm((prev) => {
      if (
        prev.institutionProvinceId === prev.provinceId &&
        prev.institutionDistrictId === prev.districtId
      ) {
        return prev;
      }
      return {
        ...prev,
        institutionProvinceId: prev.provinceId,
        institutionDistrictId: prev.districtId,
      };
    });
  }, [form.provinceId, form.districtId]);

  // Memoized utility functions
    const normalizeNationalId = useCallback((value: string) => value.replace(/\D/g, '').slice(0, 11), []);

  // Sadece harf, boşluk ve Türkçe karakterlere izin ver (sayıları engelle)
  const normalizeTextOnly = useCallback((value: string): string => {
    // Türkçe karakterler ve harfler, boşluk, tire, nokta, apostrof
    return value.replace(/[^a-zA-ZçğıöşüÇĞIİÖŞÜ\s\-\.']/g, '');
  }, []);

  // Telefon numarası formatı: +90 (507) 411 2255
  const formatPhoneNumber = useCallback((value: string): string => {
    // Sadece rakamları al
    const digits = value.replace(/\D/g, '');
    
    // Boşsa +90 döndür
    if (digits.length === 0) {
      return '+90 ';
    }
    
    // Eğer 90 ile başlamıyorsa, 90 ekle
    let phoneDigits = digits;
    if (!digits.startsWith('90')) {
      phoneDigits = '90' + digits;
    }
    
    // Maksimum 12 hane (90 + 10 hane)
    phoneDigits = phoneDigits.slice(0, 12);
    
    // +90'dan sonraki kısmı al (90'ı çıkar)
    const afterCountryCode = phoneDigits.slice(2);
    
    // Format: +90 (XXX) XXX XXXX
    if (afterCountryCode.length === 0) {
      return '+90 ';
    } else if (afterCountryCode.length <= 3) {
      return `+90 (${afterCountryCode}`;
    } else if (afterCountryCode.length <= 6) {
      return `+90 (${afterCountryCode.slice(0, 3)}) ${afterCountryCode.slice(3)}`;
    } else {
      return `+90 (${afterCountryCode.slice(0, 3)}) ${afterCountryCode.slice(3, 6)} ${afterCountryCode.slice(6, 10)}`;
    }
  }, []);

  const normalizePhoneNumber = useCallback((value: string): string => {
    // Formatı temizle, sadece rakamları al
    const digits = value.replace(/\D/g, '');
    // Boşsa boş döndür
    if (digits.length === 0) {
      return '';
    }
    // Eğer 90 ile başlamıyorsa, 90 ekle
    if (!digits.startsWith('90')) {
      return '90' + digits.slice(0, 10); // Maksimum 10 hane ekle
    }
    // Maksimum 12 hane (90 + 10 hane)
    return digits.slice(0, 12);
  }, []);

  const getPhoneError = useCallback((phone: string): string | null => {
    if (!phone || phone.trim() === '') {
      return null; // Telefon opsiyonel
    }
    const digits = phone.replace(/\D/g, '');
    // +90 ile başlamalı ve toplam 12 hane olmalı (90 + 10 hane)
    if (!digits.startsWith('90')) {
      return 'Telefon numarası +90 ile başlamalıdır.';
    }
    if (digits.length !== 12) {
      return 'Telefon numarası +90 (XXX) XXX XXXX formatında olmalıdır.';
    }
    // İlk 3 hane (90'dan sonra) 5 ile başlamalı
    if (digits[2] !== '5') {
      return 'Telefon numarası +90 (5XX) XXX XXXX formatında olmalıdır.';
    }
    return null;
  }, []);

  const getEmailError = useCallback((email: string): string | null => {
    if (!email || email.trim() === '') {
      return null; // E-posta opsiyonel
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Geçerli bir e-posta adresi giriniz.';
    }
    return null;
  }, []);

  const getNationalIdError = useCallback((nationalId: string): string | null => {
    const cleaned = nationalId.trim();
    if (!cleaned) {
      return 'TC Kimlik Numarası zorunludur.';
    }
    if (!/^\d{11}$/.test(cleaned)) {
      return 'TC Kimlik Numarası 11 haneli ve sadece rakam olmalıdır.';
    }
    return null;
  }, []);

  // TC kontrolü için debounce timer
  const checkNationalIdTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkNationalId = useCallback(async (nationalId: string) => {
    if (getNationalIdError(nationalId)) {
      return;
    }

    setCheckingNationalId(true);
    try {
      const cancelled = await checkCancelledMemberByNationalId(nationalId);
      if (cancelled) {
        setCancelledMember(cancelled);
        setPreviousCancelledMemberId(cancelled.id);
        setCancelledMemberDialogMode('info');
        setCancelledMemberDialogOpen(true);
        // Mevcut bilgilerle formu doldur (yeniden üyelik için karşılama)
        const birthDateStr = cancelled.birthDate
          ? new Date(cancelled.birthDate).toISOString().slice(0, 10)
          : '';
        setForm((prev) => ({
          ...prev,
          firstName: cancelled.firstName?.trim() ?? prev.firstName,
          lastName: cancelled.lastName?.trim() ?? prev.lastName,
          nationalId: cancelled.nationalId?.trim() ?? prev.nationalId,
          phone: cancelled.phone?.trim() ?? prev.phone,
          email: cancelled.email?.trim() ?? prev.email,
          motherName: cancelled.motherName?.trim() ?? prev.motherName,
          fatherName: cancelled.fatherName?.trim() ?? prev.fatherName,
          birthDate: birthDateStr || prev.birthDate,
          birthplace: cancelled.birthplace?.trim() ?? prev.birthplace,
          gender: (cancelled.gender as 'MALE' | 'FEMALE' | 'OTHER') || prev.gender,
          educationStatus: (cancelled.educationStatus as 'PRIMARY' | 'HIGH_SCHOOL' | 'COLLEGE') || prev.educationStatus,
          provinceId: cancelled.provinceId ?? prev.provinceId,
          districtId: cancelled.districtId ?? prev.districtId,
          institutionId: cancelled.institutionId ?? prev.institutionId,
          branchId: cancelled.branchId ?? prev.branchId,
          tevkifatCenterId: cancelled.tevkifatCenterId ?? prev.tevkifatCenterId,
          tevkifatTitle: cancelled.tevkifatTitleId ?? prev.tevkifatTitle,
          memberGroupId: cancelled.memberGroupId ?? prev.memberGroupId,
          dutyUnit: cancelled.dutyUnit?.trim() ?? prev.dutyUnit,
          institutionAddress: cancelled.institutionAddress?.trim() ?? prev.institutionAddress,
          institutionProvinceId: cancelled.institutionProvinceId ?? prev.institutionProvinceId,
          institutionDistrictId: cancelled.institutionDistrictId ?? prev.institutionDistrictId,
          professionId: cancelled.professionId ?? prev.professionId,
          institutionRegNo: cancelled.institutionRegNo?.trim() ?? prev.institutionRegNo,
          staffTitleCode: cancelled.staffTitleCode?.trim() ?? prev.staffTitleCode,
        }));
      } else {
        setCancelledMember(null);
        setPreviousCancelledMemberId(undefined);
      }
    } catch (e) {
      console.error('TC kontrolü sırasında hata:', e);
      // Hata durumunda sessizce devam et
    } finally {
      setCheckingNationalId(false);
    }
  }, [getNationalIdError]);

  // Sayfa açılırken query ile gelen TC doluysa, debounce mekanizmasına takılmadan kontrolü otomatik başlat.
  const lastPrefillCheckedNationalIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!prefillNationalId) return;
    if (prefillNationalId.length !== 11) return;
    if (lastPrefillCheckedNationalIdRef.current === prefillNationalId) return;

    const err = getNationalIdError(prefillNationalId);
    if (err) return;

    lastPrefillCheckedNationalIdRef.current = prefillNationalId;
    checkNationalId(prefillNationalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillNationalId, checkNationalId, getNationalIdError]);

  const handleChange = useCallback((field: keyof typeof form, value: string) => {
    // Eğer il/ilçe disabled ise değişikliğe izin verme
    if (field === 'provinceId' && provinceDisabled) {
      return;
    }
    if (field === 'districtId' && districtDisabled) {
      return;
    }

    let nextValue: string;
    let shouldUpdateError = false;
    let errorValue: string | null = null;

    if (field === 'nationalId') {
      nextValue = normalizeNationalId(value);
      errorValue = getNationalIdError(nextValue);
      shouldUpdateError = true;
    } else if (field === 'phone') {
      nextValue = formatPhoneNumber(value);
      const normalized = normalizePhoneNumber(nextValue);
      errorValue = getPhoneError(normalized);
      shouldUpdateError = true;
    } else if (field === 'email') {
      nextValue = value;
      errorValue = getEmailError(value);
      shouldUpdateError = true;
    } else if (field === 'firstName' || field === 'lastName' || field === 'motherName' || field === 'fatherName' || field === 'birthplace') {
      // Sadece harf ve Türkçe karakterlere izin ver (sayıları engelle)
      nextValue = normalizeTextOnly(value);
    } else {
      nextValue = value;
    }

    // Error state'leri sadece değiştiğinde güncelle
    if (shouldUpdateError) {
      if (field === 'nationalId') {
        setNationalIdError((prev) => prev !== errorValue ? errorValue : prev);
      } else if (field === 'phone') {
        setPhoneError((prev) => prev !== errorValue ? errorValue : prev);
      } else if (field === 'email') {
        setEmailError((prev) => prev !== errorValue ? errorValue : prev);
      }
    }

    setForm((prev) => {
      // Değer aynıysa re-render'ı önle
      if (prev[field] === nextValue) {
        return prev;
      }
      
      return {
        ...prev,
        [field]: nextValue,
        ...(field === 'provinceId'
          ? {
              districtId: '',
            }
          : {}),
      };
    });

    // TC kimlik numarası değiştiğinde kontrol yap (debounced)
    if (field === 'nationalId') {
      // Önceki timeout'u temizle
      if (checkNationalIdTimeoutRef.current) {
        clearTimeout(checkNationalIdTimeoutRef.current);
      }
      
      const isValidNationalId = nextValue.length === 11 && errorValue === null;
      if (isValidNationalId) {
        // 500ms debounce ile TC kontrolü yap
        checkNationalIdTimeoutRef.current = setTimeout(() => {
          checkNationalId(nextValue);
        }, 500);
      } else {
        // Geçerli bir TC olmadan iptal edilmiş üye kontrolü yapma
        setCancelledMember(null);
        setPreviousCancelledMemberId(undefined);
      }
    }
  }, [getNationalIdError, normalizeNationalId, normalizeTextOnly, formatPhoneNumber, normalizePhoneNumber, getPhoneError, getEmailError, provinceDisabled, districtDisabled, checkNationalId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (checkNationalIdTimeoutRef.current) {
        clearTimeout(checkNationalIdTimeoutRef.current);
      }
    };
  }, []);

  // Memoized onKeyPress handler for text-only fields
  const handleTextOnlyKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const char = e.key;
    if (!/^[a-zA-ZçğıöşüÇĞIİÖŞÜ\s\-\.']$/.test(char) && char !== 'Backspace' && char !== 'Delete' && char !== 'Tab' && char !== 'ArrowLeft' && char !== 'ArrowRight') {
      e.preventDefault();
    }
  }, []);

  // Belge tipi etiketlerini al
  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'MEMBERSHIP_FORM': 'UyelikFormu',
      'RESIGNATION_FORM': 'IstifaFormu',
      'REPRESENTATION_LETTER': 'TemsilcilikYazisi',
      'OTHER': 'Diger',
    };
    return labels[type] || 'Diger';
  };

  // Dosya adını oluştur (format: BelgeTipi_TC_AdSoyad)
  // Kayıt numarası onay sırasında backend'de eklenecek
  const generateFileName = (originalFileName: string, documentType?: string): string => {
    const firstName = form.firstName.trim().replace(/[^a-zA-ZçğıöşüÇĞIİÖŞÜ\s]/g, '');
    const lastName = form.lastName.trim().replace(/[^a-zA-ZçğıöşüÇĞIİÖŞÜ\s]/g, '');
    const adSoyad = `${firstName}_${lastName}`.replace(/\s+/g, '_');
    
    const tcKimlik = form.nationalId.trim() || 'TCYOK';
    
    // Dosya uzantısını al
    const extension = originalFileName.substring(originalFileName.lastIndexOf('.'));
    
    // Belge tipi etiketi
    const belgeTipi = documentType ? getDocumentTypeLabel(documentType) : 'Diger';
    
    // Format: BelgeTipi_TC_AdSoyad (kayıt numarası onay sırasında eklenecek)
    return `${belgeTipi}_${tcKimlik}_${adSoyad}${extension}`;
  };

  // Dosya seçildiğinde otomatik ad oluştur
  const handleFileSelect = (files: File[]) => {
    const newFiles = [...uploadedFiles, ...files];
    setUploadedFiles(newFiles);
    
    // Yeni dosyalar için otomatik ad oluştur (belge tipi seçilene kadar bekler)
    const newFileNames = { ...fileNames };
    files.forEach((file, fileIndex) => {
      const globalIndex = uploadedFiles.length + fileIndex;
      // Belge tipi seçilene kadar geçici bir ad kullan
      const autoName = generateFileName(file.name);
      newFileNames[globalIndex] = autoName;
    });
    setFileNames(newFileNames);
  };

  // Dosya adını güncelle
  const handleFileNameChange = (index: number, newName: string) => {
    setFileNames((prev) => ({
      ...prev,
      [index]: newName,
    }));
  };

  // Dosya silindiğinde adını ve tipini de temizle
  const handleFileDelete = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileNames((prev) => {
      const newNames: Record<number, string> = {};
      Object.keys(prev)
        .map(Number)
        .filter((i) => i !== index)
        .forEach((oldIndex) => {
          const newIndex = oldIndex > index ? oldIndex - 1 : oldIndex;
          newNames[newIndex] = prev[oldIndex];
        });
      return newNames;
    });
    setFileTypes((prev) => {
      const newTypes: Record<number, string> = {};
      Object.keys(prev)
        .map(Number)
        .filter((i) => i !== index)
        .forEach((oldIndex) => {
          const newIndex = oldIndex > index ? oldIndex - 1 : oldIndex;
          newTypes[newIndex] = prev[oldIndex];
        });
      return newTypes;
    });
  };

  const validate = () => {
    if (!form.firstName.trim()) {
      setError('Ad alanı zorunludur.');
      setErrorDialogOpen(true);
      return false;
    }
    if (!form.lastName.trim()) {
      setError('Soyad alanı zorunludur.');
      setErrorDialogOpen(true);
      return false;
    }
    const nationalIdError = getNationalIdError(form.nationalId);
    if (nationalIdError) {
      setError(nationalIdError);
      setNationalIdError(nationalIdError);
      setErrorDialogOpen(true);
      return false;
    }
    if (requireMotherName && !form.motherName.trim()) {
      setError('Anne adı zorunludur.');
      setErrorDialogOpen(true);
      return false;
    }
    if (requireFatherName && !form.fatherName.trim()) {
      setError('Baba adı zorunludur.');
      setErrorDialogOpen(true);
      return false;
    }
    if (!form.birthDate) {
      setError('Doğum tarihi zorunludur.');
      setErrorDialogOpen(true);
      return false;
    }
    if (requireBirthplace && !form.birthplace.trim()) {
      setError('Doğum yeri zorunludur.');
      setErrorDialogOpen(true);
      return false;
    }
    if (requireGender && !form.gender) {
      setError('Cinsiyet seçimi zorunludur.');
      setErrorDialogOpen(true);
      return false;
    }
    if (requireEducation && !form.educationStatus) {
      setError('Öğrenim durumu zorunludur.');
      setErrorDialogOpen(true);
      return false;
    }
    if (!form.provinceId) {
      setError('İl seçimi zorunludur.');
      setErrorDialogOpen(true);
      return false;
    }
    if (!form.districtId) {
      setError('İlçe seçimi zorunludur.');
      setErrorDialogOpen(true);
      return false;
    }
    if (requirePhone) {
      const normalizedPhone = normalizePhoneNumber(form.phone);
      if (!normalizedPhone || normalizedPhone.trim() === '') {
        setError('Telefon numarası zorunludur.');
        setErrorDialogOpen(true);
        return false;
      }
      const phoneErr = getPhoneError(normalizedPhone);
      if (phoneErr) {
        setError(phoneErr);
        setPhoneError(phoneErr);
        setErrorDialogOpen(true);
        return false;
      }
    } else if (form.phone.trim()) {
      const normalizedPhone = normalizePhoneNumber(form.phone);
      const phoneErr = getPhoneError(normalizedPhone);
      if (phoneErr) {
        setError(phoneErr);
        setPhoneError(phoneErr);
        setErrorDialogOpen(true);
        return false;
      }
    }
    if (requireEmail && !form.email.trim()) {
      setError('E-posta alanı zorunludur.');
      setErrorDialogOpen(true);
      return false;
    }
    if (form.email.trim()) {
      const emailError = getEmailError(form.email);
      if (emailError) {
        setError(emailError);
        setEmailError(emailError);
        setErrorDialogOpen(true);
        return false;
      }
    }
    if (!form.institutionId) {
      setError('Kurum seçimi zorunludur.');
      setErrorDialogOpen(true);
      return false;
    }
    if (requireWorkUnit && !form.dutyUnit.trim()) {
      setError('Görev birimi zorunludur.');
      setErrorDialogOpen(true);
      return false;
    }
    if (requireInstitutionRegNo && !form.institutionRegNo.trim()) {
      setError('Kurum sicil no zorunludur.');
      setErrorDialogOpen(true);
      return false;
    }
    return true;
  };

  const handleSubmit = async (skipDialog = false) => {
    if (!canCreateApplication) {
      setError('Bu işlem için yetkiniz yok.');
      return;
    }

    if (!validate()) return;

    // En son Kaydet tıklandığında: iptal edilmiş üye (yeniden başvuru) ise aynı uyarıyı tekrar göster
    if (cancelledMember && previousCancelledMemberId && !skipDialog) {
      setCancelledMemberDialogMode('confirm_submit');
      setCancelledMemberDialogOpen(true);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Telefon numarasını normalize et (sadece rakamlar, +90 ile başlamalı)
      const normalizedPhone = form.phone.trim() 
        ? normalizePhoneNumber(form.phone.trim())
        : undefined;

      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        nationalId: form.nationalId.trim(), // Zorunlu
        phone: normalizedPhone || undefined,
        email: form.email.trim() || undefined,
        provinceId: form.provinceId || undefined,
        districtId: form.districtId || undefined,
        branchId: form.branchId || undefined,
        source: 'DIRECT', // Default değer olarak DIRECT kullanılıyor
        // Kişisel Bilgiler
        motherName: form.motherName.trim() || undefined,
        fatherName: form.fatherName.trim() || undefined,
        birthDate: form.birthDate || undefined,
        birthplace: form.birthplace.trim() || undefined,
        gender: form.gender || undefined,
        educationStatus: form.educationStatus || undefined,
        // Üye Grubu
        memberGroupId: form.memberGroupId || undefined,
        // Kurum Bilgileri
        institutionId: form.institutionId || undefined,
        // Tevkifat
        tevkifatCenterId: form.tevkifatCenterId || undefined,
        tevkifatTitleId: form.tevkifatTitle || undefined,
        // Kurum Detay Bilgileri
        dutyUnit: form.dutyUnit.trim() || undefined,
        institutionAddress: form.institutionAddress.trim() || undefined,
        institutionProvinceId: form.institutionProvinceId || undefined,
        institutionDistrictId: form.institutionDistrictId || undefined,
        professionId: form.professionId || undefined,
        institutionRegNo: form.institutionRegNo.trim() || undefined,
        staffTitleCode: form.staffTitleCode.trim() || undefined,
        previousCancelledMemberId: previousCancelledMemberId,
        // registrationNumber onay sırasında admin tarafından atanacak
      };

      const created = await createMemberApplication(payload);
      
      // Dosyaları yükle (eğer varsa)
      if (uploadedFiles.length > 0) {
        if (!canUploadDocuments) {
          setError('Uye olusturuldu ancak evrak yukleme yetkiniz olmadigi icin dosyalar yuklenemedi.');
          setErrorDialogOpen(true);
          navigate(`/members/${created.id}?source=application`);
          return;
        }
        try {
          // Her dosya için belge tipi kontrolü yap
          for (let index = 0; index < uploadedFiles.length; index++) {
            const file = uploadedFiles[index];
            const documentType = fileTypes[index];
            
            if (!documentType) {
              setError(`Dosya ${index + 1} için belge tipi seçilmelidir.`);
              setErrorDialogOpen(true);
              setSaving(false);
              return;
            }
            
            // Dosya adını oluştur: BelgeTipi_TC_AdSoyad formatında
            // Kayıt numarası onay sırasında eklenecek
            const finalFileName = fileNames[index] || generateFileName(file.name, documentType);
            
            // Dosyayı yükle (dosya adını uzantıyla birlikte gönder)
            await uploadMemberDocument(
              created.id,
              file,
              documentType,
              undefined, // description
              finalFileName, // fileName (uzantıyla birlikte)
            );
          }
        } catch (fileError: unknown) {
          console.error('Dosya yüklenirken hata:', fileError);
          const errorMessage = getApiErrorMessage(fileError, 'Dosya yüklenirken bir hata oluştu.');
          setError(`Üye oluşturuldu ancak dosya yüklenirken hata: ${errorMessage}`);
          setErrorDialogOpen(true);
          // Dosya yükleme hatası olsa bile üye oluşturuldu, devam et
        }
      }
      
      navigate(`/members/${created.id}?source=application`);
    } catch (e: unknown) {
      console.error('Üye başvurusu oluşturulurken hata:', e);
      setError(getApiErrorMessage(e, 'Başvuru oluşturulurken bir hata oluştu.'));
      setErrorDialogOpen(true);
    } finally {
      setSaving(false);
    }
  };

  if (!canCreateApplication) {
    return (
      <Box>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          <PersonAddIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Yetkisiz İşlem
          </Typography>
          <Typography color="text.secondary">
            Üye başvurusu oluşturmak için gerekli izne sahip değilsiniz.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        icon={<PersonAddIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Yeni Üye Başvurusu"
        description="Panel üzerinden yeni bir üye başvurusu oluşturun"
        color={theme.palette.success.main}
        darkColor={theme.palette.success.dark}
        lightColor={theme.palette.success.light}
      />
      {/* Ana Kart */}
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
          {/* Kişisel Bilgiler Bölümü */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5, 
              mb: 3,
              pb: 2,
              borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <PersonIcon sx={{ fontSize: '1.3rem', color: '#fff' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Kişisel Bilgiler
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
            {/* TC Kimlik No - Tam genişlik */}
            <Grid size={12}>
              <TextField
                label="TC Kimlik Numarası *"
                value={form.nationalId}
                onChange={(e) => handleChange('nationalId', e.target.value)}
                fullWidth
                required
                error={!!nationalIdError}
                inputProps={{ maxLength: 11, inputMode: 'numeric', pattern: '\\d*' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon sx={{ color: nationalIdError ? 'error.main' : 'primary.main', fontSize: '1.3rem' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (checkingNationalId || nationalIdError) ? (
                    <InputAdornment position="end">
                      {checkingNationalId ? (
                        <CircularProgress size={20} />
                      ) : nationalIdError ? (
                        <Tooltip 
                          title={nationalIdError} 
                          arrow 
                          placement="top"
                          componentsProps={{
                            tooltip: {
                              sx: {
                                zIndex: 9999,
                                fontSize: '0.875rem',
                              },
                            },
                          }}
                        >
                          <ErrorIcon sx={{ color: 'error.main', fontSize: '1.2rem', cursor: 'help' }} />
                        </Tooltip>
                      ) : null}
                    </InputAdornment>
                  ) : null,
                }}
                sx={{
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>

            {/* Ad - Soyad (2 sütun) */}
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                label="Adı *"
                value={form.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                fullWidth
                required
                inputProps={{
                  pattern: '[a-zA-ZçğıöşüÇĞIİÖŞÜ\\s\\-\\.\']*',
                  onKeyPress: handleTextOnlyKeyPress,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                label="Soyadı *"
                value={form.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                fullWidth
                required
                inputProps={{
                  pattern: '[a-zA-ZçğıöşüÇĞIİÖŞÜ\\s\\-\\.\']*',
                  onKeyPress: handleTextOnlyKeyPress,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>

            {/* Anne Adı - Baba Adı (2 sütun) */}
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                label={requireMotherName ? 'Anne Adı *' : 'Anne Adı'}
                value={form.motherName}
                onChange={(e) => handleChange('motherName', e.target.value)}
                fullWidth
                required={requireMotherName}
                helperText={!requireMotherName ? 'Opsiyonel' : undefined}
                inputProps={{
                  pattern: '[a-zA-ZçğıöşüÇĞIİÖŞÜ\\s\\-\\.\']*',
                  onKeyPress: handleTextOnlyKeyPress,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                label={requireFatherName ? 'Baba Adı *' : 'Baba Adı'}
                value={form.fatherName}
                onChange={(e) => handleChange('fatherName', e.target.value)}
                fullWidth
                required={requireFatherName}
                helperText={!requireFatherName ? 'Opsiyonel' : undefined}
                inputProps={{
                  pattern: '[a-zA-ZçğıöşüÇĞIİÖŞÜ\\s\\-\\.\']*',
                  onKeyPress: handleTextOnlyKeyPress,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>

            {/* Doğum Tarihi - Doğum Yeri (2 sütun) */}
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                label="Doğum Tarihi *"
                type="date"
                value={form.birthDate}
                onChange={(e) => handleChange('birthDate', e.target.value)}
                fullWidth
                required
                InputLabelProps={{
                  shrink: true,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PlaceIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <TextField
                label={requireBirthplace ? 'Doğum Yeri *' : 'Doğum Yeri'}
                value={form.birthplace}
                onChange={(e) => handleChange('birthplace', e.target.value)}
                fullWidth
                required={requireBirthplace}
                helperText={!requireBirthplace ? 'Opsiyonel' : undefined}
                inputProps={{
                  pattern: '[a-zA-ZçğıöşüÇĞIİÖŞÜ\\s\\-\\.\']*',
                  onKeyPress: handleTextOnlyKeyPress,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PlaceIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>

            {/* Cinsiyet - Öğrenim Durumu (2 sütun) */}
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <Autocomplete
                options={[
                  { value: 'MALE', label: 'Erkek' },
                  { value: 'FEMALE', label: 'Kadın' },
                ]}
                value={
                  form.gender
                    ? { value: form.gender, label: form.gender === 'MALE' ? 'Erkek' : 'Kadın' }
                    : null
                }
                  onChange={(_, newValue) => handleChange('gender', newValue?.value || '')}
                getOptionLabel={(option) => option.label}
                isOptionEqualTo={(option, value) => option.value === value.value}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={requireGender ? 'Cinsiyet *' : 'Cinsiyet'}
                    required={requireGender}
                    helperText={!requireGender ? 'Opsiyonel' : undefined}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PersonIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      minWidth: 300,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                )}
                fullWidth
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6
              }}>
              <Autocomplete
                options={[
                  { value: 'PRIMARY', label: 'İlköğretim' },
                  { value: 'HIGH_SCHOOL', label: 'Lise' },
                  { value: 'COLLEGE', label: 'Yüksekokul' },
                ]}
                value={
                  form.educationStatus
                    ? {
                        value: form.educationStatus,
                        label:
                          form.educationStatus === 'PRIMARY'
                            ? 'İlköğretim'
                            : form.educationStatus === 'HIGH_SCHOOL'
                            ? 'Lise'
                            : 'Yüksekokul',
                      }
                    : null
                }
                  onChange={(_, newValue) => handleChange('educationStatus', newValue?.value || '')}
                getOptionLabel={(option) => option.label}
                isOptionEqualTo={(option, value) => option.value === value.value}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={requireEducation ? 'Öğrenim Durumu *' : 'Öğrenim Durumu'}
                    required={requireEducation}
                    helperText={!requireEducation ? 'Opsiyonel' : undefined}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <SchoolIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      minWidth: 300,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                )}
                fullWidth
              />
            </Grid>

            {/* Telefon - E-posta (2 sütun) */}
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                label={requirePhone ? 'Telefon *' : 'Telefon'}
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                fullWidth
                required={requirePhone}
                helperText={!requirePhone ? 'Opsiyonel' : undefined}
                error={!!phoneError}
                placeholder="+90 (5XX) XXX XX XX"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon sx={{ color: phoneError ? 'error.main' : 'text.secondary', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                  endAdornment: phoneError ? (
                    <InputAdornment position="end">
                      <Tooltip 
                        title={phoneError} 
                        arrow 
                        placement="top"
                        componentsProps={{
                          tooltip: {
                            sx: {
                              zIndex: 9999,
                              fontSize: '0.875rem',
                            },
                          },
                        }}
                      >
                        <ErrorIcon sx={{ color: 'error.main', fontSize: '1.2rem', cursor: 'help' }} />
                      </Tooltip>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                label={requireEmail ? 'E-posta *' : 'E-posta'}
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                fullWidth
                required={requireEmail}
                helperText={!requireEmail ? 'Opsiyonel' : undefined}
                error={!!emailError}
                placeholder="ornek@email.com"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: emailError ? 'error.main' : 'text.secondary', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                  endAdornment: emailError ? (
                    <InputAdornment position="end">
                      <Tooltip 
                        title={emailError} 
                        arrow 
                        placement="top"
                        componentsProps={{
                          tooltip: {
                            sx: {
                              zIndex: 9999,
                              fontSize: '0.875rem',
                            },
                          },
                        }}
                      >
                        <ErrorIcon sx={{ color: 'error.main', fontSize: '1.2rem', cursor: 'help' }} />
                      </Tooltip>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>
          </Grid>

          {/* Bölge Bilgileri */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5, 
              mb: 3, 
              mt: 4,
              pb: 2,
              borderBottom: `2px solid ${alpha(theme.palette.info.main, 0.1)}`,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.3)}`,
              }}
            >
              <PlaceIcon sx={{ fontSize: '1.3rem', color: '#fff' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Bölge Bilgileri
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
            {/* İl - İlçe (2 sütun) */}
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Autocomplete
                options={provinces}
                value={provinces.find((p) => p.id === form.provinceId) || null}
                  onChange={(_, newValue) => handleChange('provinceId', newValue?.id || '')}
                getOptionLabel={(option) => option.name}
                isOptionEqualTo={(option, value) => option.id === value.id}
                disabled={provinceDisabled}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="İl *"
                    required
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PlaceIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      minWidth: 300,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                )}
                fullWidth
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Autocomplete
                options={districts}
                value={districts.find((d) => d.id === form.districtId) || null}
                onChange={(_, newValue) => handleChange('districtId', newValue?.id || '')}
                getOptionLabel={(option) => option.name}
                isOptionEqualTo={(option, value) => option.id === value.id}
                disabled={districtDisabled || !form.provinceId}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="İlçe *"
                    required
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PlaceIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      minWidth: 300,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                )}
                fullWidth
              />
            </Grid>
          </Grid>

          {/* Kurum Bilgileri */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5, 
              mb: 3, 
              mt: 4,
              pb: 2,
              borderBottom: `2px solid ${alpha(theme.palette.warning.main, 0.1)}`,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.3)}`,
              }}
            >
              <WorkIcon sx={{ fontSize: '1.3rem', color: '#fff' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Kurum Bilgileri
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
            {/* Kurum Adı - Tek alan, tam genişlik */}
            <Grid size={12}>
              <Autocomplete
                options={institutions}
                value={institutions.find((i) => i.id === form.institutionId) || null}
                onChange={(_, newValue) => handleChange('institutionId', newValue?.id || '')}
                onOpen={() => loadInstitutions()}
                getOptionLabel={(option) => option.name}
                isOptionEqualTo={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Kurum Adı *"
                    required
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <AccountBalanceIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      minWidth: 300,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                )}
                fullWidth
              />
            </Grid>

            {/* Görev Birimi */}
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                label={requireWorkUnit ? 'Görev Birimi *' : 'Görev Birimi'}
                value={form.dutyUnit}
                onChange={(e) => handleChange('dutyUnit', e.target.value)}
                required={requireWorkUnit}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <WorkIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              {!requireWorkUnit && (
                <FormHelperText sx={{ mt: 0.5, ml: 0 }}>Opsiyonel</FormHelperText>
              )}
            </Grid>

            {/* Meslek(Unvan) */}
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Autocomplete
                options={professions}
                value={professions.find((p) => p.id === form.professionId) || null}
                onChange={(_, newValue) => handleChange('professionId', newValue?.id || '')}
                getOptionLabel={(option) => option.name}
                isOptionEqualTo={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Meslek(Unvan)"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <BadgeIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      minWidth: 300,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                )}
                fullWidth
              />
              <FormHelperText>Opsiyonel</FormHelperText>
            </Grid>

            {/* Kurum Adresi */}
            <Grid size={12}>
              <TextField
                label="Kurum Adresi"
                value={form.institutionAddress}
                onChange={(e) => handleChange('institutionAddress', e.target.value)}
                fullWidth
                multiline
                rows={2}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PlaceIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <FormHelperText sx={{ mt: 0.5, ml: 0 }}>Opsiyonel</FormHelperText>
            </Grid>

            {/* Kurum İli - Kurum İlçesi */}
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Autocomplete
                options={institutionProvinces.length > 0 ? institutionProvinces : provinces}
                value={
                  (institutionProvinces.length > 0 ? institutionProvinces : provinces).find(
                    (p) => p.id === form.institutionProvinceId
                  ) || null
                }
                onChange={(_, newValue) => handleChange('institutionProvinceId', newValue?.id || '')}
                getOptionLabel={(option) => option.name}
                isOptionEqualTo={(option, value) => option.id === value.id}
                disabled
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Kurum İli"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PlaceIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      minWidth: 300,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                )}
                fullWidth
              />
              <FormHelperText>Opsiyonel</FormHelperText>
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Autocomplete
                options={institutionDistricts}
                value={institutionDistricts.find((d) => d.id === form.institutionDistrictId) || null}
                onChange={(_, newValue) => handleChange('institutionDistrictId', newValue?.id || '')}
                getOptionLabel={(option) => option.name}
                isOptionEqualTo={(option, value) => option.id === value.id}
                disabled
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Kurum İlçesi"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PlaceIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      minWidth: 300,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                )}
                fullWidth
              />
              <FormHelperText>Opsiyonel</FormHelperText>
            </Grid>

            {/* Kurum Sicil No - Kadro Unvan Kodu */}
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                label={requireInstitutionRegNo ? 'Kurum Sicil No *' : 'Kurum Sicil No'}
                value={form.institutionRegNo}
                onChange={(e) => handleChange('institutionRegNo', e.target.value)}
                required={requireInstitutionRegNo}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              {!requireInstitutionRegNo && (
                <FormHelperText sx={{ mt: 0.5, ml: 0 }}>Opsiyonel</FormHelperText>
              )}
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                label="Kadro Unvan Kodu"
                value={form.staffTitleCode}
                onChange={(e) => handleChange('staffTitleCode', e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <FormHelperText sx={{ mt: 0.5, ml: 0 }}>Opsiyonel</FormHelperText>
            </Grid>
          </Grid>

          {/* Üyelik Evrakları Bölümü */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5, 
              mb: 3, 
              mt: 4,
              pb: 2,
              borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <UploadFileIcon sx={{ fontSize: '1.3rem', color: '#fff' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Üyelik Evrakları
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
            <Grid size={12}>
              <Box
                sx={{
                  border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                  transition: 'all 0.3s',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              >
                <input
                  accept=".pdf"
                  style={{ display: 'none' }}
                  id="file-upload-input"
                  multiple
                  type="file"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    // Sadece PDF dosyalarını kabul et
                    const pdfFiles = files.filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
                    if (pdfFiles.length !== files.length) {
                      setError('Sadece PDF dosyaları yüklenebilir.');
                    }
                    if (pdfFiles.length > 0) {
                      handleFileSelect(pdfFiles);
                    }
                    // Input'u sıfırla (aynı dosyayı tekrar seçebilmek için)
                    e.target.value = '';
                  }}
                />
                <label htmlFor="file-upload-input">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadFileIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      mb: 2,
                    }}
                  >
                    Dosya Seç
                  </Button>
                </label>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Sadece PDF formatı desteklenir
                </Typography>
                {uploadedFiles.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                      Seçilen Dosyalar ({uploadedFiles.length}):
                    </Typography>
                    <Stack spacing={2}>
                      {uploadedFiles.map((file, index) => {
                        const documentType = fileTypes[index] || '';
                        const defaultFileName = generateFileName(file.name, documentType);
                        const fileName = fileNames[index] || defaultFileName;
                        const extension = file.name.substring(file.name.lastIndexOf('.'));
                        
                        return (
                          <Box
                            key={index}
                            sx={{
                              p: 2,
                              bgcolor: alpha(theme.palette.grey[100], 0.5),
                              borderRadius: 1,
                              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                <UploadFileIcon fontSize="small" color="action" />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                    Orijinal Dosya Adı:
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                    {file.name}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  {(file.size / 1024).toFixed(2)} KB
                                </Typography>
                              </Box>
                              <IconButton
                                size="small"
                                onClick={() => handleFileDelete(index)}
                                sx={{ ml: 1 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                            <Box sx={{ mt: 1.5 }}>
                              <Autocomplete
                                options={[
                                  { value: 'MEMBERSHIP_FORM', label: 'Üyelik Formu' },
                                  { value: 'RESIGNATION_FORM', label: 'İstifa Formu' },
                                  { value: 'REPRESENTATION_LETTER', label: 'Temsilcilik Yazısı Formu' },
                                  { value: 'OTHER', label: 'Diğer Dosyalar' },
                                ]}
                                value={
                                  fileTypes[index]
                                    ? {
                                        value: fileTypes[index],
                                        label:
                                          fileTypes[index] === 'MEMBERSHIP_FORM'
                                            ? 'Üyelik Formu'
                                            : fileTypes[index] === 'RESIGNATION_FORM'
                                            ? 'İstifa Formu'
                                            : fileTypes[index] === 'REPRESENTATION_LETTER'
                                            ? 'Temsilcilik Yazısı Formu'
                                            : 'Diğer Dosyalar',
                                      }
                                    : null
                                }
                                onChange={(_, newValue) => {
                                  const selectedType = newValue?.value || '';
                                  setFileTypes((prev) => ({
                                    ...prev,
                                    [index]: selectedType,
                                  }));
                                  // Belge tipi seçildiğinde dosya adını güncelle
                                  if (selectedType && uploadedFiles[index]) {
                                    const file = uploadedFiles[index];
                                    const newFileName = generateFileName(file.name, selectedType);
                                    handleFileNameChange(index, newFileName);
                                  }
                                }}
                                getOptionLabel={(option) => option.label}
                                isOptionEqualTo={(option, value) => option.value === value.value}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Belge Tipi *"
                                    required
                                    error={!fileTypes[index]}
                                    helperText={!fileTypes[index] ? 'Belge tipi seçilmelidir' : ''}
                                    size="small"
                                    sx={{ 
                                      minWidth: 300,
                                      mb: 1.5,
                                    }}
                                  />
                                )}
                                fullWidth
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                                Kaydedilecek Dosya Adı:
                              </Typography>
                              <TextField
                                value={fileName.replace(extension, '')}
                                onChange={(e) => {
                                  // Uzantıyı koru
                                  const newName = e.target.value.trim() + extension;
                                  handleFileNameChange(index, newName);
                                }}
                                size="small"
                                fullWidth
                                placeholder="Dosya adını girin"
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <Typography variant="caption" color="text.secondary">
                                        {extension}
                                      </Typography>
                                    </InputAdornment>
                                  ),
                                }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 1,
                                  },
                                }}
                              />
                              {fileName === defaultFileName && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                                  Otomatik oluşturuldu. İsterseniz değiştirebilirsiniz.
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                    <Alert severity="info" sx={{ mt: 2, borderRadius: 1 }}>
                      <Typography variant="caption">
                        <strong>Not:</strong> Her dosya için belge tipi seçilmelidir. Dosyalar kaydedilirken 
                        <strong> BelgeTipi_TC_AdSoyad</strong> formatında kaydedilecektir. Üye başvurusu onaylandıktan sonra dosya adları otomatik olarak 
                        <strong> UyeKayidi_BelgeTipi_TC_AdSoyad</strong> formatına güncellenecektir.
                      </Typography>
                    </Alert>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Butonlar */}
          <Box 
            sx={{ 
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'flex-end', 
              gap: 2, 
              mt: 5,
              pt: 4,
              borderTop: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              disabled={saving}
              startIcon={<ArrowBackIcon />}
              fullWidth={useMediaQuery(theme.breakpoints.down('sm'))}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                },
              }}
            >
              Geri
            </Button>
            <Button
              variant="contained"
              onClick={() => handleSubmit(false)}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              fullWidth={useMediaQuery(theme.breakpoints.down('sm'))}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.35)}`,
                '&:hover': {
                  boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.45)}`,
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </Box>
        </Box>
      </Card>
      {/* İptal Edilmiş Üye Uyarı Dialog'u */}
      <Dialog
        open={cancelledMemberDialogOpen}
        onClose={() => setCancelledMemberDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <Alert severity="warning" sx={{ flex: 1 }}>
              İptal Edilmiş Üye Tespit Edildi
            </Alert>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {cancelledMember && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Bu TC kimlik numarasına sahip daha önce üyeliği iptal edilmiş bir kayıt bulundu. 
                Aşağıdaki bilgileri inceleyerek devam edebilirsiniz.
              </Alert>
              
              <Paper elevation={0} sx={{ p: 2, bgcolor: alpha(theme.palette.grey[50], 0.5), borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Önceki Üye Bilgileri
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid
                    size={{
                      xs: 12,
                      sm: 6
                    }}>
                    <Typography variant="body2" color="text.secondary">Ad Soyad</Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {cancelledMember.firstName} {cancelledMember.lastName}
                    </Typography>
                  </Grid>
                  <Grid
                    size={{
                      xs: 12,
                      sm: 6
                    }}>
                    <Typography variant="body2" color="text.secondary">TC Kimlik No</Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {cancelledMember.nationalId || '-'}
                    </Typography>
                  </Grid>
                  <Grid
                    size={{
                      xs: 12,
                      sm: 6
                    }}>
                    <Typography variant="body2" color="text.secondary">İptal Tarihi</Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {cancelledMember.cancelledAt
                        ? new Date(cancelledMember.cancelledAt).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : '-'}
                    </Typography>
                  </Grid>
                  <Grid
                    size={{
                      xs: 12,
                      sm: 6
                    }}>
                    <Typography variant="body2" color="text.secondary">Durum</Typography>
                    <Chip
                      label={cancelledMember.status}
                      size="small"
                      color="error"
                      sx={{ mt: 0.5 }}
                    />
                  </Grid>
                  {cancelledMember.province && (
                    <Grid
                      size={{
                        xs: 12,
                        sm: 6
                      }}>
                      <Typography variant="body2" color="text.secondary">İl/İlçe</Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {cancelledMember.province.name}
                        {cancelledMember.district ? ` / ${cancelledMember.district.name}` : ''}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          {cancelledMemberDialogMode === 'info' ? (
            <Button onClick={() => setCancelledMemberDialogOpen(false)} variant="contained">
              Tamam
            </Button>
          ) : (
            <>
              <Button onClick={() => setCancelledMemberDialogOpen(false)} color="inherit">
                Vazgeç
              </Button>
              <Button
                onClick={() => {
                  setCancelledMemberDialogOpen(false);
                  handleSubmit(true);
                }}
                variant="contained"
                disabled={saving}
              >
                Başvuruyu Gönder
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
      {/* Hata Dialog'u */}
      <Dialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <ErrorIcon sx={{ color: 'error.main', fontSize: '1.5rem' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Hata
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error">
            {error || 'Bir hata oluştu.'}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button 
            onClick={() => setErrorDialogOpen(false)} 
            variant="contained"
            color="error"
            fullWidth
          >
            Tamam
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default MemberApplicationCreatePage;

