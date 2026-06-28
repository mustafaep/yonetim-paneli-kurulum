import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  ForbiddenException,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RegionsService } from '../../regions.service';
import { CreateProvinceDto, CreateDistrictDto } from '../../application/dto';
import {
  AssignUserScopeDto,
  UpdateUserScopeDto,
  CreateBranchDto,
  UpdateBranchDto,
  DeleteBranchDto,
  DeleteInstitutionDto,
  AssignBranchPresidentDto,
  CreateInstitutionDto,
  UpdateInstitutionDto,
} from '../../dto';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../../auth/decorators/current-user.decorator';
import { ProvinceApplicationService } from '../../application/services/province-application.service';
import { DistrictApplicationService } from '../../application/services/district-application.service';
import { RegionExceptionFilter } from '../filters/region-exception.filter';
import { RegionValidationPipe } from '../pipes/region-validation.pipe';

@ApiTags('Regions')
@ApiBearerAuth('JWT-auth')
@Controller('regions')
@UseFilters(RegionExceptionFilter)
export class RegionsController {
  constructor(
    private readonly regionsService: RegionsService,
    private readonly provinceService: ProvinceApplicationService,
    private readonly districtService: DistrictApplicationService,
  ) {}

  // -------- PROVINCE --------

  @Permissions(Permission.REGION_LIST, Permission.MEMBER_LIST_BY_PROVINCE)
  @Get('provinces')
  @ApiOperation({
    summary: 'İlleri listele',
    description: 'Tüm illeri listeler',
  })
  @ApiResponse({ status: 200, description: 'İl listesi', type: 'array' })
  async getProvinces(@CurrentUser() user: CurrentUserData) {
    return this.regionsService.listProvinces(user);
  }

  @Permissions(Permission.BRANCH_MANAGE)
  @Post('provinces')
  @UsePipes(RegionValidationPipe)
  @ApiOperation({
    summary: 'Yeni il oluştur',
    description: 'Yeni bir il kaydı oluşturur',
  })
  @ApiBody({ type: CreateProvinceDto })
  @ApiResponse({ status: 201, description: 'İl başarıyla oluşturuldu' })
  async createProvince(@Body() dto: CreateProvinceDto) {
    return this.regionsService.createProvince(dto);
  }

  @Permissions(Permission.REGION_LIST, Permission.MEMBER_LIST_BY_PROVINCE)
  @Get('provinces/:id')
  @ApiOperation({
    summary: 'İl detayını getir',
    description: 'Belirtilen ilin detaylarını getirir',
  })
  @ApiParam({ name: 'id', description: 'İl ID', example: 'province-uuid-123' })
  @ApiResponse({ status: 200, description: 'İl detayı' })
  @ApiResponse({ status: 404, description: 'İl bulunamadı' })
  async getProvinceById(@Param('id') id: string) {
    return this.regionsService.getProvinceById(id);
  }

  @Permissions(Permission.BRANCH_MANAGE)
  @Put('provinces/:id')
  @UsePipes(RegionValidationPipe)
  @ApiOperation({
    summary: 'İl bilgilerini güncelle',
    description: 'Mevcut il bilgilerini günceller',
  })
  @ApiParam({ name: 'id', description: 'İl ID', example: 'province-uuid-123' })
  @ApiBody({ type: CreateProvinceDto })
  @ApiResponse({ status: 200, description: 'İl başarıyla güncellendi' })
  @ApiResponse({ status: 404, description: 'İl bulunamadı' })
  async updateProvince(
    @Param('id') id: string,
    @Body() dto: CreateProvinceDto,
  ) {
    return this.regionsService.updateProvince(id, dto);
  }

  // -------- DISTRICT --------

  @Permissions(Permission.REGION_LIST, Permission.MEMBER_LIST_BY_PROVINCE)
  @Get('districts')
  @ApiOperation({
    summary: 'İlçeleri listele',
    description: 'Tüm ilçeleri veya belirli bir ile bağlı ilçeleri listeler',
  })
  @ApiQuery({
    name: 'provinceId',
    required: false,
    description: 'İl ID (filtreleme için)',
    example: 'province-uuid-123',
  })
  @ApiResponse({ status: 200, description: 'İlçe listesi', type: 'array' })
  async getDistricts(
    @Query('provinceId') provinceId?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.regionsService.listDistricts(provinceId, user);
  }

  @Permissions(Permission.BRANCH_MANAGE)
  @Post('districts')
  @UsePipes(RegionValidationPipe)
  @ApiOperation({
    summary: 'Yeni ilçe oluştur',
    description: 'Yeni bir ilçe kaydı oluşturur',
  })
  @ApiBody({ type: CreateDistrictDto })
  @ApiResponse({ status: 201, description: 'İlçe başarıyla oluşturuldu' })
  async createDistrict(@Body() dto: CreateDistrictDto) {
    return this.regionsService.createDistrict(dto);
  }

