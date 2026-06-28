# Members Module - Clean Architecture Implementation

## 📁 Klasör Yapısı

```
members/
├── application/                  # Application Layer
│   ├── services/                 # Application Services (Use Cases)
│   │   ├── member-approval-application.service.ts
│   │   ├── member-activation-application.service.ts
│   │   ├── member-cancellation-application.service.ts
│   │   ├── member-creation-application.service.ts
│   │   ├── member-rejection-application.service.ts
│   │   └── member-update-application.service.ts
│   ├── dto/                      # Application DTOs
│   │   ├── create-member-application.dto.ts
│   │   ├── approve-member.dto.ts
│   │   ├── cancel-member.dto.ts
│   │   ├── update-member.dto.ts
│   │   └── delete-member.dto.ts
│   └── mappers/                  # Entity ↔ DTO Mappers
│       └── member.mapper.ts
│
├── domain/                       # Domain Layer (Core Business Logic)
│   ├── entities/                 # Domain Entities
│   │   └── member.entity.ts
│   ├── value-objects/            # Value Objects
│   │   ├── national-id.vo.ts
│   │   ├── registration-number.vo.ts
│   │   └── member-status.vo.ts
│   ├── repositories/            # Repository Interfaces (Ports)
│   │   └── member.repository.interface.ts
│   ├── services/                # Domain Services
│   │   └── member-registration-domain.service.ts
│   └── exceptions/              # Domain Exceptions
│       └── member-domain.exception.ts
│
├── infrastructure/              # Infrastructure Layer
│   ├── persistence/             # Database Implementation
│   │   └── prisma-member.repository.ts
│   ├── external/                # External Services (future)
│   └── config/                  # Config Adapters
│       └── membership-config.adapter.ts
│
├── presentation/                # Presentation Layer
│   ├── controllers/            # HTTP Controllers
│   │   └── members.controller.ts
│   ├── pipes/                   # Validation Pipes
│   │   └── member-validation.pipe.ts
│   └── filters/                 # Exception Filters
│       └── member-exception.filter.ts
│
├── members.module.ts            # NestJS Module (Wiring)
├── members.service.ts           # Legacy Service (Backward Compatible)
├── members.controller.ts        # Legacy Controller (Backward Compatible)
├── member-scope.service.ts      # Scope Service
└── member-history.service.ts     # History Service
```

## 🏗️ Mimari Katmanlar

### 1. Domain Layer (Core)
**Sorumluluklar:**
- Business logic (business rules)
- Domain entities (Member)
- Value objects (MemberStatus, NationalId, RegistrationNumber)
- Domain services (complex business logic)
- Domain exceptions
- Repository interfaces (ports)

**Örnek:**
```typescript
// Domain Entity
const member = Member.create(data);
member.approve(userId, approvalData); // Business rule burada

// Value Object
const status = MemberStatus.pending();
if (status.canBeApproved()) { ... }
```

### 2. Application Layer
**Sorumluluklar:**
- Use case orchestration
- Transaction management
- Cross-cutting concerns (history, logging)
- DTO mapping
- Application services

**Örnek:**
```typescript
// Application Service
async approveMember(command: ApproveMemberCommand): Promise<Member> {
  const member = await this.repository.findById(command.memberId);
  member.approve(command.userId, command.approvalData);
  await this.repository.save(member);
  await this.historyService.log(...);
  return member;
}
```

### 3. Infrastructure Layer
**Sorumluluklar:**
- Database implementation (Prisma)
- External service adapters
- Config adapters
- Repository implementations

**Örnek:**
```typescript
// Repository Implementation
async save(member: Member): Promise<void> {
  const data = member.toPrismaUpdateData();
  await this.prisma.member.update({ where: { id: member.id }, data });
}
```

### 4. Presentation Layer
**Sorumluluklar:**
- HTTP request/response handling
- Request validation (DTOs)
- Response mapping (Mappers)
- Exception handling (Filters)

**Örnek:**
```typescript
// Controller
@Post(':id/approve')
async approve(@Param('id') id: string, @Body() dto: ApproveMemberDto) {
  const member = await this.appService.approveMember({ memberId: id, ... });
  return MemberMapper.toResponseDto(member);
}
```

## 🔄 Data Flow

```
HTTP Request
    ↓
Controller (Presentation)
    ↓
Application Service (Application)
    ↓
Domain Entity (Domain) ← Business Rules
    ↓
Repository Interface (Domain Port)
    ↓
Repository Implementation (Infrastructure)
    ↓
Database (Prisma)
```

## 📋 Dependency Rules

### ✅ Doğru Kullanım
- **Domain** → Hiçbir katmana bağımlı değil (sadece kendi içinde)
- **Application** → Domain'e bağımlı (repository interface, entities)
- **Infrastructure** → Domain ve Application'a bağımlı (implementasyon)
- **Presentation** → Application'a bağımlı (application services)

### ❌ Yanlış Kullanım
- Domain → Infrastructure (Prisma import etmek ❌)
- Domain → Application (Application service import etmek ❌)
- Application → Infrastructure (Prisma import etmek ❌, repository interface kullan ✅)

## 🎯 Use Cases

### 1. Member Approval
```
Controller → MemberApprovalApplicationService → Member.approve() → Repository.save()
```

### 2. Member Creation
```
Controller → MemberCreationApplicationService → MemberRegistrationDomainService → Member.create() → Repository.create()
```

### 3. Member Update
```
Controller → MemberUpdateApplicationService → Member.update() → Repository.save()
```

## 🔧 Dependency Injection

```typescript
// Module'de wiring
{
  provide: 'MemberRepository', // Token (Port)
  useClass: PrismaMemberRepository, // Implementation (Adapter)
}
```

## 📝 Best Practices

1. **Domain Logic**: Her zaman Domain Entity içinde
2. **Use Cases**: Application Service'te orchestrate et
3. **Data Access**: Repository pattern kullan (interface + implementation)
4. **DTO Mapping**: Mapper pattern kullan
5. **Exception Handling**: Domain exceptions → HTTP exceptions (Filter)
6. **Validation**: DTO validation (class-validator) + Domain validation

## 🚀 Migration Strategy

### Strangler Fig Pattern
- Eski kod korunuyor (backward compatible)
- Yeni mimari yavaş yavaş entegre ediliyor
- Eski service'ler yeni application service'leri kullanıyor

```typescript
// Eski service (backward compatible)
async approve(id: string, userId: string, dto: ApproveMemberDto) {
  return this.memberApprovalApplicationService.approveMember({ ... });
}
```

## 📚 Shared Kernel

Proje genelinde kullanılan shared yapılar:
- `shared/domain/base/` - Base entity ve value object
- `shared/application/interfaces/` - Repository ve UnitOfWork interfaces
- `shared/infrastructure/` - Shared infrastructure implementations

## 🔍 Testing Strategy

### Unit Tests
- Domain Entity (business rules)
- Value Objects (validation)
- Domain Services

### Integration Tests
- Application Services (repository mock)
- Repository Implementation (test database)

### E2E Tests
- Controller → Application Service → Repository → Database

## 📖 Kaynaklar

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [NestJS Best Practices](https://docs.nestjs.com/)
