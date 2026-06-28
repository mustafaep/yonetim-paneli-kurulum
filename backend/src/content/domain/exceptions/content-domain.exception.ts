/**
 * Content Domain Exceptions
 */
export class ContentNotFoundException extends Error {
  constructor(public readonly contentId?: string) {
    super(`Content not found${contentId ? `: ${contentId}` : ''}`);
    this.name = 'ContentNotFoundException';
  }
}

export class ContentAlreadyPublishedException extends Error {
  constructor() {
    super('Content is already published');
    this.name = 'ContentAlreadyPublishedException';
  }
}
