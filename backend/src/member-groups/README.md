# Member Groups Module - Clean Architecture Implementation

## 📁 Klasör Yapısı

```
member-groups/
├── application/                  # Application Layer
│   ├── services/                 # Application Services (Use Cases)
│   │   └── member-group-application.service.ts
│   └── dto/                      # Application DTOs
│       ├── create-member-group.dto.ts
│       └── update-member-group.dto.ts
│
├── domain/                       # Domain Layer (Core Business Logic)
│   ├── entities/                 # Domain Entities
│   │   └── member-group.entity.ts
│   ├── repositories/            # Repository Interfaces (Ports)
│   │   └── member-group.repository.interface.ts
│   ├── services/                # Domain Services
│   │   └── member-group-management-domain.service.ts
│   └── exceptions/              # Domain Exceptions
│       └── member-group-domain.exception.ts
│
├── infrastructure/              # Infrastructure Layer
│   └── persistence/             # Database Implementation
│       └── prisma-member-group.repository.ts
│
├── presentation/                # Presentation Layer
│   ├── controllers/            # HTTP Controllers
│   │   └── member-groups.controller.ts
│   ├── pipes/                   # Validation Pipes
│   │   └── member-group-validation.pipe.ts
│   └── filters/                 # Exception Filters
│       └── member-group-exception.filter.ts
│
├── member-groups.module.ts      # NestJS Module (Wiring)
└── member-groups.service.ts     # Legacy Service (Backward Compatible)
```

## 🏗️ Mimari Katmanlar

### 1. Domain Layer (Core)
**Sorumluluklar:**
- Business logic (business rules)
- Domain entities (MemberGroup)
- Domain exceptions
- Repository interfaces (ports)
- Domain services (complex business logic)

**Örnek:**
```typescript
// Domain Entity
const memberGroup = MemberGroup.create({ name: 'Öğretmenler', order: 1 });
memberGroup.update({ name: 'Öğretmenler Updated', isActive: false });
memberGroup.changeOrder(2);
memberGroup.deactivate();
```

### 2. Application Layer
**Sorumluluklar:**
- Use case orchestration
- Transaction management
- Application services

**Örnek:**
```typescript
// Application Service
async createMemberGroup(command: CreateMemberGroupCommand): Promise<MemberGroup> {
  await this.domainService.validateNameUniqueness(dto.name);
  const memberGroup = MemberGroup.create({ name: dto.name, order }, '');
  return await this.repository.create(memberGroup);
}
```

### 3. Infrastructure Layer
**Sorumluluklar:**
- Database implementation (Prisma)

**Örnek:**
```typescript
// Repository Implementation
async findById(id: string): Promise<MemberGroup | null> {
  const data = await this.prisma.memberGroup.findUnique({ where: { id } });
  return data ? MemberGroup.fromPersistence(data) : null;
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
@UsePipes(MemberGroupValidationPipe)
@UseFilters(MemberGroupExceptionFilter)
async create(@Body() dto: CreateMemberGroupDto) {
  return await this.memberGroupService.createMemberGroup({ dto });
}
```

## 📋 Use Cases

- Create member group
- Update member group
- List member groups (active only or all)
- Get member group by ID
- Delete member group (soft delete if in use, hard delete otherwise)
- Move member group (up/down ordering)

## 🔐 Business Rules

1. **Name Uniqueness**: Member group name must be unique
2. **Delete Protection**: If member group is used by members, it's deactivated instead of deleted
3. **Soft Delete**: When in use, member group is marked as inactive (isActive: false)
4. **Order Management**: Groups can be reordered using move operations (up/down)
5. **Auto Order**: If order is not specified, it's automatically set to max order + 1

## 📝 Notes

- **Backward Compatibility**: `MemberGroupsService` still exists for legacy code
- **Full Migration**: All operations migrated to Clean Architecture
- **Order Management**: Move operations swap orders between adjacent groups
