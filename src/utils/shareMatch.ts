import { Share, Alert } from "react-native";
import { matchService } from "../services/api/matchService";
import { AppError } from "../services/api/apiErrors";
import { getUserFriendlyErrorMessage } from "../services/api/userFriendlyErrors";

/** Opens the system share sheet using GET `/api/matches/{id}/share` metadata. */
export async function shareMatchById(matchId: string): Promise<void> {
  try {
    const meta = await matchService.getMatchShare(matchId);
    const setLines = meta.sets?.length ? `\n\n${meta.sets.join("\n")}` : "";
    const message = `${meta.title}\n${meta.subtitle}${setLines}\n\n${meta.webLink}`;
    await Share.share({
      message,
      url: meta.webLink,
      title: meta.title,
    });
  } catch (error: unknown) {
    const msg = getUserFriendlyErrorMessage(error, "Could not share this match.");
    Alert.alert("Share failed", msg);
    if (error instanceof AppError && error.statusCode === 404) {
      return;
    }
    throw error;
  }
}
