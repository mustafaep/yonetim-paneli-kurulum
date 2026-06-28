/**
 * Member Approval Application Service
 *
 * Use case: Member approval işlemini orchestrate eder.
 *
 * Sorumluluklar:
 * - Transaction yönetimi
 * - Domain Service çağırma
 * - Cross-cutting concerns (history, events, documents)
 * - Repository koordinasyonu
 *
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
import { DocumentsService } from '../../../documents/documents.service';
import { WhatsAppTemplateService } from '../../../notifications/services/whatsapp-template.service';
import { SmsTemplateService } from '../../../notifications/services/sms-template.service';
import { EmailTemplateService } from '../../../notifications/services/email-template.service';
import {
  MemberNotFoundException,
  MemberCannotBeApprovedException,
  MemberApprovalMissingFieldsException,
} from '../../domain/exceptions/member-domain.exception';

/**
 * Approval için DTO (mevcut ApproveMemberDto'dan map edilecek)
 */
export interface ApproveMemberCommand {
  memberId: string;
  approvedByUserId: string;
  registrationNumber?: string;
  boardDecisionDate?: string;
  boardDecisionBookNo?: string;
  tevkifatCenterId?: string;
  tevkifatTitleId?: string;
  branchId?: string;
  memberGroupId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Onay sonucu - member ve boş bırakılmış alanlar (bilgilendirme için)
 */
export interface ApproveMemberResult {
  member: Member;
  emptyOptionalFields: string[];
}

@Injectable()
export class MemberApprovalApplicationService {
  private readonly logger = new Logger(MemberApprovalApplicationService.name);

  constructor(
    @Inject('MemberRepository')
    private readonly memberRepository: MemberRepository,
    @Inject('MemberMembershipPeriodRepository')
    private readonly membershipPeriodRepository: MemberMembershipPeriodRepository,
    private readonly memberHistoryService: MemberHistoryService,
    private readonly documentsService: DocumentsService,
    private readonly whatsAppTemplateService: WhatsAppTemplateService,
    private readonly smsTemplateService: SmsTemplateService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  /**
   * Use case: Member'ı approve et
   *
   * Orchestration:
   * 1. Member'ı repository'den al
   * 2. Domain Entity'de approve method'unu çağır (business rule'lar burada)
   * 3. Repository'ye kaydet
   * 4. History log
   * 5. Document file name update (optional, non-blocking)
   */
  async approveMember(
    command: ApproveMemberCommand,
  ): Promise<ApproveMemberResult> {
    // 1. Member'ı bul
    const member = await this.memberRepository.findById(command.memberId);
    if (!member) {
      throw new NotFoundException(`Üye bulunamadı: ${command.memberId}`);
    }

    // 2. History için veriyi sakla
    const oldData = this.prepareHistoryData(member);

    try {
      // 3. Domain Entity'de approve method'unu çağır
      // Business rule'lar burada çalışır (status check, validation)
      member.approve(command.approvedByUserId, {
        registrationNumber: command.registrationNumber,
        boardDecisionDate: command.boardDecisionDate,
        boardDecisionBookNo: command.boardDecisionBookNo,
        tevkifatCenterId: command.tevkifatCenterId,
        tevkifatTitleId: command.tevkifatTitleId,
        branchId: command.branchId,
        memberGroupId: command.memberGroupId,
      });

      // 4. Repository'ye kaydet
      await this.memberRepository.save(member);

      // 4b. Yeniden üyelik onayı: yeni Member satırında önceki iptal kaydına bağlantı varsa veya bu üyede kapalı dönem zaten varsa açık dönem oluştur
      const existingPeriods =
        await this.membershipPeriodRepository.findByMemberId(member.id);
      const isReRegistrationApproval =
        oldData.status === 'PENDING' &&
        (existingPeriods.length > 0 || !!member.previousCancelledMemberId);
      if (
        isReRegistrationApproval &&
        member.registrationNumber?.getValue() &&
        member.approvedAt
      ) {
        await this.membershipPeriodRepository.create({
          memberId: member.id,
          registrationNumber: member.registrationNumber.getValue(),
          periodStart: member.approvedAt,
          periodEnd: undefined,
          status: 'ACTIVE',
          approvedAt: member.approvedAt,
          approvedByUserId: command.approvedByUserId,
        });
      }

      // 5. History log
      const newData = this.prepareHistoryData(member);
      await this.memberHistoryService.logMemberUpdate(
        member.id,
        command.approvedByUserId,
        oldData,
        newData,
        command.ipAddress,
        command.userAgent,
      );

      // 6. Document file name update (non-blocking, error handling ile)
      if (command.registrationNumber) {
        try {
          await this.documentsService.updateMemberDocumentFileNames(
            member.id,
            command.registrationNumber,
          );
        } catch (error) {
          // Evrak güncelleme hatası olsa bile üye onayı devam etsin
          this.logger.warn(
            `Üye ${member.id} için evrak dosya isimleri güncellenirken hata: ${error.message}`,
          );
        }
      }

      // 7. Otomatik şablon gönderimi - WhatsApp, SMS, Email (non-blocking)
      try {
        await this.whatsAppTemplateService.triggerAutoSend(
          'MEMBER_APPROVED',
          member.id,
          command.approvedByUserId,
        );
      } catch (err: any) {
        this.logger.warn(
          `Üye ${member.id} onay WhatsApp şablonu gönderilemedi: ${err.message}`,
        );
      }

      try {
        await this.smsTemplateService.triggerAutoSend(
          'MEMBER_APPROVED',
          member.id,
          command.approvedByUserId,
        );
      } catch (err: any) {
        this.logger.warn(
          `Üye ${member.id} onay SMS şablonu gönderilemedi: ${err.message}`,
        );
      }

      try {
        await this.emailTemplateService.triggerAutoSend(
          'MEMBER_APPROVED',
          member.id,
          command.approvedByUserId,
        );
      } catch (err: any) {
        this.logger.warn(
          `Üye ${member.id} onay e-posta şablonu gönderilemedi: ${err.message}`,
        );
      }

      // 8. Boş bırakılmış başvuru alanlarını bilgilendirme için döndür
      const emptyOptionalFields = member.getEmptyApplicationDataFields();

      return { member, emptyOptionalFields };
    } catch (error) {
      // Domain exception'ları HTTP exception'a çevir
      if (error instanceof MemberCannotBeApprovedException) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof MemberApprovalMissingFieldsException) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof MemberNotFoundException) {
        throw new NotFoundException(error.message);
      }
      // registrationNumber çakışma hatası
      if (
        error instanceof Error &&
        error.message.includes('kayıt numarası')
      ) {
        throw new BadRequestException(error.message);
      }
      // Prisma unique constraint hatası
      const prismaError = error as { code?: string; meta?: { target?: string[] } };
      if (prismaError.code === 'P2002' && prismaError.meta?.target?.includes('registrationNumber')) {
        throw new BadRequestException(
          'Bu kayıt numarası zaten başka bir üyeye ait',
        );
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
      approvedByUserId: member.approvedByUserId,
      approvedAt: member.approvedAt,
      registrationNumber: member.registrationNumber?.getValue() || null,
      boardDecisionDate: member.boardDecisionDate,
      boardDecisionBookNo: member.boardDecisionBookNo,
      tevkifatCenterId: member.tevkifatCenterId,
      tevkifatTitleId: member.tevkifatTitleId,
      branchId: member.branchId,
      memberGroupId: member.memberGroupId,
    };
  }
}
