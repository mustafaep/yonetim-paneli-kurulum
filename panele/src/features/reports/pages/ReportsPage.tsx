import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  useTheme,
  alpha,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Skeleton,
  Tooltip,
  IconButton,
  Autocomplete,
  TextField,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import RefreshIcon from '@mui/icons-material/Refresh';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PaymentsIcon from '@mui/icons-material/Payments';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import {
  fetchGlobalReport,
  fetchMemberStatusReport,
  fetchMemberGrowthStats,
  fetchTrendStats,
  fetchQuickAlerts,
  fetchDuesReport,
  fetchRegionReport,
  type GlobalReport,
  type MemberStatusReport,
  type MemberGrowthMonth,
  type TrendStats,
  type QuickAlerts,
  type DuesReport,
  type RegionReport,
  type ReportFilterParams,
} from '../services/reportsApi';
import { getProvinces, getDistricts, getInstitutions } from '../../regions/services/regionsApi';
import { getBranches } from '../../regions/services/branchesApi';
import type { Province, District } from '../../../types/region';
import type { Branch } from '../../regions/services/branchesApi';
import type { Institution } from '../../../types/region';
import { useSystemSettings } from '../../../app/providers/SystemSettingsContext';

const MONTH_NAMES = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Beklemede',
  APPROVED: 'Onaylandı',
  ACTIVE: 'Aktif',
  INACTIVE: 'Pasif',
  RESIGNED: 'İstifa',
  EXPELLED: 'İhraç',
  REJECTED: 'Reddedildi',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#4caf50',
  PENDING: '#ff9800',
  APPROVED: '#2196f3',
  INACTIVE: '#9e9e9e',
  RESIGNED: '#f44336',
  EXPELLED: '#d32f2f',
  REJECTED: '#e91e63',
};

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  loading?: boolean;
  formatAsCurrency?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color, subtitle, loading, formatAsCurrency }) => {
  const theme = useTheme();
  const displayValue = formatAsCurrency
    ? `₺${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`
    : typeof value === 'number'
      ? value.toLocaleString('tr-TR')
      : value;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.06)}`,
        backgroundColor: '#ffffff',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: `0 4px 20px ${alpha(color, 0.15)}` },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(color, 0.1),
            color,
          }}
        >
          {icon}
        </Box>
      </Box>
      {loading ? (
        <Skeleton variant="text" width="60%" height={36} />
      ) : (
        <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
          {displayValue}
        </Typography>
      )}
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.7) }}>
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
};

interface TrendCardProps {
  title: string;
  current: number;
  change: number;
  percentage: number;
  icon: React.ReactNode;
  loading?: boolean;
  formatAsCurrency?: boolean;
}

const TrendCard: React.FC<TrendCardProps> = ({ title, current, change, percentage, icon, loading, formatAsCurrency }) => {
  const theme = useTheme();
  const isPositive = change > 0;
  const isNeutral = change === 0;
  const trendColor = isPositive ? '#4caf50' : isNeutral ? '#ff9800' : '#f44336';
  const TrendIcon = isPositive ? TrendingUpIcon : isNeutral ? TrendingFlatIcon : TrendingDownIcon;

  const displayCurrent = formatAsCurrency
    ? `₺${current.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`
    : current.toLocaleString('tr-TR');

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.06)}`,
        backgroundColor: '#ffffff',
        height: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{ color: theme.palette.text.secondary }}>{icon}</Box>
        <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
          {title}
        </Typography>
      </Box>
      {loading ? (
        <Skeleton variant="text" width="50%" height={32} />
      ) : (
        <>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {displayCurrent}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendIcon sx={{ fontSize: 18, color: trendColor }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: trendColor }}>
              {isPositive ? '+' : ''}{change.toLocaleString('tr-TR')}
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              ({percentage >= 0 ? '+' : ''}{percentage.toFixed(1)}%)
            </Typography>
            <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.6), ml: 0.5 }}>
              son 30 gün
            </Typography>
          </Box>
        </>
      )}
    </Paper>
  );
};

