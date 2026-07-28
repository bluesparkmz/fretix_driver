import type { DashboardStats, Load, LoadType } from '@/services/loads';
import type { AppNotification } from '@/services/notifications';
import type { LoadProposal } from '@/services/proposals';
import type { Vehicle } from '@/services/vehicles';

export type ResourceState<T> = {
  data: T;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoaded: boolean;
  error: string | null;
};

export type AppDataState = {
  loadTypes: ResourceState<LoadType[]>;
  dashboardStats: ResourceState<DashboardStats | null>;
  availableLoads: ResourceState<Load[]>;
  availableVehicles: ResourceState<Vehicle[]>;
  myLoads: ResourceState<Load[]>;
  myProposals: ResourceState<LoadProposal[]>;
  receivedProposals: ResourceState<LoadProposal[]>;
  notifications: ResourceState<AppNotification[]>;
  notificationUnreadCount: ResourceState<number>;
};

export function createResourceState<T>(initial: T): ResourceState<T> {
  return {
    data: initial,
    isLoading: false,
    isRefreshing: false,
    isLoaded: false,
    error: null,
  };
}

export const initialAppDataState: AppDataState = {
  loadTypes: createResourceState<LoadType[]>([]),
  dashboardStats: createResourceState<DashboardStats | null>(null),
  availableLoads: createResourceState<Load[]>([]),
  availableVehicles: createResourceState<Vehicle[]>([]),
  myLoads: createResourceState<Load[]>([]),
  myProposals: createResourceState<LoadProposal[]>([]),
  receivedProposals: createResourceState<LoadProposal[]>([]),
  notifications: createResourceState<AppNotification[]>([]),
  notificationUnreadCount: createResourceState<number>(0),
};
