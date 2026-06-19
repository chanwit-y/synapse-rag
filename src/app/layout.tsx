import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import LayoutProvider from "@/components/layout/LayoutProvider";
import { ModalProvider } from "@/components/common/Modal/ModalContext";
import ModalOutlet from "@/components/common/Modal/ModalOutlet";
import { SnackbarProvider } from "@/components/common/Snackbar/Snackbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Thai glyph coverage for the UI. Geist has no Thai glyphs, so Thai text (chat
// nodes, document translations, …) is served from this and reached via
// per-glyph fallback — Latin stays Geist, Thai uses Noto Sans Thai.
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai"],
});

export const metadata: Metadata = {
  title: "Next.js Starter",
  description: "Next.js starter with TypeScript, Tailwind CSS, and Zustand",
};

// Runs before first paint: read the persisted theme (Zustand `persist`, key
// "layout-storage") and apply it to <html> so the saved theme is used first,
// avoiding a flash of the wrong theme on load. Mirrors LayoutProvider's logic.
const themeInitScript = `(function(){try{var t="system";var raw=localStorage.getItem("layout-storage");if(raw){var s=JSON.parse(raw);if(s&&s.state&&s.state.theme){t=s.state.theme;}}var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=d?"dark":"light";var e=document.documentElement;e.setAttribute("data-theme",r);e.style.colorScheme=r;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansThai.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full overflow-hidden">
        <SnackbarProvider>
          <ModalProvider>
            <LayoutProvider>{children}</LayoutProvider>
            <ModalOutlet />
          </ModalProvider>
        </SnackbarProvider>
      </body>
    </html>
  );
}
