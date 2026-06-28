import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfessionDto } from './application/dto/create-profession.dto';
import { UpdateProfessionDto } from './application/dto/update-profession.dto';
import { ProfessionApplicationService } from './application/services/profession-application.service';

@Injectable()
export class ProfessionsService {
  constructor(
    private prisma: PrismaService,
    private professionApplicationService: ProfessionApplicationService,
  ) {}

  /**
   * Meslek/Unvan listesini getir
   */
  async listProfessions() {
    return this.prisma.profession.findMany({
      where: {
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Tüm meslek/unvanları getir (aktif ve pasif)
   */
  async listAllProfessions() {
    return this.prisma.profession.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Meslek/Unvan detayını getir
   */
  async getProfessionById(id: string) {
    const profession = await this.prisma.profession.findUnique({
      where: { id },
    });

    if (!profession) {
      throw new NotFoundException('Meslek/Unvan bulunamadı');
    }

    return profession;
  }

  /**
   * Meslek/Unvan oluştur
   */
  async createProfession(dto: CreateProfessionDto) {
    const profession = await this.professionApplicationService.createProfession(
      { dto },
    );
    return await this.prisma.profession.findUnique({
      where: { id: profession.id },
    });
  }

  async updateProfession(id: string, dto: UpdateProfessionDto) {
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

  async deleteProfession(id: string) {
    await this.professionApplicationService.deleteProfession({
      professionId: id,
    });
    return await this.prisma.profession.findUnique({ where: { id } });
  }
}
