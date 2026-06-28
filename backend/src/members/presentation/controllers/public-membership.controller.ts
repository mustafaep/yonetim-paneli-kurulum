import {
  Body,
  Controller,
  Post,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../../../auth/decorators/public.decorator';
import { MembersService } from '../../members.service';
import { PublicMembershipLookupDto } from '../../dto/public-membership-lookup.dto';
import { MembershipInquiryTokenGuard } from '../../guards/membership-inquiry-token.guard';
import { MembershipInquiryRateLimitGuard } from '../../guards/membership-inquiry-rate-limit.guard';

@ApiTags('Public')
@Controller('public')
export class PublicMembershipController {
  constructor(private readonly membersService: MembersService) {}

  @Public()
  @UseGuards(MembershipInquiryRateLimitGuard, MembershipInquiryTokenGuard)
  @Post('membership-inquiry')
  @ApiOperation({
    summary: 'TC ile aktif üyelik sorgusu (kimlik dışında bilgi dönmez)',
    description:
      'MEMBERSHIP_INQUIRY_TOKEN tanımlıysa X-Membership-Inquiry-Token veya ?token= zorunludur. IP başına hız sınırı uygulanır.',
  })
  @ApiHeader({
    name: 'X-Membership-Inquiry-Token',
    required: false,
    description:
      'Backend MEMBERSHIP_INQUIRY_TOKEN ile aynı değer (tercih edilen iletim)',
  })
  @ApiQuery({
    name: 'token',
    required: false,
    description: 'Header yerine sorgu parametresi (POST ile birlikte kullanılabilir)',
  })
  @ApiBody({ type: PublicMembershipLookupDto })
  @ApiResponse({
    status: 200,
    description: 'isMember true ise memberSince ISO tarih; değilse null',
  })
  @ApiResponse({ status: 400, description: 'Geçersiz TC formatı' })
  @ApiResponse({ status: 401, description: 'Eksik veya geçersiz sorgulama anahtarı' })
  @ApiResponse({ status: 429, description: 'Çok fazla istek (rate limit)' })
  async membershipInquiry(@Body() dto: PublicMembershipLookupDto) {
    const digits = String(dto.nationalId ?? '').replace(/\D/g, '');
    if (digits.length !== 11) {
      throw new BadRequestException(
        'TC Kimlik Numarası 11 haneli olmalıdır.',
      );
    }
    return this.membersService.publicActiveMembershipLookup(digits);
  }
}
