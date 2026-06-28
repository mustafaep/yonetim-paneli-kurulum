/**
 * Member Group Repository Interface (Port)
 */
import { MemberGroup } from '../entities/member-group.entity';

export interface MemberGroupRepository {
  findById(id: string): Promise<MemberGroup | null>;
  findByName(name: string): Promise<MemberGroup | null>;
  findAll(includeInactive?: boolean): Promise<MemberGroup[]>;
  findMaxOrder(): Promise<number>;
  save(memberGroup: MemberGroup): Promise<void>;
  create(memberGroup: MemberGroup): Promise<MemberGroup>;
  delete(id: string): Promise<void>;
  countMembersByMemberGroupId(memberGroupId: string): Promise<number>;
}
