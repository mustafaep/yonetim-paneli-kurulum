import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../../shared/components/layout/MainLayout';
import ForbiddenPage from './ForbiddenPage';
import NotFoundPage from './NotFoundPage';

import LoginPage from '../../features/auth/pages/LoginPage';
import MembershipInquiryPage from '../../features/members/pages/MembershipInquiryPage';
import LegalPage from '../../features/legal/pages/LegalPage';
import DashboardPage from '../../features/dashboard/pages/DashboardPage';
import MembersListPage from '../../features/members/pages/MembersListPage';
import MembersByStatusPage from '../../features/members/pages/MembersByStatusPage';
import MemberDetailPage from '../../features/members/pages/MemberDetailPage';
import MemberUpdatePage from '../../features/members/pages/MemberUpdatePage';
import MembersApplicationsPage from '../../features/members/pages/MembersApplicationsPage';
import ApprovedMembersPage from '../../features/members/pages/ApprovedMembersPage';
import ActiveWaitingMembersPage from '../../features/members/pages/ActiveWaitingMembersPage';
import MemberApplicationCreatePage from '../../features/members/pages/MemberApplicationCreatePage';
import MemberHistoryPage from '../../features/members/pages/MemberHistoryPage';
import UsersListPage from '../../features/users/pages/UsersListPage';
import PanelUserApplicationsPage from '../../features/users/pages/PanelUserApplicationsPage';
import PanelUserDetailPage from '../../features/users/pages/PanelUserDetailPage';
import RolesListPage from '../../features/roles/pages/RolesListPage';
import RoleDetailPage from '../../features/roles/pages/RoleDetailPage';
import RoleCreateEditPage from '../../features/roles/pages/RoleCreateEditPage';
import RegionsPage from '../../features/regions/pages/RegionsPage';
import BranchesPage from '../../features/regions/pages/BranchesPage';
import BranchDetailPage from '../../features/regions/pages/BranchDetailPage';
import InstitutionsPage from '../../features/regions/pages/InstitutionsPage';
import InstitutionDetailPage from '../../features/regions/pages/InstitutionDetailPage';
import ProfessionsPage from '../../features/professions/pages/ProfessionsPage';
import ContentListPage from '../../features/content/pages/ContentListPage';
import DocumentTemplatesPage from '../../features/documents/pages/DocumentTemplatesPage';
import MemberDocumentsPage from '../../features/documents/pages/MemberDocumentsPage';
import PdfGeneratePage from '../../features/documents/pages/PdfGeneratePage';
import ReportsPage from '../../features/reports/pages/ReportsPage';
import MyNotificationsPage from '../../features/notifications/pages/MyNotificationsPage';
import NotificationSettingsPage from '../../features/notifications/pages/NotificationSettingsPage';
import SystemSettingsPage from '../../features/system/pages/SystemSettingsPage';
import SystemLogsPage from '../../features/system/pages/SystemLogsPage';
import TevkifatCentersPage from '../../features/accounting/pages/TevkifatCentersPage';
import TevkifatCenterDetailPage from '../../features/accounting/pages/TevkifatCenterDetailPage';
import TevkifatCenterCreatePage from '../../features/accounting/pages/TevkifatCenterCreatePage';
import AdvancesPage from '../../features/accounting/pages/AdvancesPage';
import PaymentsListPage from '../../features/payments/pages/PaymentsListPage';
import PaymentDetailPage from '../../features/payments/pages/PaymentDetailPage';
import PaymentInquiryPage from '../../features/payments/pages/PaymentInquiryPage';
import QuickPaymentEntryPage from '../../features/payments/pages/QuickPaymentEntryPage';
import RecentPaymentsPage from '../../features/payments/pages/RecentPaymentsPage';
import ProfilePage from '../../features/profile/pages/ProfilePage';
import InvoicesPage from '../../features/invoices/pages/InvoicesPage';
import WhatsAppSmsPage from '../../features/messaging/pages/WhatsAppSmsPage';
import WhatsAppChatPage from '../../features/messaging/pages/WhatsAppChatPage';
import AutoMessagingTemplatesPage from '../../features/messaging/pages/AutoMessagingTemplatesPage';
import WhatsAppBulkMessagesPage from '../../features/messaging/pages/WhatsAppBulkMessagesPage';
import KepPage from '../../features/kep/pages/KepPage';
import SmsBulkMessagesPage from '../../features/messaging/pages/SmsBulkMessagesPage';
import SmsTemplatesMessagesPage from '../../features/messaging/pages/SmsTemplatesMessagesPage';
import EmailBulkMessagesPage from '../../features/messaging/pages/EmailBulkMessagesPage';
import EmailTemplatesMessagesPage from '../../features/messaging/pages/EmailTemplatesMessagesPage';

