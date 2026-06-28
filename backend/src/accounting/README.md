# Accounting Module - Clean Architecture Implementation

## 📁 Klasör Yapısı

```
accounting/
├── application/                  # Application Layer
│   ├── services/                 # Application Services (Use Cases)
│   │   └── tevkifat-center-application.service.ts
│   ├── dto/                      # Application DTOs (moved from root)
│   └── mappers/                  # Entity ↔ DTO Mappers
│
├── domain/                       # Domain Layer (Core Business Logic)
│   ├── entities/                 # Domain Entities
│   │   ├── tevkifat-center.entity.ts
│   │   ├── tevkifat-title.entity.ts
│   │   └── tevkifat-file.entity.ts
│   ├── value-objects/            # Value Objects
│   ├── repositories/            # Repository Interfaces (Ports)
│   │   ├── tevkifat-center.repository.interface.ts
│   │   ├── tevkifat-title.repository.interface.ts
│   │   └── tevkifat-file.repository.interface.ts
│   ├── services/                # Domain Services
│   └── exceptions/              # Domain Exceptions
│
├── infrastructure/              # Infrastructure Layer
│   └── persistence/             # Database Implementation
│       ├── prisma-tevkifat-center.repository.ts
│       ├── prisma-tevkifat-title.repository.ts
│       └── prisma-tevkifat-file.repository.ts
│
├── presentation/                # Presentation Layer
│   ├── controllers/            # HTTP Controllers
│   │   └── accounting.controller.ts
│   ├── pipes/                   # Validation Pipes
│   └── filters/                 # Exception Filters
│
├── accounting.module.ts        # NestJS Module (Wiring)
├── accounting.service.ts       # Legacy Service (Backward Compatible)
└── accounting.controller.ts    # Legacy Controller (Backward Compatible - will be removed)
```

## 🏗️ Mimari Katmanlar

### 1. Domain Layer (Core)
**Sorumluluklar:**
- Business logic (business rules)
- Domain entities (TevkifatCenter, TevkifatTitle, TevkifatFile)
- Repository interfaces (ports)

**Örnek:**
```typescript
// Domain Entity
const center = TevkifatCenter.create({ name: 'Merkez Adı' });
center.update({ name: 'Yeni Ad' });
center.deactivate();
```

### 2. Application Layer
**Sorumluluklar:**
- Use case orchestration
- Transaction management
- Cross-cutting concerns
- DTO mapping

**Örnek:**
```typescript
// Application Service
async createCenter(data: CreateTevkifatCenterDto): Promise<TevkifatCenter> {
  const center = TevkifatCenter.create(data);
  return await this.repository.create(center);
}
```

### 3. Infrastructure Layer
**Sorumluluklar:**
- Database implementation (Prisma)
- Repository implementations

**Örnek:**
```typescript
// Repository Implementation
async create(center: TevkifatCenter): Promise<TevkifatCenter> {
  const created = await this.prisma.tevkifatCenter.create({
    data: center.toPrismaCreateData(),
  });
  return TevkifatCenter.fromPrisma(created);
}
```

### 4. Presentation Layer
**Sorumluluklar:**
- HTTP request/response handling
- Request validation (DTOs)
- Exception handling (Filters)

**Örnek:**
```typescript
// Controller
@Post('tevkifat-centers')
async createTevkifatCenter(@Body() dto: CreateTevkifatCenterDto) {
  return this.applicationService.createCenter(dto);
}
```

## 🔄 Migration Status

### ✅ Completed
- Domain entities (TevkifatCenter, TevkifatTitle, TevkifatFile)
- Repository interfaces
- Repository implementations (Prisma)
- Application service (TevkifatCenter)
- Presentation controller (partial)
- Module wiring

### 🚧 In Progress
- Application services (TevkifatTitle, TevkifatFile)
- Complete presentation layer migration
- Mappers
- Exception filters

### 📋 TODO
- Complete all application services
- Add domain exceptions
- Add value objects if needed
- Complete presentation layer
- Remove legacy controller

## 📝 Notes

- **Backward Compatibility**: `AccountingService` and `AccountingController` still exist for legacy code
- **Migration**: Gradually migrate from legacy service to application services
- **Strangler Fig Pattern**: New architecture is being added alongside old code