interface AlertCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  description: string;
  loading?: boolean;
}

const AlertCard: React.FC<AlertCardProps> = ({ title, value, icon, color, description, loading }) => {
  const theme = useTheme();
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${alpha(color, 0.35)}`,
        boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.05)}`,
        backgroundColor: alpha(color, 0.04),
        height: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(color, 0.12),
            color,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
            {title}
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={40} height={28} />
          ) : (
            <Typography variant="h6" sx={{ fontWeight: 700, color, lineHeight: 1.2 }}>
              {value.toLocaleString('tr-TR')}
            </Typography>
          )}
        </Box>
      </Box>
      <Typography variant="caption" sx={{ color: alpha(theme.palette.text.secondary, 0.7), mt: 1, display: 'block' }}>
        {description}
      </Typography>
    </Paper>
  );
};

interface ChartPaperProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
}

const ChartPaper: React.FC<ChartPaperProps> = ({ title, subtitle, children, height = 350 }) => {
  const theme = useTheme();
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.22)}`,
        boxShadow: `0 2px 12px ${alpha(theme.palette.common.black, 0.06)}`,
        backgroundColor: '#ffffff',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{ px: 1, pb: 2, height }}>
        {children}
      </Box>
    </Paper>
  );
};

const CustomTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Paper elevation={3} sx={{ p: 1.5, borderRadius: 1.5, minWidth: 140 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{label}</Typography>
      {payload.map((entry: any, idx: number) => (
        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {entry.name}:
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR') : entry.value}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

const PieTooltipContent = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: data } = payload[0];
  return (
    <Paper elevation={3} sx={{ p: 1.5, borderRadius: 1.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
      <Typography variant="caption">
        {value.toLocaleString('tr-TR')} üye ({data.percentage?.toFixed(1)}%)
      </Typography>
    </Paper>
  );
};

const ReportsPage: React.FC = () => {
  const theme = useTheme();
  const { getSettingValue } = useSystemSettings();

  // Filter options
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  // Filter selections
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);

  // Report data
  const [globalReport, setGlobalReport] = useState<GlobalReport | null>(null);
  const [memberStatus, setMemberStatus] = useState<MemberStatusReport[]>([]);
  const [memberGrowth, setMemberGrowth] = useState<MemberGrowthMonth[]>([]);
  const [trends, setTrends] = useState<TrendStats | null>(null);
  const [alerts, setAlerts] = useState<QuickAlerts | null>(null);
  const [duesReport, setDuesReport] = useState<DuesReport | null>(null);
  const [regionReports, setRegionReports] = useState<RegionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeFilters: ReportFilterParams = useMemo(() => ({
    provinceId: selectedProvince?.id,
    districtId: selectedDistrict?.id,
    branchId: selectedBranch?.id,
    institutionId: selectedInstitution?.id,
  }), [selectedProvince, selectedDistrict, selectedBranch, selectedInstitution]);

  const hasActiveFilter = !!(selectedProvince || selectedDistrict || selectedBranch || selectedInstitution);
  const isVisible = useCallback(
    (key: string) => getSettingValue(key, 'true') === 'true',
    [getSettingValue],
  );

  const showRefreshButton = isVisible('REPORTS_SHOW_REFRESH_BUTTON');
  const showFilterPanel = isVisible('REPORTS_SHOW_FILTER_PANEL');
  const showKpiCards = isVisible('REPORTS_SHOW_KPI_CARDS');
  const showTrendCards = isVisible('REPORTS_SHOW_TREND_CARDS');
  const showAlertCards = isVisible('REPORTS_SHOW_ALERT_CARDS');
  const showMemberGrowthChart = isVisible('REPORTS_SHOW_MEMBER_GROWTH_CHART');
  const showMemberStatusPie = isVisible('REPORTS_SHOW_MEMBER_STATUS_PIE');
  const showProvinceDistributionChart = isVisible('REPORTS_SHOW_PROVINCE_DISTRIBUTION_CHART');
  const showDuesChart = isVisible('REPORTS_SHOW_DUES_CHART');
  const showDuesSummaryCards = isVisible('REPORTS_SHOW_DUES_SUMMARY_CARDS');
  const showRegionTable = isVisible('REPORTS_SHOW_REGION_TABLE');

  // Load filter options once
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [prov, br, inst] = await Promise.all([
          getProvinces(),
          getBranches(),
          getInstitutions(),
        ]);
        setProvinces(prov);
        setBranches(br);
        setInstitutions(inst);
      } catch {
        // Filter options are non-critical
      }
    };
    loadFilterOptions();
  }, []);

  // Load districts + narrow institutions when province changes
  useEffect(() => {
    if (selectedProvince) {
      getDistricts(selectedProvince.id).then(setDistricts).catch(() => setDistricts([]));
      getInstitutions({ provinceId: selectedProvince.id }).then(setInstitutions).catch(() => setInstitutions([]));
      setSelectedDistrict(null);
      setSelectedInstitution(null);
    } else {
      setDistricts([]);
      setSelectedDistrict(null);
      getInstitutions().then(setInstitutions).catch(() => setInstitutions([]));
    }
  }, [selectedProvince]);

  // Narrow institutions further when district changes
  useEffect(() => {
    if (selectedProvince && selectedDistrict) {
      getInstitutions({ provinceId: selectedProvince.id, districtId: selectedDistrict.id })
        .then(setInstitutions)
        .catch(() => setInstitutions([]));
      setSelectedInstitution(null);
    }
  }, [selectedDistrict, selectedProvince]);

  const loadData = useCallback(async (filters?: ReportFilterParams) => {
    try {
      setLoading(true);
      setError(null);
      const f = filters;
      const [global, status, growth, trend, alert, dues, regions] = await Promise.all([
        fetchGlobalReport(f),
        fetchMemberStatusReport(f),
        fetchMemberGrowthStats(f),
        fetchTrendStats(f),
        fetchQuickAlerts(f),
        fetchDuesReport(f),
        fetchRegionReport(),
      ]);
      setGlobalReport(global);
      setMemberStatus(status);
      setMemberGrowth(growth);
      setTrends(trend);
      setAlerts(alert);
      setDuesReport(dues);
      setRegionReports(Array.isArray(regions) ? regions : [regions]);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(activeFilters);
  }, [loadData, activeFilters]);

  const handleClearFilters = () => {
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedBranch(null);
    setSelectedInstitution(null);
  };

  // ── Derived data for charts ──

  const pieData = memberStatus
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: STATUS_LABELS[s.status] || s.status,
      value: s.count,
      percentage: s.percentage,
      color: STATUS_COLORS[s.status] || '#9e9e9e',
    }));

  const totalStatusCount = memberStatus.reduce((sum, s) => sum + s.count, 0);

  const growthChartData = memberGrowth.map((m) => ({
    name: `${m.month}`,
    'Yeni Üye': m.newMembers,
    'Ayrılan Üye': m.leftMembers,
    'Net Değişim': m.net,
  }));

  const duesChartData = (duesReport?.byMonth || [])
    .slice()
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((m) => ({
      name: `${MONTH_NAMES[m.month]} ${m.year}`,
      'Toplam Kesinti': m.total,
      'İşlem Sayısı': m.count,
    }));

  const top15Provinces = [...regionReports]
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 15)
    .map((r) => ({
      name: r.regionName.length > 12 ? r.regionName.substring(0, 12) + '…' : r.regionName,
      fullName: r.regionName,
      'Aktif Üye': r.activeMembers,
      'İptal Üye': r.cancelledMembers,
      'Toplam': r.memberCount,
    }));

  if (error && !loading) {
    return (
      <PageLayout>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <PageHeader
            icon={<AssessmentIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
            title="Raporlar"
            description="Raporlama ve analiz"
            color={theme.palette.primary.main}
            darkColor={theme.palette.primary.dark}
            lightColor={theme.palette.primary.light}
          />
          <Alert severity="error" action={
            <IconButton color="inherit" size="small" onClick={() => loadData(activeFilters)}>
              <RefreshIcon />
            </IconButton>
          }>
            {error}
          </Alert>
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <PageHeader
          icon={<AssessmentIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title="Raporlar"
          description="Raporlama ve analiz"
          color={theme.palette.primary.main}
          darkColor={theme.palette.primary.dark}
          lightColor={theme.palette.primary.light}
          rightContent={showRefreshButton ? (
            <Tooltip title="Verileri yenile">
              <IconButton
                onClick={() => loadData(activeFilters)}
                disabled={loading}
                sx={{
                  backgroundColor: alpha('#fff', 0.15),
                  color: '#fff',
                  '&:hover': { backgroundColor: alpha('#fff', 0.25) },
                }}
              >
                <RefreshIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
              </IconButton>
            </Tooltip>
          ) : undefined}
        />

        {/* ── Filter Panel ── */}
        {showFilterPanel && (<Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.06)}`,
            backgroundColor: '#ffffff',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterListIcon sx={{ fontSize: 20, color: theme.palette.text.secondary }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary }}>
              Filtreler
            </Typography>
            {hasActiveFilter && (
              <Chip
                label="Temizle"
                size="small"
                icon={<ClearIcon sx={{ fontSize: '14px !important' }} />}
                onClick={handleClearFilters}
                sx={{
                  ml: 'auto',
                  height: 26,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              />
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                size="small"
                options={provinces}
                value={selectedProvince}
                onChange={(_, value) => {
                  setSelectedProvince(value);
                  setSelectedDistrict(null);
                  setSelectedInstitution(null);
                }}
                getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderInput={(params) => <TextField {...params} label="İl" placeholder="İl ara..." />}
                noOptionsText="İl bulunamadı"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                size="small"
                options={districts}
                value={selectedDistrict}
                onChange={(_, value) => {
                  setSelectedDistrict(value);
                  setSelectedInstitution(null);
                }}
                getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                disabled={!selectedProvince}
                renderInput={(params) => <TextField {...params} label="İlçe" placeholder="İlçe ara..." />}
                noOptionsText={selectedProvince ? 'İlçe bulunamadı' : 'Önce il seçin'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                size="small"
                options={branches}
                value={selectedBranch}
                onChange={(_, value) => setSelectedBranch(value)}
                getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderInput={(params) => <TextField {...params} label="Şube" placeholder="Şube ara..." />}
                noOptionsText="Şube bulunamadı"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                size="small"
                options={institutions}
                value={selectedInstitution}
                onChange={(_, value) => setSelectedInstitution(value)}
                getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderInput={(params) => <TextField {...params} label="Kurum" placeholder="Kurum ara..." />}
                noOptionsText="Kurum bulunamadı"
              />
            </Grid>
          </Grid>
        </Paper>)}

        {/* ── KPI Cards ── */}
        {showKpiCards && (<Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <KpiCard
              title="Toplam Üye"
              value={globalReport?.totalMembers ?? 0}
              icon={<PeopleIcon />}
              color={theme.palette.primary.main}
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <KpiCard
              title="Aktif Üye"
              value={globalReport?.activeMembers ?? 0}
              icon={<PersonIcon />}
              color="#4caf50"
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <KpiCard
              title="Ayrılan Üye"
              value={globalReport?.cancelledMembers ?? 0}
              icon={<PersonOffIcon />}
              color="#f44336"
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 6, md: 3 }}>
            <KpiCard
              title="Toplam Kesinti"
              value={globalReport?.totalPayments ?? 0}
              icon={<AccountBalanceWalletIcon />}
              color="#2196f3"
              loading={loading}
              formatAsCurrency
            />
          </Grid>
        </Grid>)}

        {/* ── Trend Cards ── */}
        {showTrendCards && (<Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TrendCard
              title="Üye Artışı (30 gün)"
              current={trends?.members.current ?? 0}
              change={trends?.members.change ?? 0}
              percentage={trends?.members.percentage ?? 0}
              icon={<SupervisorAccountIcon fontSize="small" />}
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TrendCard
              title="Kesinti Artışı (30 gün)"
              current={trends?.payments.current ?? 0}
              change={trends?.payments.change ?? 0}
              percentage={trends?.payments.percentage ?? 0}
              icon={<PaymentsIcon fontSize="small" />}
              loading={loading}
              formatAsCurrency
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TrendCard
              title="Yeni Kullanıcı (30 gün)"
              current={trends?.users.current ?? 0}
              change={trends?.users.change ?? 0}
              percentage={trends?.users.percentage ?? 0}
              icon={<GroupAddIcon fontSize="small" />}
              loading={loading}
            />
          </Grid>
        </Grid>)}

        {/* ── Alert Cards ── */}
        {showAlertCards && (<Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <AlertCard
              title="Kesintisiz Üyeler"
              value={alerts?.membersWithoutPayment ?? 0}
              icon={<WarningAmberIcon fontSize="small" />}
              color="#f44336"
              description="60 gündür kesinti yapılmayan aktif üyeler"
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <AlertCard
              title="Bekleyen Başvurular"
              value={alerts?.pendingApplications ?? 0}
              icon={<HourglassEmptyIcon fontSize="small" />}
              color="#ff9800"
              description="Onay bekleyen üyelik başvuruları"
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <AlertCard
              title="Üye Kaybı Olan İller"
              value={alerts?.provincesWithMemberLoss ?? 0}
              icon={<LocationCityIcon fontSize="small" />}
              color="#9c27b0"
              description="Son 30 günde üye kaybı yaşanan iller"
              loading={loading}
            />
          </Grid>
        </Grid>)}

        {/* ── Member Growth Chart ── */}
        {showMemberGrowthChart && (<ChartPaper title="Üye Artış/Azalış Grafiği" subtitle="Son 6 aylık üye hareketleri">
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : growthChartData.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography color="text.secondary">Veri bulunamadı</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.15)} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip content={<CustomTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Yeni Üye" fill="#4caf50" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ayrılan Üye" fill="#f44336" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Net Değişim" fill="#2196f3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>)}

        {/* ── Status Pie + Province Bar ── */}
        {(showMemberStatusPie || showProvinceDistributionChart) && (<Grid container spacing={2}>
          {showMemberStatusPie && (<Grid size={{ xs: 12, md: showProvinceDistributionChart ? 5 : 12 }}>
            <ChartPaper title="Üye Durum Dağılımı" subtitle={`Toplam ${totalStatusCount.toLocaleString('tr-TR')} üye`} height={320}>
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <CircularProgress />
                </Box>
              ) : pieData.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography color="text.secondary">Veri bulunamadı</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', height: '100%' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<PieTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  <Box sx={{ width: 160, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.75, pr: 2 }}>
                    {pieData.map((entry, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: entry.color, flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ flex: 1, lineHeight: 1.2 }} noWrap>
                          {entry.name}
                        </Typography>
                        <Chip
                          label={`${entry.percentage?.toFixed(1)}%`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            backgroundColor: alpha(entry.color, 0.1),
                            color: entry.color,
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </ChartPaper>
          </Grid>)}
          {showProvinceDistributionChart && (<Grid size={{ xs: 12, md: showMemberStatusPie ? 7 : 12 }}>
            <ChartPaper title="İl Bazlı Üye Dağılımı" subtitle="En yüksek üye sayısına sahip 15 il" height={320}>
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <CircularProgress />
                </Box>
              ) : top15Provinces.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography color="text.secondary">Veri bulunamadı</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top15Provinces} margin={{ top: 10, right: 20, left: 0, bottom: 5 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.15)} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                    <RechartsTooltip content={<CustomTooltipContent />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Aktif Üye" fill="#4caf50" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="İptal Üye" fill="#f44336" stackId="a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPaper>
          </Grid>)}
        </Grid>)}

        {/* ── Dues Chart ── */}
        {showDuesChart && (<ChartPaper title="Aylık Kesinti Grafiği" subtitle="Aylara göre kesinti toplam ve işlem sayısı">
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : duesChartData.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography color="text.secondary">Kesinti verisi bulunamadı</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={duesChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.15)} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <RechartsTooltip content={<CustomTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="Toplam Kesinti" stroke="#2196f3" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="İşlem Sayısı" stroke="#ff9800" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>)}

        {/* ── Dues Paid vs Unpaid ── */}
        {showDuesSummaryCards && duesReport && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 4 }}>
              <KpiCard
                title="Kesinti Yapan Üye"
                value={duesReport.paidMembers}
                icon={<PersonIcon />}
                color="#4caf50"
                loading={loading}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <KpiCard
                title="Kesinti Yapmayan Üye"
                value={duesReport.unpaidMembers}
                icon={<PersonOffIcon />}
                color="#f44336"
                loading={loading}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <KpiCard
                title="Toplam Kesinti Tutarı"
                value={duesReport.totalPayments}
                icon={<AccountBalanceWalletIcon />}
                color="#2196f3"
                formatAsCurrency
                loading={loading}
              />
            </Grid>
          </Grid>
        )}

        {/* ── Region Table Summary ── */}
        {showRegionTable && regionReports.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.22)}`,
              boxShadow: `0 2px 12px ${alpha(theme.palette.common.black, 0.06)}`,
              backgroundColor: '#ffffff',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                İl Bazlı Detaylı Rapor
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                Tüm illerin üye ve kesinti istatistikleri
              </Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component="table"
                sx={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  '& th, & td': {
                    px: 2,
                    py: 1.25,
                    fontSize: '0.8rem',
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                    textAlign: 'center',
                    verticalAlign: 'middle',
                  },
                  '& th': {
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                    backgroundColor: alpha(theme.palette.primary.main, 0.03),
                    whiteSpace: 'nowrap',
                  },
                  '& tbody tr:hover': {
                    backgroundColor: alpha(theme.palette.action.hover, 0.04),
                  },
                }}
              >
                <thead>
                  <tr>
                    <th>İl</th>
                    <th>Toplam Üye</th>
                    <th>Aktif Üye</th>
                    <th>Ayrılan Üye</th>
                    <th>Toplam Kesinti</th>
                  </tr>
                </thead>
                <tbody>
                  {[...regionReports]
                    .sort((a, b) => b.memberCount - a.memberCount)
                    .filter((r) => r.memberCount > 0)
                    .map((r) => (
                      <tr key={r.regionId}>
                        <td>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {r.regionName}
                          </Typography>
                        </td>
                        <td>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {r.memberCount.toLocaleString('tr-TR')}
                          </Typography>
                        </td>
                        <td>
                          <Chip
                            label={r.activeMembers.toLocaleString('tr-TR')}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: alpha('#4caf50', 0.08),
                              color: '#4caf50',
                            }}
                          />
                        </td>
                        <td>
                          {r.cancelledMembers > 0 ? (
                            <Chip
                              label={r.cancelledMembers.toLocaleString('tr-TR')}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                backgroundColor: alpha('#f44336', 0.08),
                                color: '#f44336',
                              }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">0</Typography>
                          )}
                        </td>
                        <td>
                          <Typography variant="body2">
                            ₺{r.totalPayments.toLocaleString('tr-TR')}
                          </Typography>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Box>
            </Box>
          </Paper>
        )}
      </Box>
    </PageLayout>
  );
};

export default ReportsPage;
