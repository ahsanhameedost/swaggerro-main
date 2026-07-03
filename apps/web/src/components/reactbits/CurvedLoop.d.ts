import type { FC } from "react";

export interface CurvedLoopProps {
  marqueeText?: string;
  speed?: number;
  className?: string;
  curveAmount?: number;
  direction?: "left" | "right";
  interactive?: boolean;
}

declare const CurvedLoop: FC<CurvedLoopProps>;
export default CurvedLoop;
