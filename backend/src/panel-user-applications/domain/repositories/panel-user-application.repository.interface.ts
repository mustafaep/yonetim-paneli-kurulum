/**
 * PanelUserApplication Repository Interface (Port)
 */
import {
  PanelUserApplication,
  PanelUserApplicationStatus,
} from '../entities/panel-user-application.entity';

export interface PanelUserApplicationRepository {
  findById(id: string): Promise<PanelUserApplication | null>;
  findByMemberId(memberId: string): Promise<PanelUserApplication | null>;
  findAll(status?: PanelUserApplicationStatus): Promise<PanelUserApplication[]>;
  save(application: PanelUserApplication): Promise<void>;
  create(application: PanelUserApplication): Promise<PanelUserApplication>;
}
