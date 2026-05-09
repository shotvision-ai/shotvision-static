export type MatchStatus = "live" | "completed" | "scheduled";

export interface MatchSet {
  playerAScore: number;
  playerBScore: number;
}

export interface Match {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorImage: string;
  playerA: string;
  playerAImage: string;
  playerB: string;
  playerBImage: string;
  status: MatchStatus;
  matchDate: string; // ISO date
  location?: string;
  isPublic: boolean;
  sets: MatchSet[];
  notes?: string;
  winner?: "playerA" | "playerB";
  scheduledDate?: string; // ISO date for scheduled matches
  likesCount?: number;
  isLiked?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string;
  bio?: string;
  location?: string;
}
