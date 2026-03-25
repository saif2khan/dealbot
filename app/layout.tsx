import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "BZARP — AI Marketplace Assistant",
  description: "Automate buyer conversations on peer-to-peer marketplaces with AI",
  icons: {
    icon: [
      { url: '/handshake.png', type: 'image/png', sizes: 'any' },
    ],
    apple: '/handshake.png',
    shortcut: '/handshake.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable} h-full`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full font-[family-name:var(--font-inter)] text-on-surface antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
