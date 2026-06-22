import "./globals.css";
import Providers from "./providers";
import { Bricolage_Grotesque, Geist, Gemunu_Libre, Inter, Plus_Jakarta_Sans, Poppins } from "next/font/google";

export const metadata = {
  title: "Swaggeroo",
  description: "Swag ops platform"
};

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

// New design display font (headings) — used site-wide.
const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const fontLogo = Gemunu_Libre({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--gemunu-libre",
  display: "swap",
});

const fontHeading = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const fontBody = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const fontGeist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontDisplay.variable} ${fontLogo.variable} ${fontHeading.variable} ${fontBody.variable} ${fontGeist.variable}`}>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
