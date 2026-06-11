import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";

export const createMatch = {
  ...exploreColors,
  fonts: exploreFontFamily,
  inputBorder: exploreColors.cardBorder,
  inputFocus: exploreColors.coral,
  placeholder: exploreColors.scoreMuted,
} as const;

export const fieldLabelStyle = {
  fontFamily: exploreFontFamily.extraBold,
  fontSize: 9,
  letterSpacing: 0.8,
  color: exploreColors.muted,
  marginBottom: 6,
  textTransform: "uppercase" as const,
};

export const sectionTitleStyle = {
  fontFamily: exploreFontFamily.black,
  fontSize: 20,
  color: exploreColors.ink,
  marginBottom: 12,
  marginTop: 4,
};

export const headerBtnStyle = {
  width: 38,
  height: 38,
  borderRadius: 12,
  backgroundColor: exploreColors.cardBg,
  borderWidth: 1,
  borderColor: exploreColors.cardBorder,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

export function inputStyle(focused: boolean) {
  return {
    backgroundColor: exploreColors.cardBg,
    borderWidth: focused ? 1.5 : 1,
    borderColor: focused ? exploreColors.coral : exploreColors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: exploreFontFamily.regular,
    fontSize: 15,
    color: exploreColors.ink,
  };
}