  @Permissions(Permission.REGION_LIST, Permission.MEMBER_LIST_BY_PROVINCE)
  @Get('districts/:id')
  @ApiOperation({
    summary: 'İlçe detayını getir',
    description: 'Belirtilen ilçenin detaylarını getirir',
  })
  @ApiParam({
    name: 'id',
    description: 'İlçe ID',
    example: 'district-uuid-456',
  })
  @ApiResponse({ status: 200, description: 'İlçe detayı' })
  @ApiResponse({ status: 404, description: 'İlçe bulunamadı' })
  async getDistrictById(@Param('id') id: string) {
    return this.regionsService.getDistrictById(id);
  }

  @Permissions(Permission.BRANCH_MANAGE)
  @Put('districts/:id')
  @UsePipes(RegionValidationPipe)
  @ApiOperation({
    summary: 'İlçe bilgilerini güncelle',
    description: 'Mevcut ilçe bilgilerini günceller',
  })
  @ApiParam({
    name: 'id',
    description: 'İlçe ID',
    example: 'district-uuid-456',
  })
  @ApiBody({ type: CreateDistrictDto })
  @ApiResponse({ status: 200, description: 'İlçe başarıyla güncellendi' })
  @ApiResponse({ status: 404, description: 'İlçe bulunamadı' })
  async updateDistrict(
    @Param('id') id: string,
    @Body() dto: CreateDistrictDto,
  ) {
    return this.regionsService.updateDistrict(id, dto);
  }

  // -------- USER SCOPE --------

  @Permissions(Permission.BRANCH_MANAGE)
  @Post('user-scope')
  @ApiOperation({
    summary: 'Kullanıcıya scope ata',
    description: 'Kullanıcıya il/ilçe yetkisi atar',
  })
  @ApiBody({ type: AssignUserScopeDto })
  @ApiResponse({ status: 201, description: 'Scope başarıyla atandı' })
  async assignUserScope(@Body() dto: AssignUserScopeDto) {
    return this.regionsService.assignUserScope(dto);
  }

  @Permissions(
    Permission.BRANCH_MANAGE,
    Permission.MEMBER_LIST_BY_PROVINCE,
    Permission.REGION_LIST,
  )
  @Get('user-scope/:userId')
  @ApiOperation({
    summary: 'Kullanıcı scope bilgilerini getir',
    description: 'Kullanıcının atanmış scope bilgilerini getirir',
  })
  @ApiParam({
    name: 'userId',
    description: 'Kullanıcı ID',
    example: 'user-uuid-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Kullanıcı scope bilgileri (array)',
  })
  @ApiResponse({
    status: 403,
    description: 'Bu kullanıcının scope bilgilerini görme yetkiniz yok',
  })
  async getUserScope(
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const hasBranchManage = user.permissions?.includes(
      Permission.BRANCH_MANAGE,
    );

    if (!hasBranchManage && userId !== user.userId) {
      throw new ForbiddenException(
        'Bu kullanıcının scope bilgilerini görme yetkiniz yok',
      );
    }

    return this.regionsService.getUserScope(userId);
  }

  @Permissions(Permission.BRANCH_MANAGE)
  @Patch('user-scope/:scopeId')
  @ApiOperation({
    summary: "Kullanıcı scope'unu güncelle",
    description: 'Belirtilen scope kaydını günceller',
  })
  @ApiParam({
    name: 'scopeId',
    description: 'Scope ID',
    example: 'scope-uuid-123',
  })
  @ApiBody({ type: UpdateUserScopeDto })
  @ApiResponse({ status: 200, description: 'Scope başarıyla güncellendi' })
  @ApiResponse({ status: 404, description: 'Scope bulunamadı' })
  @ApiResponse({
    status: 400,
    description: 'Geçersiz scope bilgisi veya duplicate scope',
  })
  async updateUserScope(
    @Param('scopeId') scopeId: string,
    @Body() dto: UpdateUserScopeDto,
  ) {
    return this.regionsService.updateUserScope(scopeId, dto);
  }

  @Permissions(Permission.BRANCH_MANAGE)
  @Delete('user-scope/:scopeId')
  @ApiOperation({
    summary: "Kullanıcı scope'unu sil",
    description: 'Belirtilen scope kaydını siler',
  })
  @ApiParam({
    name: 'scopeId',
    description: 'Scope ID',
    example: 'scope-uuid-123',
  })
  @ApiResponse({ status: 200, description: 'Scope başarıyla silindi' })
  @ApiResponse({ status: 404, description: 'Scope bulunamadı' })
  async deleteUserScope(@Param('scopeId') scopeId: string) {
    await this.regionsService.deleteUserScope(scopeId);
    return { message: 'Scope başarıyla silindi' };
  }

