/**
 * Membership Config Adapter
 *
 * Infrastructure katmanı: Config Service'i Domain Service için adapter'a çevirir.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service';
import { MembershipConfigAdapter } from '../../domain/services/member-registration-domain.service';

@Injectable()
export class PrismaMembershipConfigAdapter implements MembershipConfigAdapter {
  constructor(private readonly configService: ConfigService) {}

  async getAllowReRegistration(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_ALLOW_RE_REGISTRATION',
      true,
    );
  }

  async getRegistrationNumberFormat(): Promise<string> {
    return (
      this.configService.getSystemSetting(
        'MEMBERSHIP_REG_NUMBER_FORMAT',
        'SEQUENTIAL',
      ) || 'SEQUENTIAL'
    );
  }

  async getRegistrationNumberPrefix(): Promise<string> {
    return (
      this.configService.getSystemSetting('MEMBERSHIP_REG_NUMBER_PREFIX', '') ??
      ''
    ).trim();
  }

  async getRegistrationNumberStart(): Promise<number> {
    return this.configService.getSystemSettingNumber(
      'MEMBERSHIP_REG_NUMBER_START',
      1,
    );
  }

  async getAutoGenerateRegistrationNumber(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_AUTO_GENERATE_REG_NUMBER',
      false,
    );
  }

  async getDefaultStatus(): Promise<string> {
    return (
      this.configService.getSystemSetting(
        'MEMBERSHIP_DEFAULT_STATUS',
        'PENDING',
      ) || 'PENDING'
    );
  }

  async getAutoApprove(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_AUTO_APPROVE',
      false,
    );
  }

  async getRequireApproval(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_REQUIRE_APPROVAL',
      true,
    );
  }

  async getRequireBoardDecision(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_REQUIRE_BOARD_DECISION',
      false,
    );
  }

  async getAllowedSources(): Promise<string[]> {
    const allowedSourcesStr = this.configService.getSystemSetting(
      'MEMBERSHIP_ALLOWED_SOURCES',
      '',
    );
    return allowedSourcesStr
      ? allowedSourcesStr
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s !== '')
      : [];
  }

  async getRequireEmail(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_REQUIRE_EMAIL',
      false,
    );
  }

  async getRequireInstitutionRegNo(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_REQUIRE_INSTITUTION_REG_NO',
      false,
    );
  }

  async getRequireWorkUnit(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_REQUIRE_WORK_UNIT',
      false,
    );
  }

  async getRequireMotherName(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_REQUIRE_MOTHER_NAME',
      false,
    );
  }

  async getRequireFatherName(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_REQUIRE_FATHER_NAME',
      false,
    );
  }

  async getRequireBirthplace(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_REQUIRE_BIRTHPLACE',
      false,
    );
  }

  async getRequireGender(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_REQUIRE_GENDER',
      false,
    );
  }

  async getRequireEducation(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_REQUIRE_EDUCATION',
      false,
    );
  }

  async getRequirePhone(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_REQUIRE_PHONE',
      false,
    );
  }

  async getRequireProvinceDistrict(): Promise<boolean> {
    return this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_REQUIRE_PROVINCE_DISTRICT',
      false,
    );
  }

  async getMinAge(): Promise<number> {
    return this.configService.getSystemSettingNumber('MEMBERSHIP_MIN_AGE', 18);
  }
}
