# Content Module - Clean Architecture Implementation

## 📁 Klasör Yapısı

```
content/
├── application/                  # Application Layer
│   ├── services/                 # Application Services (Use Cases)
│   │   └── content-application.service.ts
│   └── dto/                      # Application DTOs
│       ├── create-content.dto.ts
│       └── update-content.dto.ts
│
├── domain/                       # Domain Layer (Core Business Logic)
│   ├── entities/                 # Domain Entities
│   │   └── content.entity.ts
│   ├── repositories/            # Repository Interfaces (Ports)
│   │   └── content.repository.interface.ts
│   └── exceptions/              # Domain Exceptions
│       └── content-domain.exception.ts
│
├── infrastructure/              # Infrastructure Layer
│   └── persistence/             # Database Implementation
│       └── prisma-content.repository.ts
│
├── presentation/                # Presentation Layer
│   ├── controllers/            # HTTP Controllers
│   │   └── content.controller.ts
│   ├── pipes/                   # Validation Pipes
│   │   └── content-validation.pipe.ts
│   └── filters/                 # Exception Filters
│       └── content-exception.filter.ts
│
├── content.module.ts            # NestJS Module (Wiring)
└── content.service.ts            # Legacy Service (Backward Compatible)
```

## 🏗️ Mimari Katmanlar

### 1. Domain Layer (Core)
**Sorumluluklar:**
- Business logic (business rules)
- Domain entities (Content)
- Domain exceptions

**Örnek:**
```typescript
// Domain Entity
const content = Content.create({
  title: 'Başlık',
  content: 'İçerik metni',
  type: ContentType.ANNOUNCEMENT,
  authorId: 'user-id',
});
content.publish();
content.update({ title: 'Yeni Başlık' });
```

### 2. Application Layer
**Sorumluluklar:**
- Use case orchestration
- Transaction management
- Application services

**Örnek:**
```typescript
// Application Service
async createContent(command: CreateContentCommand): Promise<Content> {
  const content = Content.create({ ...dto, authorId }, '');
  return await this.repository.create(content);
}
```

### 3. Infrastructure Layer
**Sorumluluklar:**
- Database implementation (Prisma)

**Örnek:**
```typescript
// Repository Implementation
async findById(id: string): Promise<Content | null> {
  const data = await this.prisma.content.findUnique({ where: { id } });
  return data ? Content.fromPersistence(data) : null;
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
@UsePipes(ContentValidationPipe)
@UseFilters(ContentExceptionFilter)
async create(@Body() dto: CreateContentDto) {
  return await this.contentService.createContent({ dto, authorId });
}
```

## 📋 Use Cases

- Create content
- Update content
- List contents (with optional type/status filters)
- Get content by ID
- Delete content
- Publish content

## 🔐 Business Rules

1. **Publish Protection**: Content can only be published once
2. **Default Status**: New content defaults to DRAFT status
3. **Author Tracking**: Content always tracks its author

## 📝 Notes

- **Backward Compatibility**: `ContentService` still exists for legacy code
- **Full Migration**: All operations migrated to Clean Architecture
- **Publish Date**: Automatically set when content is published
