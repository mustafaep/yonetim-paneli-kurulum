# Professions Module - Clean Architecture Implementation

## 📁 Klasör Yapısı

```
professions/
├── application/                  # Application Layer
│   ├── services/                 # Application Services (Use Cases)
│   │   └── profession-application.service.ts
│   └── dto/                      # Application DTOs
│       ├── create-profession.dto.ts
│       └── update-profession.dto.ts
│
├── domain/                       # Domain Layer (Core Business Logic)
│   ├── entities/                 # Domain Entities
│   │   └── profession.entity.ts
│   ├── repositories/            # Repository Interfaces (Ports)
│   │   └── profession.repository.interface.ts
│   ├── services/                # Domain Services
│   │   └── profession-management-domain.service.ts
│   └── exceptions/              # Domain Exceptions
│       └── profession-domain.exception.ts
│
├── infrastructure/              # Infrastructure Layer
│   └── persistence/             # Database Implementation
│       └── prisma-profession.repository.ts
│
├── presentation/                # Presentation Layer
│   ├── controllers/            # HTTP Controllers
│   │   └── professions.controller.ts
│   ├── pipes/                   # Validation Pipes
│   │   └── profession-validation.pipe.ts
│   └── filters/                 # Exception Filters
│       └── profession-exception.filter.ts
│
├── professions.module.ts        # NestJS Module (Wiring)
└── professions.service.ts        # Legacy Service (Backward Compatible)
```

## 🏗️ Mimari Katmanlar

### 1. Domain Layer (Core)
**Sorumluluklar:**
- Business logic (business rules)
- Domain entities (Profession)
- Domain exceptions
- Repository interfaces (ports)
- Domain services (complex business logic)

**Örnek:**
```typescript
// Domain Entity
const profession = Profession.create({ name: 'Öğretmen' });
profession.update({ name: 'Öğretmen Updated', isActive: false });
profession.deactivate();
```

### 2. Application Layer
**Sorumluluklar:**
- Use case orchestration
- Transaction management
- Application services

**Örnek:**
```typescript
// Application Service
async createProfession(command: CreateProfessionCommand): Promise<Profession> {
  await this.domainService.validateNameUniqueness(dto.name);
  const profession = Profession.create({ name: dto.name }, '');
  return await this.repository.create(profession);
}
```

### 3. Infrastructure Layer
**Sorumluluklar:**
- Database implementation (Prisma)

**Örnek:**
```typescript
// Repository Implementation
async findById(id: string): Promise<Profession | null> {
  const data = await this.prisma.profession.findUnique({ where: { id } });
  return data ? Profession.fromPersistence(data) : null;
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
@Post()
@UsePipes(ProfessionValidationPipe)
@UseFilters(ProfessionExceptionFilter)
async create(@Body() dto: CreateProfessionDto) {
  return await this.professionService.createProfession({ dto });
}
```

## 📋 Use Cases

- Create profession
- Update profession
- List professions (active only or all)
- Get profession by ID
- Delete profession (soft delete if in use, hard delete otherwise)

## 🔐 Business Rules

1. **Name Uniqueness**: Profession name must be unique
2. **Delete Protection**: If profession is used by members, it's deactivated instead of deleted
3. **Soft Delete**: When in use, profession is marked as inactive (isActive: false)

## 📝 Notes

- **Backward Compatibility**: `ProfessionsService` still exists for legacy code
- **Full Migration**: All operations migrated to Clean Architecture
