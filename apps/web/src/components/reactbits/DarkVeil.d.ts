export interface DarkVeilProps {
  hueShift?: number;
  noiseIntensity?: number;
  scanlineIntensity?: number;
  speed?: number;
  scanlineFrequency?: number;
  warpAmount?: number;
  resolutionScale?: number;
  /** Recolor the veil onto a single brand color. CSS hex ("#005CFE") or [r,g,b] (0–1). */
  tintColor?: string | [number, number, number] | null;
  /** How strongly the tint replaces the native veil color (0–1). Defaults to 1. */
  tintStrength?: number;
}

declare const DarkVeil: (props: DarkVeilProps) => JSX.Element;
export default DarkVeil;
