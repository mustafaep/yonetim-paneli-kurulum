// src/types/user.ts

/** Backend'deki CustomRole.name değerleri; ADMIN seed ile oluşturulan sistem rolüdür. */
export type Role = string;

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  isActive: boolean;
  /** Üyeye bağlı panel kullanıcısı ise dolu; üyeliğe düşürme bu satırlarda gösterilir */
  memberId?: string | null;
}

export interface UserDetail extends UserListItem {
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    nationalId: string;
    phone: string | null;
    email: string | null;
    status: string;
    registrationNumber: string | null;
  } | null;
}
