import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import axios, { AxiosInstance } from 'axios';

export interface SendSmsOptions {
  to: string;
  message: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private httpClient: AxiosInstance;
  private username: string;
  private password: string;
  private msgHeader: string;
  private apiUrl: string;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      // Güvenlik: Sırlar yalnızca .env üzerinden okunur, DB'de tutulmaz.
      this.username = this.configService.netgsmUsername || '';
      this.password = this.configService.netgsmPassword || '';
      this.msgHeader = this.configService.netgsmMsgHeader || '';
      this.apiUrl = this.configService.netgsmApiUrl;

      if (!this.username || !this.password) {
        this.logger.warn(
          'NetGSM credentials not configured. SMS sending will be disabled.',
        );
      }

      this.httpClient = axios.create({
        timeout: 10000,
      });
    } catch (error) {
      this.logger.error('Error initializing SMS client:', error);
      this.username = '';
      this.password = '';
      this.httpClient = axios.create({
        timeout: 10000,
      });
    }
  }

  async refreshConfig() {
    this.initializeClient();
  }

  async sendSms(options: SendSmsOptions): Promise<void> {
    // SMS gönderimi aktif mi kontrol et (önce NOTIFICATION_SMS_ENABLED, sonra SMS_ENABLED)
    const notificationSmsEnabled = this.configService.getSystemSettingBoolean(
      'NOTIFICATION_SMS_ENABLED',
      true,
    );
    const smsEnabled = this.configService.getSystemSettingBoolean(
      'SMS_ENABLED',
      true,
    );

    if (!notificationSmsEnabled) {
      this.logger.warn(
        'SMS notifications are disabled in notification settings.',
      );
      return;
    }

    if (!smsEnabled) {
      this.logger.warn('SMS sending is disabled in system settings.');
      return;
    }

    if (!this.username || !this.password) {
      this.logger.warn('NetGSM credentials not configured. SMS not sent.');
      return;
    }

    const { to, message } = options;

    // Telefon numarasını temizle (sadece rakamlar)
    const cleanPhone = to.replace(/\D/g, '');

    // Türkiye telefon numarası formatı kontrolü
    let phoneNumber = cleanPhone;
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '90' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('90')) {
      phoneNumber = '90' + phoneNumber;
    }

    try {
      // NetGSM API parametreleri
      const params = new URLSearchParams({
        usercode: this.username,
        password: this.password,
        gsmno: phoneNumber,
        message: message,
        msgheader: this.msgHeader,
        dil: 'TR', // Türkçe karakter desteği
      });

      const response = await this.httpClient.get(
        `${this.apiUrl}?${params.toString()}`,
      );

      // NetGSM yanıt formatı: "00" başarılı, diğerleri hata kodu
      const responseText = response.data?.toString().trim() || '';

      if (responseText.startsWith('00')) {
        this.logger.log(
          `SMS sent successfully to ${phoneNumber}. Response: ${responseText}`,
        );
      } else {
        const errorMessage = this.getErrorMessage(responseText);
        this.logger.error(
          `Failed to send SMS to ${phoneNumber}. Error code: ${responseText} - ${errorMessage}`,
        );
        throw new Error(
          `SMS sending failed: ${errorMessage} (code: ${responseText})`,
        );
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`NetGSM API error: ${error.message}`, error.stack);
        throw new Error(`SMS API error: ${error.message}`);
      }
      throw error;
    }
  }

  private getErrorMessage(code: string): string {
    const errorCodes: Record<string, string> = {
      '20': 'Mesaj metninde hata var',
      '30': 'Geçersiz kullanıcı adı, şifre veya yetkisiz IP',
      '40': 'Mesaj başlığı (msgheader) kayıtlı değil',
      '50': 'Abone hesabında yeterli kredi yok',
      '51': 'Abone hesabında yeterli kredi yok',
      '70': 'Hatalı sorgulama. Gönderdiğiniz parametrelerden birisi hatalı veya zorunlu alanlardan birisi eksik',
      '80': 'Gönderilemedi',
      '85': 'Mükerrer gönderim',
      '100': 'Sistem hatası',
      '101': 'Sistem hatası',
    };

    return errorCodes[code] || 'Bilinmeyen hata';
  }

  async sendBulkSms(smsList: SendSmsOptions[]): Promise<void> {
    // NetGSM toplu SMS gönderimi için ayrı bir metod
    // Şimdilik tek tek gönderiyoruz
    const results = await Promise.allSettled(
      smsList.map((sms) => this.sendSms(sms)),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      this.logger.warn(
        `${failed.length} SMS failed to send out of ${smsList.length}`,
      );
    }
  }
}
