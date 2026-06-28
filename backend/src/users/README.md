# Users Module - Clean Architecture Implementation

## 📁 Klasör Yapısı

```
users/
├── application/                  # Application Layer
│   ├── services/                 # Application Services (Use Cases)
│   │   ├── user-creation-application.service.ts
│   │   ├── user-query-application.service.ts
│   │   └── user-update-roles-application.service.ts
│   ├── dto/                      # Application DTOs
│   │   └── create-user.dto.ts
│   └── mappers/                  # Entity ↔ DTO Mappers
│       └── user.mapper.ts
│
├── domain/                       # Domain Layer (Core Business Logic)
│   ├── entities/                 # Domain Entities
│   │   └── user.entity.ts
│   ├── value-objects/            # Value Objects
│   │   └── email.vo.ts
│   ├── repositories/            # Repository Interfaces (Ports)
│   │   └── user.repository.interface.ts
│   ├── services/                # Domain Services
│   │   └── user-registration-domain.service.ts
│   └── exceptions/              # Domain Exceptions
│       └── user-domain.exception.ts
│
├── infrastructure/              # Infrastructure Layer
│   └── persistence/             # Database Implementation
│       └── prisma-user.repository.ts
│
├── presentation/                # Presentation Layer
│   ├── controllers/            # HTTP Controllers
│   │   └── users.controller.ts
│   ├── pipes/                   # Validation Pipes
│   │   └── user-validation.pipe.ts
│   └── filters/                 # Exception Filters
│       └── user-exception.filter.ts
│
├── users.module.ts            # NestJS Module (Wiring)
└── users.service.ts           # Legacy Service (Backward Compatible)
```

## 🏗️ Mimari Katmanlar

### 1. Domain Layer (Core)
**Sorumluluklar:**
- Business logic (business rules)
- Domain entities (User)
- Value objects (Email)
- Domain services (complex business logic)
- Domain exceptions
- Repository interfaces (ports)

**Örnek:**
```typescript
// Domain Entity
const user = User.create(data);
user.validateMemberRequirement(hasAdminRole);

// Value Object
const email = Email.create('user@example.com');
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
async createUser(command: CreateUserCommand): Promise<User> {
  await this.registrationDomainService.validateEmailUniqueness(email);
  const user = User.create(data);
  return await this.repository.create(user);
}
```

### 3. Infrastructure Layer
**Sorumluluklar:**
- Database implementation (Prisma)
- External service integrations
- Configuration adapters

**Örnek:**
```typescript
// Repository Implementation
async findById(id: string): Promise<User | null> {
  const data = await this.prisma.user.findFirst(...);
  return data ? User.fromPersistence(data) : null;
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
@UsePipes(UserValidationPipe)
@UseFilters(UserExceptionFilter)
async create(@Body() dto: CreateUserDto) {
  const user = await this.userCreationService.createUser({ dto });
  return UserMapper.toResponseDto(user);
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

### User Creation
- Email uniqueness validation
- Member requirement validation (non-admin users)
- Scope validation (for scope-restricted roles)
- Password hashing
- Member linking

### User Query
- Find by ID
- Find by Email
- List all users

### User Roles Update
- Update user roles
- Role validation

## 🔐 Business Rules

1. **Email Uniqueness**: Email must be unique across all users
2. **Member Requirement**: Non-admin users must be linked to a member
3. **Member Link**: A member can only be linked to one user
4. **Scope Requirement**: Users with scope-restricted roles must have scopes
5. **Scope Validation**: District must belong to selected province

## 🧪 Testing Strategy

- **Unit Tests**: Domain entities, value objects, domain services
- **Integration Tests**: Application services, repository implementations
- **E2E Tests**: Controller endpoints

## 📝 Notes

- **Backward Compatibility**: `UsersService` still exists for legacy code
- **Migration**: Gradually migrate from legacy service to application services
- **Mapper Pattern**: Ready for use when services return Domain Entities
