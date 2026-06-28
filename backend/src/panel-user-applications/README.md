# Panel User Applications Module - Clean Architecture Implementation

## 📁 Klasör Yapısı

```
panel-user-applications/
├── application/                  # Application Layer
│   └── services/                 # Application Services (Use Cases)
│       └── panel-user-application-application.service.ts
│
├── domain/                       # Domain Layer (Core Business Logic)
│   ├── entities/                 # Domain Entities
│   │   └── panel-user-application.entity.ts
│   └── repositories/            # Repository Interfaces (Ports)
│       └── panel-user-application.repository.interface.ts
│
├── infrastructure/              # Infrastructure Layer
│   └── persistence/             # Database Implementation
│       └── prisma-panel-user-application.repository.ts
│
├── presentation/                # Presentation Layer
│   └── controllers/            # HTTP Controllers
│       └── panel-user-applications.controller.ts
│
├── panel-user-applications.module.ts  # NestJS Module (Wiring)
└── panel-user-applications.service.ts  # Legacy Service (Backward Compatible)
```

## 🏗️ Mimari Katmanlar

### 1. Domain Layer (Core)
**Sorumluluklar:**
- Business logic (business rules)
- Domain entities (PanelUserApplication)
- Repository interfaces (ports)

**Örnek:**
```typescript
// Domain Entity
const application = PanelUserApplication.create({
  memberId,
  requestedRoleId,
  requestNote,
});
application.approve(reviewedBy, reviewNote, createdUserId);
application.reject(reviewedBy, reviewNote);
```

### 2. Application Layer
**Sorumluluklar:**
- Use case orchestration
- Transaction management
- User creation on approval
- Scope validation

**Örnek:**
```typescript
// Application Service
async approveApplication(id: string, data: {...}, reviewedByUserId: string): Promise<PanelUserApplication> {
  const application = await this.repository.findById(id);
  // Validate email, scopes, etc.
  const newUser = await this.usersService.create({...}, application.memberId);
  application.approve(reviewedByUserId, data.reviewNote, newUser.id);
  await this.repository.save(application);
  return application;
}
```

### 3. Infrastructure Layer
**Sorumluluklar:**
- Database implementation (Prisma)
- Repository implementations

### 4. Presentation Layer
**Sorumluluklar:**
- HTTP request/response handling
- Request validation (DTOs)
- Exception handling

## 🔄 Migration Status

### ✅ Completed
- Domain entity (PanelUserApplication)
- Repository interface
- Repository implementation (Prisma)
- Application service
- Presentation controller
- Module wiring

## 📝 Notes

- **Backward Compatibility**: `PanelUserApplicationsService` still exists for legacy code
- **Migration**: Gradually migrate from legacy service to application service
- **Special Features**: User creation on approval, scope validation
