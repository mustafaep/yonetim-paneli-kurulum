# Regions Module - Clean Architecture Implementation

## 📁 Klasör Yapısı

```
regions/
├── application/                  # Application Layer
│   ├── services/                 # Application Services (Use Cases)
│   │   ├── province-application.service.ts
│   │   └── district-application.service.ts
│   └── dto/                      # Application DTOs
│       ├── create-province.dto.ts
│       └── create-district.dto.ts
│
├── domain/                       # Domain Layer (Core Business Logic)
│   ├── entities/                 # Domain Entities
│   │   ├── province.entity.ts
│   │   └── district.entity.ts
│   ├── repositories/            # Repository Interfaces (Ports)
│   │   └── region.repository.interface.ts
│   └── exceptions/              # Domain Exceptions
│       └── region-domain.exception.ts
│
├── infrastructure/              # Infrastructure Layer
│   └── persistence/             # Database Implementation
│       ├── prisma-province.repository.ts
│       └── prisma-district.repository.ts
│
├── presentation/                # Presentation Layer
│   ├── controllers/            # HTTP Controllers
│   │   └── regions.controller.ts
│   ├── pipes/                   # Validation Pipes
│   │   └── region-validation.pipe.ts
│   └── filters/                 # Exception Filters
│       └── region-exception.filter.ts
│
├── regions.module.ts            # NestJS Module (Wiring)
├── regions.service.ts            # Legacy Service (Backward Compatible)
└── dto/                          # Legacy DTOs (for backward compatibility)
    └── ...
```

## 🏗️ Mimari Katmanlar

### 1. Domain Layer (Core)
**Sorumluluklar:**
- Business logic (business rules)
- Domain entities (Province, District)
- Domain exceptions
- Repository interfaces (ports)

**Örnek:**
```typescript
// Domain Entity
const province = Province.create({ name: 'İstanbul', code: '34' });
province.update({ name: 'İstanbul Updated', code: '34' });
```

### 2. Application Layer
**Sorumluluklar:**
- Use case orchestration
- Transaction management
- Application services

**Örnek:**
```typescript
// Application Service
async createProvince(command: CreateProvinceCommand): Promise<Province> {
  const province = Province.create({ name: dto.name, code: dto.code }, '');
  return await this.repository.create(province);
}
```

### 3. Infrastructure Layer
**Sorumluluklar:**
- Database implementation (Prisma)

**Örnek:**
```typescript
// Repository Implementation
async findById(id: string): Promise<Province | null> {
  const data = await this.prisma.province.findUnique({ where: { id } });
  return data ? Province.fromPersistence(data) : null;
}
```

### 4. Presentation Layer
**Sorumluluklar:**
- HTTP request/response handling
- Request validation
- Exception handling

**Örnek:**
```typescript
// Controller
@Post('provinces')
@UsePipes(RegionValidationPipe)
@UseFilters(RegionExceptionFilter)
async create(@Body() dto: CreateProvinceDto) {
  return await this.provinceService.createProvince({ dto });
}
```

## 📋 Use Cases

### Province Management
- Create province
- Update province
- List provinces
- Get province by ID

### District Management
- Create district
- Update district
- List districts (with optional province filter)
- Get district by ID

### Branch Management (Legacy)
- CRUD operations (still using legacy service)

### Institution Management (Legacy)
- CRUD operations (still using legacy service)

### User Scope Management (Legacy)
- Assign scope
- Update scope
- Delete scope
- Get user scopes

## 🔐 Business Rules

1. **District-Province Relation**: District must belong to specified province
2. **Scope Validation**: At least one scope field (province or district) must be provided
3. **Duplicate Scope**: User cannot have duplicate scopes
4. **Last Branch Protection**: System must have at least one branch

## 📝 Notes

- **Backward Compatibility**: `RegionsService` still exists for legacy code (Branch, Institution, UserScope)
- **Partial Migration**: Province and District are migrated to Clean Architecture
- **Future Work**: Branch, Institution, and UserScope can be migrated following the same pattern
