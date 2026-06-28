/**
 * Domain Event Base
 *
 * Shared Domain: Domain events için base class
 *
 * Domain Events: Domain içinde gerçekleşen önemli olayları temsil eder.
 * Örnek: MemberApprovedEvent, MemberActivatedEvent, etc.
 */
export abstract class DomainEvent {
  public readonly occurredOn: Date;
  public readonly eventId: string;

  constructor() {
    this.occurredOn = new Date();
    this.eventId = `${this.constructor.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  abstract getEventName(): string;
}
