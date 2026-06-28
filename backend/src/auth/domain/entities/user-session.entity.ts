/**
 * UserSession Domain Entity
 *
 * Represents a user authentication session
 */
export class UserSession {
  public readonly userId: string;
  public readonly email: string;
  public readonly roles: string[];
  public readonly permissions: string[];
  private _accessToken: string | null;
  private _refreshToken: string | null;
  private _createdAt: Date;

  private constructor(data: {
    userId: string;
    email: string;
    roles: string[];
    permissions: string[];
    accessToken: string | null;
    refreshToken: string | null;
    createdAt: Date;
  }) {
    this.userId = data.userId;
    this.email = data.email;
    this.roles = data.roles;
    this.permissions = data.permissions;
    this._accessToken = data.accessToken;
    this._refreshToken = data.refreshToken;
    this._createdAt = data.createdAt;
  }

  static create(data: {
    userId: string;
    email: string;
    roles: string[];
    permissions: string[];
    accessToken: string;
    refreshToken?: string;
  }): UserSession {
    return new UserSession({
      userId: data.userId,
      email: data.email,
      roles: data.roles,
      permissions: data.permissions,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      createdAt: new Date(),
    });
  }

  get accessToken(): string | null {
    return this._accessToken;
  }

  get refreshToken(): string | null {
    return this._refreshToken;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
