import { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { Roboto_Mono } from "next/font/google";
import Script from "next/script";
import ColorStyles from "@/components/shared/color-styles/color-styles";
import Scrollbar from "@/components/ui/scrollbar";
import "styles/main.css";

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  title: "Er din hjemmeside klar til AI?",
  description:
    "Tjek hvor AI-klar din hjemmeside er. Et værktøj fra Nørgård Mikkelsen.",
  icons: {
    icon: "/nm_arrow.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <head>
        <ColorStyles />
      </head>
      <body
        className={`${GeistMono.variable} ${robotoMono.variable} font-sans text-accent-black bg-background-base overflow-x-clip`}
      >
        <main className="overflow-x-clip">{children}</main>
        <Scrollbar />
        <Script
          id="hs-script-loader"
          src="//js.hs-scripts.com/2106542.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
