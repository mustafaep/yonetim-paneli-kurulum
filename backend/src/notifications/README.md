# Notifications Module - Clean Architecture Implementation

## 📁 Klasör Yapısı

```
notifications/
├── application/                  # Application Layer
│   ├── services/                 # Application Services (Use Cases)
│   │   └── notification-application.service.ts
│   └── dto/                      # Application DTOs
│       └── create-notification.dto.ts
│
├── domain/                       # Domain Layer (Core Business Logic)
│   ├── entities/                 # Domain Entities
│   │   └── notification.entity.ts
│   ├── repositories/            # Repository Interfaces (Ports)
│   │   └── notification.repository.interface.ts
│   └── exceptions/              # Domain Exceptions
│       └── notification-domain.exception.ts
│
├── infrastructure/              # Infrastructure Layer
│   └── persistence/             # Database Implementation
│       └── prisma-notification.repository.ts
│
├── presentation/                # Presentation Layer
│   ├── controllers/            # HTTP Controllers
│   │   └── notifications.controller.ts
│   ├── pipes/                   # Validation Pipes
│   │   └── notification-validation.pipe.ts
│   └── filters/                 # Exception Filters
│       └── notification-exception.filter.ts
│
├── services/                     # Infrastructure Services (Email, SMS)
│   ├── email.service.ts
│   └── sms.service.ts
│
├── queues/                       # Queue Infrastructure
│   └── notification.queue.ts
│
├── processors/                   # Queue Processors
│   └── notification.processor.ts
│
├── notifications.module.ts       # NestJS Module (Wiring)
└── notifications.service.ts      # Legacy Service (Backward Compatible)
```

## 🏗️ Mimari Katmanlar

### 1. Domain Layer (Core)
**Sorumluluklar:**
- Business logic (business rules)
- Domain entities (Notification)
- Domain exceptions
- Repository interfaces (ports)

**Örnek:**
```typescript
// Domain Entity
const notification = Notification.create({
  title: 'Yeni Duyuru',
  message: 'Mesaj içeriği',
  type: NotificationType.EMAIL,
  targetType: NotificationTargetType.ALL_MEMBERS,
  sentBy: 'user-id',
});
notification.validateTarget();
notification.markAsSent(100, 95, 5);
```

### 2. Application Layer
**Sorumluluklar:**
- Use case orchestration
- Transaction management
- Application services

**Örnek:**
```typescript
// Application Service
async createNotification(command: CreateNotificationCommand): Promise<Notification> {
  const notification = Notification.create({ ...dto, sentBy: userId }, '');
  notification.validateTarget();
  return await this.repository.create(notification);
}
```

### 3. Infrastructure Layer
**Sorumluluklar:**
- Database implementation (Prisma)
- Email/SMS services
- Queue infrastructure (BullMQ)

**Örnek:**
```typescript
// Repository Implementation
async findById(id: string): Promise<Notification | null> {
  const data = await this.prisma.notification.findUnique({ where: { id } });
  return data ? Notification.fromPersistence(data) : null;
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
@UsePipes(NotificationValidationPipe)
@UseFilters(NotificationExceptionFilter)
async create(@Body() dto: CreateNotificationDto) {
  return await this.notificationsService.create(dto, userId, user);
}
```

## 📋 Use Cases

- Create notification
- List notifications (with filters)
- Get notification by ID
- Send notification (queue-based or direct)
- Delete notification
- Mark notification as read
- Mark all notifications as read

## 🔐 Business Rules

1. **Target Validation**: REGION/SCOPE target types require targetId or scope metadata
2. **ALL_MEMBERS Restriction**: ALL_MEMBERS target type cannot have targetId
3. **Send Status**: Only PENDING notifications can be sent
4. **Scope Permission**: NOTIFY_OWN_SCOPE permission automatically sets SCOPE target type

## 📝 Notes

- **Backward Compatibility**: `NotificationsService` still exists for legacy code (send, getRecipients, etc.)
- **Partial Migration**: Notification creation and deletion migrated to Clean Architecture
- **Queue Infrastructure**: Email/SMS sending uses BullMQ queue system
- **Infrastructure Services**: EmailService and SmsService remain as infrastructure services
- **Future Work**: Send operation and recipient logic can be migrated following the same pattern
