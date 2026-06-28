# Approvals Module - Clean Architecture Implementation

## 📁 Klasör Yapısı

```
approvals/
├── application/                  # Application Layer
│   └── services/                 # Application Services (Use Cases)
│       └── approval-application.service.ts
│
├── domain/                       # Domain Layer (Core Business Logic)
│   ├── entities/                 # Domain Entities
│   │   └── approval.entity.ts
│   └── repositories/            # Repository Interfaces (Ports)
│       └── approval.repository.interface.ts
│
├── infrastructure/              # Infrastructure Layer
│   └── persistence/             # Database Implementation
│       └── prisma-approval.repository.ts
│
├── presentation/                # Presentation Layer
│   └── controllers/            # HTTP Controllers
│       └── approvals.controller.ts
│
├── approvals.module.ts         # NestJS Module (Wiring)
└── approvals.service.ts        # Legacy Service (Backward Compatible)
```

## 🏗️ Mimari Katmanlar

### 1. Domain Layer (Core)
**Sorumluluklar:**
- Business logic (business rules)
- Domain entities (Approval)
- Repository interfaces (ports)

**Örnek:**
```typescript
// Domain Entity
const approval = Approval.create({ entityType, entityId, requestedBy, requestData });
approval.approve(approvedBy, approvalNote);
approval.reject(rejectedBy, rejectionNote);
```

### 2. Application Layer
**Sorumluluklar:**
- Use case orchestration
- Transaction management
- Entity updates on approval

**Örnek:**
```typescript
// Application Service
async approve(id: string, approvedBy: string, approvalNote?: string): Promise<Approval> {
  const approval = await this.repository.findById(id);
  approval.approve(approvedBy, approvalNote);
  await this.repository.save(approval);
  await this.updateEntity(approval.entityType, approval.entityId, approval.requestData, true);
  return approval;
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
- Domain entity (Approval)
- Repository interface
- Repository implementation (Prisma)
- Application service
- Presentation controller
- Module wiring

## 📝 Notes

- **Backward Compatibility**: `ApprovalsService` still exists for legacy code
- **Migration**: Gradually migrate from legacy service to application service
