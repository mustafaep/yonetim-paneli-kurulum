import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ProfessionsService } from '../../professions.service';
import { CreateProfessionDto } from '../../application/dto/create-profession.dto';
import { UpdateProfessionDto } from '../../application/dto/update-profession.dto';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';
import { ProfessionApplicationService } from '../../application/services/profession-application.service';
import { ProfessionExceptionFilter } from '../filters/profession-exception.filter';
import { ProfessionValidationPipe } from '../pipes/profession-validation.pipe';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Professions')
@ApiBearerAuth('JWT-auth')
@Controller('professions')
@UseFilters(ProfessionExceptionFilter)
export class ProfessionsController {
  constructor(
    private readonly professionsService: ProfessionsService,
    private readonly professionApplicationService: ProfessionApplicationService,
    private readonly prisma: PrismaService,
  ) {}

  @Permissions(Permission.PROFESSION_VIEW)
  @Get()
  @ApiOperation({
    summary: 'Meslek/Unvan listesini getir',
    description: 'Aktif meslek/unvanları listeler',
  })
  @ApiResponse({ status: 200, description: 'Meslek/Unvan listesi' })
  async listProfessions() {
    return this.professionsService.listProfessions();
  }

  @Permissions(Permission.PROFESSION_VIEW)
  @Get('all')
  @ApiOperation({
    summary: 'Tüm meslek/unvanları listele',
    description: 'Aktif ve pasif tüm meslek/unvanları listeler',
  })
  @ApiResponse({ status: 200, description: 'Tüm meslek/unvan listesi' })
  async listAllProfessions() {
    return this.professionsService.listAllProfessions();
  }

  @Permissions(Permission.PROFESSION_VIEW)
  @Get(':id')
  @ApiOperation({ summary: 'Meslek/Unvan detayını getir' })
  @ApiParam({ name: 'id', description: 'Meslek/Unvan ID' })
  @ApiResponse({ status: 200, description: 'Meslek/Unvan detayı' })
  @ApiResponse({ status: 404, description: 'Meslek/Unvan bulunamadı' })
  async getProfessionById(@Param('id') id: string) {
    return this.professionsService.getProfessionById(id);
  }

  @Permissions(Permission.PROFESSION_CREATE)
  @Post()
  @UsePipes(ProfessionValidationPipe)
  @ApiOperation({ summary: 'Meslek/Unvan oluştur' })
  @ApiBody({ type: CreateProfessionDto })
  @ApiResponse({ status: 201, description: 'Meslek/Unvan oluşturuldu' })
  async createProfession(@Body() dto: CreateProfessionDto) {
    const profession = await this.professionApplicationService.createProfession(
      { dto },
    );
    return await this.prisma.profession.findUnique({
      where: { id: profession.id },
    });
  }

  @Permissions(Permission.PROFESSION_UPDATE)
  @Patch(':id')
  @UsePipes(ProfessionValidationPipe)
  @ApiOperation({ summary: 'Meslek/Unvan güncelle' })
  @ApiParam({ name: 'id', description: 'Meslek/Unvan ID' })
  @ApiBody({ type: UpdateProfessionDto })
  @ApiResponse({ status: 200, description: 'Meslek/Unvan güncellendi' })
  @ApiResponse({ status: 404, description: 'Meslek/Unvan bulunamadı' })
  async updateProfession(
    @Param('id') id: string,
    @Body() dto: UpdateProfessionDto,
  ) {
    const profession = await this.professionApplicationService.updateProfession(
      {
        professionId: id,
        dto,
      },
    );
    return await this.prisma.profession.findUnique({
      where: { id: profession.id },
    });
  }

  @Permissions(Permission.PROFESSION_DELETE)
  @Delete(':id')
  @ApiOperation({
    summary: 'Meslek/Unvan sil',
    description: 'Kullanımda ise pasif yapar, değilse kalıcı olarak siler',
  })
  @ApiParam({ name: 'id', description: 'Meslek/Unvan ID' })
  @ApiResponse({
    status: 200,
    description: 'Meslek/Unvan silindi veya pasif yapıldı',
  })
  @ApiResponse({ status: 404, description: 'Meslek/Unvan bulunamadı' })
  async deleteProfession(@Param('id') id: string) {
    await this.professionApplicationService.deleteProfession({
      professionId: id,
    });
    return { message: 'Meslek/Unvan başarıyla silindi veya pasif yapıldı' };
  }
}