  // -------- BRANCH --------

  @Permissions(Permission.BRANCH_MANAGE, Permission.MEMBER_LIST_BY_PROVINCE)
  @Get('branches')
  @ApiOperation({
    summary: 'Şubeleri listele',
    description: 'Tüm şubeleri veya filtrelenmiş listeyi getirir',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Aktif mi?',
    example: true,
    type: Boolean,
  })
  @ApiQuery({
    name: 'provinceId',
    required: false,
    description: 'İl ID (filtreleme için)',
    example: 'province-uuid-123',
  })
  @ApiQuery({
    name: 'districtId',
    required: false,
    description: 'İlçe ID (filtreleme için)',
    example: 'district-uuid-456',
  })
  @ApiResponse({ status: 200, description: 'Şube listesi', type: 'array' })
  async getBranches(
    @Query('isActive') isActive?: string,
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
  ) {
    const filters: {
      isActive?: boolean;
      provinceId?: string;
      districtId?: string;
    } = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (provinceId) filters.provinceId = provinceId;
    if (districtId) filters.districtId = districtId;

    return this.regionsService.listBranches(filters);
  }

  @Permissions(Permission.BRANCH_MANAGE)
  @Get('branches/:id')
  @ApiOperation({
    summary: 'Şube detayını getir',
    description: 'Belirtilen şubenin detaylarını getirir',
  })
  @ApiParam({ name: 'id', description: 'Şube ID', example: 'branch-uuid-123' })
  @ApiResponse({ status: 200, description: 'Şube detayı' })
  @ApiResponse({ status: 404, description: 'Şube bulunamadı' })
  async getBranchById(@Param('id') id: string) {
    return this.regionsService.getBranchById(id);
  }

  @Permissions(Permission.BRANCH_MANAGE)
  @Post('branches')
  @ApiOperation({
    summary: 'Yeni şube oluştur',
    description: 'Yeni bir şube kaydı oluşturur',
  })
  @ApiBody({ type: CreateBranchDto })
  @ApiResponse({ status: 201, description: 'Şube başarıyla oluşturuldu' })
  async createBranch(@Body() dto: CreateBranchDto) {
    return this.regionsService.createBranch(dto);
  }

  @Permissions(Permission.BRANCH_MANAGE)
  @Put('branches/:id')
  @ApiOperation({
    summary: 'Şube bilgilerini güncelle',
    description: 'Mevcut şube bilgilerini günceller',
  })
  @ApiParam({ name: 'id', description: 'Şube ID', example: 'branch-uuid-123' })
  @ApiBody({ type: UpdateBranchDto })
  @ApiResponse({ status: 200, description: 'Şube başarıyla güncellendi' })
  @ApiResponse({ status: 404, description: 'Şube bulunamadı' })
  async updateBranch(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.regionsService.updateBranch(id, dto);
  }

  @Permissions(Permission.BRANCH_MANAGE)
  @Delete('branches/:id')
  @ApiOperation({
    summary: 'Şube sil',
    description:
      'Mevcut şubeyi siler. Üyelere ne yapılacağını belirtmek için body içinde memberActionType ve targetBranchId gönderilmelidir.',
  })
  @ApiParam({ name: 'id', description: 'Şube ID', example: 'branch-uuid-123' })
  @ApiBody({ type: DeleteBranchDto })
  @ApiResponse({ status: 200, description: 'Şube başarıyla silindi' })
  @ApiResponse({ status: 404, description: 'Şube veya hedef şube bulunamadı' })
  async deleteBranch(@Param('id') id: string, @Body() dto: DeleteBranchDto) {
    await this.regionsService.deleteBranch(id, dto);
    return { message: 'Şube başarıyla silindi' };
  }

  @Permissions(Permission.BRANCH_MANAGE)
  @Post('branches/:id/assign-president')
  @ApiOperation({
    summary: 'Şube başkanı ata',
    description: 'Şubeye başkan kullanıcı atar',
  })
  @ApiParam({ name: 'id', description: 'Şube ID', example: 'branch-uuid-123' })
  @ApiBody({ type: AssignBranchPresidentDto })
  @ApiResponse({ status: 200, description: 'Başkan başarıyla atandı' })
  @ApiResponse({ status: 404, description: 'Şube veya kullanıcı bulunamadı' })
  async assignBranchPresident(
    @Param('id') id: string,
    @Body() dto: AssignBranchPresidentDto,
  ) {
    return this.regionsService.assignBranchPresident(id, dto);
  }

  // -------- INSTITUTION --------

