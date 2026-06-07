export type UserRole = 'student' | 'teacher';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  created_at?: string;
}

export interface Praise {
  id: string;
  giver_id: string;
  giver_role: UserRole;
  receiver_id: string;
  message: string;
  month: string; // YYYY-MM
  created_at: string;
}

export interface PraiseWithDetails extends Omit<Praise, 'giver_role'> {
  giver: {
    name: string;
    role: UserRole;
  };
  receiver: {
    name: string;
    role: UserRole;
  };
}

export interface RankingItem {
  id: string;
  name: string;
  role: UserRole;
  count: number;
}
