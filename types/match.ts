export type MatchStatus = "live" | "completed" | "scheduled";

/** When present on API payloads, default avatars use the female (9–12) or male (13–16) set. */
export type MatchParticipantGender = "male" | "female";

export interface MatchSet {
  playerAScore: number;
  playerBScore: number;
}

export interface Match {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorImage: string;
  creatorGender?: MatchParticipantGender;
  playerA: string;
  playerAImage: string;
  playerB: string;
  playerBImage: string;
  /** Stable user id for avatar hashing when the API provides it */
  playerAUserId?: string;
  playerBUserId?: string;
  playerAGender?: MatchParticipantGender;
  playerBGender?: MatchParticipantGender;
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
