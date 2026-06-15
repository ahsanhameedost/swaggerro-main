export type SquareEnvironment = "sandbox" | "production";

export type SquareTokenizeResult = {
  status: "OK" | "ERROR";
  token?: string;
  errors?: Array<{ message?: string }>;
};

export interface SquareCardInstance {
  attach(target: string | HTMLElement): Promise<void>;
  tokenize(details?: Record<string, unknown>): Promise<SquareTokenizeResult>;
  destroy?(): Promise<void>;
}

export interface SquarePaymentsInstance {
  card(options?: Record<string, unknown>): Promise<SquareCardInstance>;
}

export interface SquareGlobal {
  payments(applicationId: string, locationId: string): SquarePaymentsInstance;
}

declare global {
  interface Window {
    Square?: SquareGlobal;
  }
}

let squareScriptPromise: Promise<SquareGlobal> | null = null;

export function getSquareWebSdkUrl(environment: SquareEnvironment) {
  return environment === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";
}

export async function loadSquareWebSdk(environment: SquareEnvironment) {
  if (typeof window === "undefined") {
    throw new Error("Square can only be loaded in the browser");
  }

  if (window.Square) {
    return window.Square;
  }

  if (!squareScriptPromise) {
    squareScriptPromise = new Promise<SquareGlobal>((resolve, reject) => {
      const src = getSquareWebSdkUrl(environment);
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

      if (existing) {
        existing.addEventListener("load", () => {
          if (window.Square) {
            resolve(window.Square);
            return;
          }
          reject(new Error("Square SDK did not initialize"));
        });
        existing.addEventListener("error", () => reject(new Error("Failed to load Square SDK")));
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => {
        if (!window.Square) {
          reject(new Error("Square SDK did not initialize"));
          return;
        }
        resolve(window.Square);
      };
      script.onerror = () => reject(new Error("Failed to load Square SDK"));
      document.head.appendChild(script);
    });
  }

  return squareScriptPromise;
}
