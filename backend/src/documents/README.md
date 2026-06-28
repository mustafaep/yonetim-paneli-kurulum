# Documents Module - Clean Architecture Implementation

## 📁 Klasör Yapısı

```
documents/
├── application/                  # Application Layer
│   ├── services/                 # Application Services (Use Cases)
│   │   └── document-template-application.service.ts
│   └── dto/                      # Application DTOs
│       ├── create-document-template.dto.ts
│       └── update-document-template.dto.ts
│
├── domain/                       # Domain Layer (Core Business Logic)
│   ├── entities/                 # Domain Entities
│   │   └── document-template.entity.ts
│   ├── repositories/            # Repository Interfaces (Ports)
│   │   └── document.repository.interface.ts
│   └── exceptions/              # Domain Exceptions
│       └── document-domain.exception.ts
│
├── infrastructure/              # Infrastructure Layer
│   └── persistence/             # Database Implementation
│       └── prisma-document-template.repository.ts
│
├── presentation/                # Presentation Layer
│   ├── controllers/            # HTTP Controllers
│   │   └── documents.controller.ts
│   ├── pipes/                   # Validation Pipes
│   │   └── document-validation.pipe.ts
│   └── filters/                 # Exception Filters
│       └── document-exception.filter.ts
│
├── services/                     # Infrastructure Services (File Storage, PDF)
│   ├── file-storage.service.ts
│   └── pdf.service.ts
│
├── documents.module.ts          # NestJS Module (Wiring)
└── documents.service.ts          # Legacy Service (Backward Compatible)
```

## 🏗️ Mimari Katmanlar

### 1. Domain Layer (Core)
**Sorumluluklar:**
- Business logic (business rules)
- Domain entities (DocumentTemplate)
- Domain exceptions
- Repository interfaces (ports)

**Örnek:**
```typescript
// Domain Entity
const template = DocumentTemplate.create({
  name: 'Üye Kayıt Belgesi',
  template: '<html>...</html>',
  type: DocumentTemplateType.MEMBER_REGISTRATION,
});
template.update({ name: 'Yeni Ad' });
template.deactivate();
```

### 2. Application Layer
**Sorumluluklar:**
- Use case orchestration
- Transaction management
- Application services

**Örnek:**
```typescript
// Application Service
async createTemplate(command: CreateDocumentTemplateCommand): Promise<DocumentTemplate> {
  const template = DocumentTemplate.create({ ...dto }, '');
  return await this.repository.create(template);
}
```

### 3. Infrastructure Layer
**Sorumluluklar:**
- Database implementation (Prisma)
- File storage (FileStorageService)
- PDF generation (PdfService)

**Örnek:**
```typescript
// Repository Implementation
async findById(id: string): Promise<DocumentTemplate | null> {
  const data = await this.prisma.documentTemplate.findUnique({ where: { id } });
  return data ? DocumentTemplate.fromPersistence(data) : null;
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
@Post('templates')
@UsePipes(DocumentValidationPipe)
@UseFilters(DocumentExceptionFilter)
async create(@Body() dto: CreateDocumentTemplateDto) {
  return await this.documentsService.createTemplate(dto);
}
```

## 📋 Use Cases

### Document Template Management
- Create template
- Update template
- List templates (active only or all)
- Get template by ID
- Delete template (soft delete)

### Member Document Management (Legacy)
- Generate PDF document
- Upload member document
- Approve/reject document
- View/download document
- List member documents

## 🔐 Business Rules

1. **Template Soft Delete**: Templates are deactivated (isActive: false) instead of hard delete
2. **Document Approval**: Documents must be in STAGING status to be approved
3. **Document Rejection**: Documents must be in STAGING status to be rejected
4. **File Security**: Uploaded files go through staging → approval → permanent flow

## 📝 Notes

- **Backward Compatibility**: `DocumentsService` still exists for legacy code (MemberDocument operations)
- **Partial Migration**: DocumentTemplate is migrated to Clean Architecture
- **Infrastructure Services**: FileStorageService and PdfService remain as infrastructure services
- **Future Work**: MemberDocument operations can be migrated following the same pattern
