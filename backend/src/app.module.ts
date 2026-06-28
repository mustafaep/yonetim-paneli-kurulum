import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { MembersModule } from './members/members.module';
import { RegionsModule } from './regions/regions.module';
import { ConfigModule } from './config/config.module.js';
import { RolesModule } from './roles/roles.module';
import { ContentModule } from './content/content.module';
import { SystemModule } from './system/system.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { AccountingModule } from './accounting/accounting.module';
import { PaymentsModule } from './payments/payments.module';
import { DocumentsModule } from './documents/documents.module';
import { ProfessionsModule } from './professions/professions.module';
import { MemberGroupsModule } from './member-groups/member-groups.module';
import { PanelUserApplicationsModule } from './panel-user-applications/panel-user-applications.module';
import { ImportsModule } from './imports/imports.module';
import { InvoicesModule } from './invoices/invoices.module';
import { HealthModule } from './health/health.module';
import { SystemLogInterceptor } from './common/interceptors/system-log.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ImportsModule,
    UsersModule,
    AuthModule,
    MembersModule,
    RegionsModule,
    RolesModule,
    ContentModule,
    SystemModule,
    NotificationsModule,
    ReportsModule,
    ApprovalsModule,
    AccountingModule,
    PaymentsModule,
    InvoicesModule,
    DocumentsModule,
    ProfessionsModule,
    MemberGroupsModule,
    PanelUserApplicationsModule,
    HealthModule,
  ],
  providers: [
    // 1. JWT
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // 2. Permission
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    // 3. Logging Interceptor (DB ayarlarına göre log seviyesi)
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // 4. System Log Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: SystemLogInterceptor,
    },
  ],
})
export class AppModule {}