/** WhatsApp sohbet rotaları (ProtectedRoute requiredAnyOf) */
const WA_CHAT_ROUTE_PERMS = [
  'WHATSAPP_CHAT_VIEW',
  'WHATSAPP_CHAT_SEND',
  'WHATSAPP_CHAT_MANAGE',
  'WHATSAPP_ACCESS',
  'NOTIFY_ALL_MEMBERS',
  'NOTIFY_REGION',
  'NOTIFY_OWN_SCOPE',
] as const;

const WA_BULK_ROUTE_PERMS = [
  'WHATSAPP_BULK_SEND',
  'WHATSAPP_ACCESS',
  'NOTIFY_ALL_MEMBERS',
] as const;

const WA_TEMPLATE_ROUTE_PERMS = [
  'WHATSAPP_TEMPLATE_VIEW',
  'WHATSAPP_TEMPLATE_MANAGE',
  'WHATSAPP_ACCESS',
  'NOTIFY_ALL_MEMBERS',
  'NOTIFY_REGION',
  'NOTIFY_OWN_SCOPE',
] as const;

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/uyelik-sorgula" element={<MembershipInquiryPage />} />
    <Route path="/legal/:page" element={<LegalPage />} />

    <Route element={<ProtectedRoute />}>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route element={<ProtectedRoute requiredPermission="MEMBER_LIST" alternativePermission="MEMBER_LIST_BY_PROVINCE" />}>
          <Route path="/members" element={<MembersListPage />} />
          <Route path="/members/status/:status" element={<MembersByStatusPage />} />
          <Route path="/members/:id" element={<MemberDetailPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="MEMBER_UPDATE" />}>
          <Route path="/members/:id/edit" element={<MemberUpdatePage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="MEMBER_HISTORY_VIEW" />}>
          <Route path="/members/status" element={<MemberHistoryPage />} />
        </Route>

        {/* Bekleyen başvurular: görüntüleme izni veya onay/red (MEMBER_LIST tek başına yetmez) */}
        <Route
          element={
            <ProtectedRoute
              requiredAnyOf={[
                'MEMBER_APPLICATIONS_VIEW',
                'MEMBER_APPROVE',
                'MEMBER_REJECT',
              ]}
            />
          }
        >
          <Route path="/members/applications" element={<MembersApplicationsPage />} />
        </Route>

        {/* Onaylı / beklemedeki üyeler: GET /members/approved ve üye listesi API ile uyumlu */}
        <Route
          element={
            <ProtectedRoute
              requiredAnyOf={[
                'MEMBER_APPROVE',
                'MEMBER_LIST',
                'MEMBER_LIST_BY_PROVINCE',
              ]}
            />
          }
        >
          <Route path="/members/approved" element={<ApprovedMembersPage />} />
          <Route path="/members/waiting" element={<ActiveWaitingMembersPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="MEMBER_CREATE_APPLICATION" />}>
          <Route path="/members/applications/new" element={<MemberApplicationCreatePage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="USER_LIST" />}>
          <Route path="/users" element={<UsersListPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/users/panel/:id" element={<PanelUserDetailPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="PANEL_USER_APPLICATION_APPROVE" />}>
          <Route path="/users/applications" element={<PanelUserApplicationsPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="ROLE_LIST" />}>
          <Route path="/roles" element={<RolesListPage />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="ROLE_CREATE" />}>
          <Route path="/roles/new" element={<RoleCreateEditPage />} />
        </Route>
        <Route element={<ProtectedRoute requiredAllOf={['ROLE_UPDATE', 'ROLE_MANAGE_PERMISSIONS']} />}>
          <Route path="/roles/:id/edit" element={<RoleCreateEditPage />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="ROLE_VIEW" />}>
          <Route path="/roles/:id" element={<RoleDetailPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="REGION_LIST" alternativePermission="MEMBER_LIST_BY_PROVINCE" />}>
          <Route path="/regions" element={<Navigate to="/regions/provinces" replace />} />
          <Route path="/regions/provinces" element={<RegionsPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="BRANCH_MANAGE" alternativePermission="MEMBER_LIST_BY_PROVINCE" />}>
          <Route path="/regions/branches" element={<BranchesPage />} />
          <Route path="/regions/branches/:id" element={<BranchDetailPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="INSTITUTION_LIST" />}>
          <Route path="/institutions" element={<InstitutionsPage />} />
          <Route path="/institutions/:id" element={<InstitutionDetailPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="PROFESSION_VIEW" />}>
          <Route path="/professions" element={<ProfessionsPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="CONTENT_MANAGE" />}>
          <Route path="/content" element={<ContentListPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="DOCUMENT_TEMPLATE_MANAGE" alternativePermission="DOCUMENT_SYSTEM_ACCESS" />}>
          <Route path="/documents/templates" element={<DocumentTemplatesPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="DOCUMENT_GENERATE_PDF" />}>
          <Route path="/documents/generate" element={<PdfGeneratePage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="DOCUMENT_MEMBER_HISTORY_VIEW" alternativePermission="DOCUMENT_SYSTEM_ACCESS" />}>
          <Route path="/documents/members" element={<MemberDocumentsPage />} />
          <Route path="/documents/members/:memberId" element={<MemberDocumentsPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="REPORT_GLOBAL_VIEW" alternativePermission="REPORT_REGION_VIEW" alternativePermission2="REPORT_MEMBER_STATUS_VIEW" alternativePermission3="REPORT_DUES_VIEW" />}>
          <Route path="/reports" element={<ReportsPage />} />
        </Route>

        <Route path="/notifications" element={<MyNotificationsPage />} />
        <Route path="/notifications/send" element={<Navigate to="/notifications" replace />} />
        <Route path="/notifications/settings" element={<NotificationSettingsPage />} />

        <Route element={<ProtectedRoute requiredAnyOf={[...WA_CHAT_ROUTE_PERMS]} />}>
          <Route path="/whatsapp" element={<WhatsAppSmsPage />}>
            <Route path="chat" element={<WhatsAppChatPage />} />
            <Route path="chat/:conversationId" element={<WhatsAppChatPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute requiredAnyOf={[...WA_BULK_ROUTE_PERMS]} />}>
          <Route path="/whatsapp/bulk" element={<WhatsAppBulkMessagesPage />} />
        </Route>
        <Route element={<ProtectedRoute requiredAnyOf={[...WA_TEMPLATE_ROUTE_PERMS]} />}>
          <Route path="/whatsapp/templates" element={<Navigate to="/whatsapp/auto-templates" replace />} />
          <Route path="/whatsapp/auto-templates" element={<AutoMessagingTemplatesPage />} />
        </Route>

        {/* Legacy messaging paths */}
        <Route path="/messaging" element={<Navigate to="/whatsapp" replace />} />
        <Route path="/messaging/chat" element={<Navigate to="/whatsapp/chat" replace />} />
        <Route path="/messaging/chat/:conversationId" element={<Navigate to="/whatsapp/chat" replace />} />
        <Route path="/messaging/bulk" element={<Navigate to="/whatsapp/bulk" replace />} />
        <Route path="/messaging/templates" element={<Navigate to="/whatsapp/auto-templates" replace />} />
        <Route path="/messaging/auto-templates" element={<Navigate to="/whatsapp/auto-templates" replace />} />
        <Route path="/kep" element={<KepPage />} />

        <Route element={<ProtectedRoute requiredPermission="NOTIFY_ALL_MEMBERS" />}>
          <Route path="/sms/bulk" element={<SmsBulkMessagesPage />} />
          <Route path="/sms/templates" element={<SmsTemplatesMessagesPage />} />
          <Route path="/email/bulk" element={<EmailBulkMessagesPage />} />
          <Route path="/email/templates" element={<EmailTemplatesMessagesPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="SYSTEM_SETTINGS_VIEW" />}>
          <Route path="/system/settings" element={<SystemSettingsPage />} />
          <Route path="/system/settings/user" element={<SystemSettingsPage />} />
          <Route path="/system/settings/dashboard-settings" element={<SystemSettingsPage />} />
          <Route path="/system/settings/reports" element={<SystemSettingsPage />} />
          <Route path="/system/settings/security" element={<SystemSettingsPage />} />
          <Route path="/system/settings/audit" element={<SystemSettingsPage />} />
          <Route path="/system/settings/maintenance" element={<SystemSettingsPage />} />
          <Route path="/system/settings/bulk-registration" element={<SystemSettingsPage />} />
          <Route path="/system/settings/messaging" element={<SystemSettingsPage />} />
          <Route path="/system/settings/whatsapp-messaging" element={<Navigate to="/system/settings/messaging" replace />} />
          <Route path="/system/settings/sms-messaging" element={<Navigate to="/system/settings/messaging" replace />} />
          <Route path="/system/settings/email-messaging" element={<Navigate to="/system/settings/messaging" replace />} />
          <Route path="/system/settings/kbs" element={<SystemSettingsPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="LOG_VIEW_ALL" alternativePermission="LOG_VIEW_OWN_SCOPE" />}>
          <Route path="/system/logs" element={<SystemLogsPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute
              requiredAnyOf={[
                'TEVKIFAT_CENTER_VIEW',
                'TEVKIFAT_CENTER_CREATE',
                'TEVKIFAT_CENTER_UPDATE',
                'TEVKIFAT_CENTER_DELETE',
              ]}
            />
          }
        >
          <Route path="/accounting/tevkifat-centers" element={<TevkifatCentersPage />} />
          <Route
            path="/accounting/tevkifat-centers/:id"
            element={<TevkifatCenterDetailPage />}
          />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="TEVKIFAT_CENTER_CREATE" />}>
          <Route path="/accounting/tevkifat-centers/new" element={<TevkifatCenterCreatePage />} />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="TEVKIFAT_CENTER_UPDATE" />}>
          <Route
            path="/accounting/tevkifat-centers/:id/edit"
            element={<TevkifatCenterCreatePage />}
          />
        </Route>
        <Route element={<ProtectedRoute requiredPermission="TEVKIFAT_VIEW" />}>
          <Route path="/accounting/advances" element={<AdvancesPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute
              requiredAnyOf={['MEMBER_PAYMENT_LIST', 'MEMBER_PAYMENT_ADD']}
            />
          }
        >
          <Route path="/payments/quick-entry" element={<QuickPaymentEntryPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="MEMBER_PAYMENT_LIST" />}>
          <Route path="/payments" element={<PaymentsListPage />} />
          <Route path="/payments/inquiry" element={<PaymentInquiryPage />} />
          <Route path="/payments/recent" element={<RecentPaymentsPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="MEMBER_PAYMENT_VIEW" />}>
          <Route path="/payments/:id" element={<PaymentDetailPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredPermission="INVOICE_VIEW" />}>
          <Route path="/invoices" element={<InvoicesPage />} />
        </Route>

        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  </Routes>
);

export default AppRoutes;
