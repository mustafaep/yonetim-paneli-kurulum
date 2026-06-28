# Roles Module - Clean Architecture Implementation

## 📁 Klasör Yapısı

```
roles/
├── application/                  # Application Layer
│   ├── services/                 # Application Services (Use Cases)
│   │   ├── role-creation-application.service.ts
│   │   ├── role-query-application.service.ts
│   │   ├── role-update-application.service.ts
│   │   ├── role-permissions-update-application.service.ts
│   │   └── role-deletion-application.service.ts
│   ├── dto/                      # Application DTOs
│   │   ├── create-role.dto.ts
│   │   ├── update-role.dto.ts
│   │   └── update-role-permissions.dto.ts
│   └── mappers/                  # Entity ↔ DTO Mappers
│       └── role.mapper.ts
│
├── domain/                       # Domain Layer (Core Business Logic)
│   ├── entities/                 # Domain Entities
│   │   └── role.entity.ts
│   ├── value-objects/            # Value Objects
│   │   └── role-name.vo.ts
│   ├── repositories/            # Repository Interfaces (Ports)
│   │   └── role.repository.interface.ts
│   ├── services/                # Domain Services
│   │   └── role-management-domain.service.ts
│   └── exceptions/              # Domain Exceptions
│       └── role-domain.exception.ts
│
├── infrastructure/              # Infrastructure Layer
│   └── persistence/             # Database Implementation
│       └── prisma-role.repository.ts
│
├── presentation/                # Presentation Layer
│   ├── controllers/            # HTTP Controllers
│   │   └── roles.controller.ts
│   ├── pipes/                   # Validation Pipes
│   │   └── role-validation.pipe.ts
│   └── filters/                 # Exception Filters
│       └── role-exception.filter.ts
│
├── roles.module.ts            # NestJS Module (Wiring)
├── roles.service.ts           # Legacy Service (Backward Compatible)
└── dto/                        # Legacy DTOs (for backward compatibility)
    └── role-response.dto.ts
```

## 🏗️ Mimari Katmanlar

### 1. Domain Layer (Core)
**Sorumluluklar:**
- Business logic (business rules)
- Domain entities (Role)
- Value objects (RoleName)
- Domain services (complex business logic)
- Domain exceptions
- Repository interfaces (ports)

**Örnek:**
```typescript
// Domain Entity
const role = Role.create(data);
role.update(updateData);
role.delete(userCount);

// Value Object
const roleName = RoleName.create('Muhasebe Uzmanı');
```

### 2. Application Layer
**Sorumluluklar:**
- Use case orchestration
- Transaction management
- Cross-cutting concerns
- DTO mapping
- Application services

**Örnek:**
```typescript
// Application Service
async createRole(command: CreateRoleCommand): Promise<Role> {
  await this.roleManagementDomainService.validateNameUniqueness(dto.name);
  const role = Role.create(data);
  return await this.repository.create(role);
}
```

### 3. Infrastructure Layer
**Sorumluluklar:**
- Database implementation (Prisma)
- External service integrations

**Örnek:**
```typescript
// Repository Implementation
async findById(id: string): Promise<Role | null> {
  const data = await this.prisma.customRole.findFirst(...);
  return data ? Role.fromPersistence(data) : null;
}
```

### 4. Presentation Layer
**Sorumluluklar:**
- HTTP request/response handling
- Request validation
- Exception handling
- DTO transformation

**Örnek:**
```typescript
// Controller
@Post()
@UsePipes(RoleValidationPipe)
@UseFilters(RoleExceptionFilter)
async create(@Body() dto: CreateRoleDto) {
  const role = await this.roleCreationService.createRole({ dto });
  return RoleMapper.toResponseDto(role);
}
```

## 🔄 Data Flow

1. **Request** → Controller (Presentation)
2. **Validation** → Validation Pipe
3. **Orchestration** → Application Service
4. **Business Logic** → Domain Entity / Domain Service
5. **Persistence** → Repository (Infrastructure)
6. **Response** → Mapper → DTO → Controller

## 📋 Use Cases

### Role Creation
- Name uniqueness validation
- ADMIN role cannot be created
- Permission validation
- Role creation

### Role Query
- Find by ID
- List all roles
- Include users if needed

### Role Update
- Name uniqueness validation (if changed)
- ADMIN role cannot be modified
- Update role properties

### Role Permissions Update
- ADMIN role permissions cannot be modified
- Replace all permissions

### Role Deletion
- ADMIN role cannot be deleted
- Check if role has assigned users
- Soft delete

## 🔐 Business Rules

1. **ADMIN Role Protection**: ADMIN role cannot be created, modified, or deleted
2. **Name Uniqueness**: Role name must be unique
3. **User Assignment Check**: Role with assigned users cannot be deleted
4. **Permission Management**: ADMIN role always has all permissions (shown but not stored)

## 🧪 Testing Strategy

- **Unit Tests**: Domain entities, value objects, domain services
- **Integration Tests**: Application services, repository implementations
- **E2E Tests**: Controller endpoints

## 📝 Notes

- **Backward Compatibility**: `RolesService` still exists for legacy code
- **ADMIN Role**: Special handling for ADMIN role (all permissions, cannot be modified)
- **Mapper Pattern**: Ready for use when services return Domain Entities
- **Scope Management**: Scopes are managed at user-role assignment level, not at role level
