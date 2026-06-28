/**
 * Document Domain Exceptions
 */
export class DocumentTemplateNotFoundException extends Error {
  constructor(public readonly templateId?: string) {
    super(`Document template not found${templateId ? `: ${templateId}` : ''}`);
    this.name = 'DocumentTemplateNotFoundException';
  }
}

export class MemberDocumentNotFoundException extends Error {
  constructor(public readonly documentId?: string) {
    super(`Member document not found${documentId ? `: ${documentId}` : ''}`);
    this.name = 'MemberDocumentNotFoundException';
  }
}

export class DocumentCannotBeApprovedException extends Error {
  constructor(public readonly currentStatus: string) {
    super(`Document cannot be approved. Current status: ${currentStatus}`);
    this.name = 'DocumentCannotBeApprovedException';
  }
}

export class DocumentCannotBeRejectedException extends Error {
  constructor(public readonly currentStatus: string) {
    super(`Document cannot be rejected. Current status: ${currentStatus}`);
    this.name = 'DocumentCannotBeRejectedException';
  }
}

export class DocumentNotApprovedException extends Error {
  constructor() {
    super('Document is not approved yet');
    this.name = 'DocumentNotApprovedException';
  }
}
