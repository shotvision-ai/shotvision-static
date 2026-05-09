import { View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Line, Rect, Circle } from "react-native-svg";

interface TennisCourtBackgroundProps {
  height?: number;
  opacity?: number;
  fullScreen?: boolean;
}

export function TennisCourtBackground({
  height = 240,
  opacity = 0.7,
  fullScreen = false,
}: TennisCourtBackgroundProps) {
  const { height: screenH } = useWindowDimensions();
  const h = fullScreen ? screenH : height;

  // Light-green court lines — alpha scaled by opacity
  const lineAlpha = Math.min(opacity * 0.22, 0.22);
  const faintAlpha = Math.min(opacity * 0.13, 0.13);
  const stroke = `rgba(34,197,94,${lineAlpha})`;
  const strokeFaint = `rgba(34,197,94,${faintAlpha})`;
  const gradStart = `rgba(34,197,94,${Math.min(opacity * 0.05, 0.05)})`;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: h,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <LinearGradient
        colors={[gradStart, "rgba(34,197,94,0)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <Svg width="100%" height={h} viewBox={`0 0 400 ${h}`} preserveAspectRatio="xMidYMid slice">
        {/* Outer court boundary */}
        <Rect
          x="20"
          y="16"
          width="360"
          height={h - 32}
          fill="none"
          stroke={stroke}
          strokeWidth="1.2"
        />

        {/* Baseline inner lines */}
        <Rect
          x="50"
          y="16"
          width="300"
          height={h - 32}
          fill="none"
          stroke={strokeFaint}
          strokeWidth="0.7"
        />

        {/* Net line */}
        <Line x1="20" y1={h / 2} x2="380" y2={h / 2} stroke={stroke} strokeWidth="1" />

        {/* Service boxes */}
        <Line x1="50" y1={h * 0.25} x2="350" y2={h * 0.25} stroke={strokeFaint} strokeWidth="0.8" />
        <Line x1="50" y1={h * 0.75} x2="350" y2={h * 0.75} stroke={strokeFaint} strokeWidth="0.8" />

        {/* Center service line */}
        <Line
          x1="200"
          y1={h * 0.25}
          x2="200"
          y2={h * 0.75}
          stroke={strokeFaint}
          strokeWidth="0.8"
        />

        {/* Vertical service lines */}
        <Line x1="120" y1="16" x2="120" y2={h - 16} stroke={strokeFaint} strokeWidth="0.6" />
        <Line x1="280" y1="16" x2="280" y2={h - 16} stroke={strokeFaint} strokeWidth="0.6" />

        {/* Center mark */}
        <Line x1="198" y1={h / 2 - 6} x2="202" y2={h / 2 - 6} stroke={stroke} strokeWidth="1" />
        <Line x1="198" y1={h / 2 + 6} x2="202" y2={h / 2 + 6} stroke={stroke} strokeWidth="1" />

        {/* Tennis ball accent */}
        <Circle cx="200" cy="30" r="8" fill="none" stroke={strokeFaint} strokeWidth="0.6" />
      </Svg>
    </View>
  );
}
