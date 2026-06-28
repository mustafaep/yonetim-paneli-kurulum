/**
 * Member Cancellation Application Service
 *
 * Use case: Member cancellation işlemini orchestrate eder (ACTIVE → RESIGNED/EXPELLED/INACTIVE)
 *
 * Sorumluluklar:
 * - Transaction yönetimi
 * - Domain Entity çağırma
 * - Cross-cutting concerns (history)
 * - Repository koordinasyonu
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Member } from '../../domain/entities/member.entity';
import type { MemberRepository } from '../../domain/repositories/member.repository.interface';
import type { MemberMembershipPeriodRepository } from '../../domain/repositories/member-membership-period.repository.interface';
import { MemberHistoryService } from '../../member-history.service';
import { WhatsAppTemplateService } from '../../../notifications/services/whatsapp-template.service';
import { SmsTemplateService } from '../../../notifications/services/sms-template.service';
import { EmailTemplateService } from '../../../notifications/services/email-template.service';
import {
  MemberNotFoundException,
  MemberCannotBeCancelledException,
  MemberCancellationReasonRequiredException,
} from '../../domain/exceptions/member-domain.exception';
import { MemberStatusEnum } from '../../domain/value-objects/member-status.vo';

export interface CancelMemberCommand {
  memberId: string;
  cancelledByUserId: string;
  status: MemberStatusEnum; // RESIGNED, EXPELLED, veya INACTIVE
  cancellationReason: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class MemberCancellationApplicationService {
  private readonly logger = new Logger(
    MemberCancellationApplicationService.name,
  );

  constructor(
    @Inject('MemberRepository')
    private readonly memberRepository: MemberRepository,
    @Inject('MemberMembershipPeriodRepository')
    private readonly membershipPeriodRepository: MemberMembershipPeriodRepository,
    private readonly memberHistoryService: MemberHistoryService,
    private readonly whatsAppTemplateService: WhatsAppTemplateService,
    private readonly smsTemplateService: SmsTemplateService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  /**
   * Use case: Member'ın üyeliğini iptal et
   *
   * Orchestration:
   * 1. Member'ı repository'den al
   * 2. Domain Entity'de cancelMembership method'unu çağır (business rule'lar burada)
   * 3. Repository'ye kaydet
   * 4. History log
   */
  async cancelMembership(command: CancelMemberCommand): Promise<Member> {
    // 1. Member'ı bul
    const member = await this.memberRepository.findById(command.memberId);
    if (!member) {
      throw new NotFoundException(`Üye bulunamadı: ${command.memberId}`);
    }

    // 2. History için veriyi sakla
    const oldData = this.prepareHistoryData(member);

    // 2b. Üyelik dönemi kaydı için mevcut bilgileri sakla (cancelMembership öncesi)
    const regNo = member.registrationNumber?.getValue();
    const approvedAt = member.approvedAt;

    try {
      // 3. Domain Entity'de cancelMembership method'unu çağır
      // Business rule'lar burada çalışır (status check, validation)
      member.cancelMembership(command.cancelledByUserId, {
        status: command.status,
        cancellationReason: command.cancellationReason,
      });

      const cancelledAt = member.cancelledAt!;

      // 3b. Mevcut dönemi MemberMembershipPeriod'a yaz (üye numarası, onay tarihi, iptal bilgileri) – approvedAt yoksa iptal tarihi kullan
      const periodStart = approvedAt ?? cancelledAt;
      const regNoForPeriod = regNo ?? `Üye-${member.id.slice(-6)}`;
      await this.membershipPeriodRepository.create({
        memberId: member.id,
        registrationNumber: regNoForPeriod,
        periodStart,
        periodEnd: cancelledAt,
        status: command.status,
        cancellationReason: command.cancellationReason,
        cancelledAt,
        approvedAt: approvedAt ?? null,
        approvedByUserId: member.approvedByUserId ?? null,
        cancelledByUserId: command.cancelledByUserId,
      });

      // 4. Repository'ye kaydet
      await this.memberRepository.save(member);

      // 5. History log
      const newData = this.prepareHistoryData(member);
      await this.memberHistoryService.logMemberUpdate(
        member.id,
        command.cancelledByUserId,
        oldData,
        newData,
        command.ipAddress,
        command.userAgent,
      );

      // Otomatik şablon gönderimi - WhatsApp, SMS, Email (non-blocking)
      try {
        await this.whatsAppTemplateService.triggerAutoSend(
          'MEMBER_CANCELLED',
          member.id,
          command.cancelledByUserId,
        );
      } catch (err: any) {
        this.logger.warn(
          `Üye ${member.id} iptal WhatsApp şablonu gönderilemedi: ${err.message}`,
        );
      }

      try {
        await this.smsTemplateService.triggerAutoSend(
          'MEMBER_CANCELLED',
          member.id,
          command.cancelledByUserId,
        );
      } catch (err: any) {
        this.logger.warn(
          `Üye ${member.id} iptal SMS şablonu gönderilemedi: ${err.message}`,
        );
      }

      try {
        await this.emailTemplateService.triggerAutoSend(
          'MEMBER_CANCELLED',
          member.id,
          command.cancelledByUserId,
        );
      } catch (err: any) {
        this.logger.warn(
          `Üye ${member.id} iptal e-posta şablonu gönderilemedi: ${err.message}`,
        );
      }

      return member;
    } catch (error) {
      // Domain exception'ları HTTP exception'a çevir
      if (error instanceof MemberCannotBeCancelledException) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof MemberCancellationReasonRequiredException) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof MemberNotFoundException) {
        throw new NotFoundException(error.message);
      }
      // Diğer exception'ları re-throw et
      throw error;
    }
  }

  /**
   * History için data hazırla
   */
  private prepareHistoryData(member: Member): Record<string, any> {
    return {
      status: member.status.toString(),
      cancelledByUserId: member.cancelledByUserId,
      cancelledAt: member.cancelledAt,
      cancellationReason: member.cancellationReason,
    };
  }
}