  @Permissions(
    Permission.INSTITUTION_LIST,
    Permission.MEMBER_CREATE_APPLICATION,
    Permission.MEMBER_UPDATE,
  )
  @Get('institutions')
  @ApiOperation({
    summary: 'Kurumları listele',
    description:
      'Tüm kurumları veya filtrelenmiş listeyi getirir. Üye kayıt/güncelleme için MEMBER_CREATE_APPLICATION veya MEMBER_UPDATE izni de yeterlidir.',
  })
  @ApiQuery({
    name: 'provinceId',
    required: false,
    description: 'İl ID (filtreleme için)',
    example: 'province-uuid-123',
  })
  @ApiQuery({
    name: 'districtId',
    required: false,
    description: 'İlçe ID (filtreleme için)',
    example: 'district-uuid-456',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Aktif mi?',
    example: true,
    type: Boolean,
  })
  @ApiResponse({ status: 200, description: 'Kurum listesi', type: 'array' })
  async getInstitutions(
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const filters: {
      provinceId?: string;
      districtId?: string;
      isActive?: boolean;
    } = {};
    if (provinceId) filters.provinceId = provinceId;
    if (districtId) filters.districtId = districtId;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    return this.regionsService.listInstitutions(
      filters.provinceId,
      filters.districtId,
      filters.isActive,
    );
  }

  @Permissions(Permission.INSTITUTION_VIEW)
  @Get('institutions/:id')
  @ApiOperation({
    summary: 'Kurum detayını getir',
    description: 'Belirtilen kurumun detaylarını getirir',
  })
  @ApiParam({
    name: 'id',
    description: 'Kurum ID',
    example: 'institution-uuid-123',
  })
  @ApiResponse({ status: 200, description: 'Kurum detayı' })
  @ApiResponse({ status: 404, description: 'Kurum bulunamadı' })
  async getInstitutionById(@Param('id') id: string) {
    return this.regionsService.getInstitutionById(id);
  }

  @Permissions(Permission.INSTITUTION_CREATE)
  @Post('institutions')
  @ApiOperation({
    summary: 'Yeni kurum oluştur',
    description: 'Yeni bir kurum kaydı oluşturur',
  })
  @ApiBody({ type: CreateInstitutionDto })
  @ApiResponse({ status: 201, description: 'Kurum başarıyla oluşturuldu' })
  async createInstitution(
    @Body() dto: CreateInstitutionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.regionsService.createInstitution(dto, user.userId);
  }

  @Permissions(Permission.INSTITUTION_UPDATE)
  @Put('institutions/:id')
  @ApiOperation({
    summary: 'Kurum bilgilerini güncelle',
    description: 'Mevcut kurum bilgilerini günceller',
  })
  @ApiParam({
    name: 'id',
    description: 'Kurum ID',
    example: 'institution-uuid-123',
  })
  @ApiBody({ type: UpdateInstitutionDto })
  @ApiResponse({ status: 200, description: 'Kurum başarıyla güncellendi' })
  @ApiResponse({ status: 404, description: 'Kurum bulunamadı' })
  async updateInstitution(
    @Param('id') id: string,
    @Body() dto: UpdateInstitutionDto,
  ) {
    return this.regionsService.updateInstitution(id, dto);
  }

  @Permissions(Permission.INSTITUTION_APPROVE)
  @Post('institutions/:id/approve')
  @ApiOperation({
    summary: 'Kurumu onayla',
    description: 'Kurumu aktif hale getirir',
  })
  @ApiParam({
    name: 'id',
    description: 'Kurum ID',
    example: 'institution-uuid-123',
  })
  @ApiResponse({ status: 200, description: 'Kurum başarıyla onaylandı' })
  @ApiResponse({ status: 404, description: 'Kurum bulunamadı' })
  async approveInstitution(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.regionsService.approveInstitution(id, user.userId);
  }

  @Permissions(Permission.INSTITUTION_UPDATE)
  @Delete('institutions/:id')
  @ApiOperation({
    summary: 'Kurum sil',
    description:
      'Mevcut kurumu siler (soft delete). Üyelere ne yapılacağını belirtmek için body içinde memberActionType ve targetInstitutionId gönderilmelidir.',
  })
  @ApiParam({
    name: 'id',
    description: 'Kurum ID',
    example: 'institution-uuid-123',
  })
  @ApiBody({ type: DeleteInstitutionDto })
  @ApiResponse({ status: 200, description: 'Kurum başarıyla silindi' })
  @ApiResponse({ status: 404, description: 'Kurum bulunamadı' })
  async deleteInstitution(
    @Param('id') id: string,
    @Body() dto: DeleteInstitutionDto,
  ) {
    await this.regionsService.deleteInstitution(id, dto);
    return { message: 'Kurum başarıyla silindi' };
  }
}
