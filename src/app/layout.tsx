import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // WhatsApp/sosyal medya link onizlemesi icin gerekli: og:image gibi goreli
  // path'leri (ör. urun.fotograflar[0] = "/uploads/urunler/x.jpg") WhatsApp'in
  // kabul ettigi MUTLAK URL'e otomatik cevirir (bkz. magaza/[slug]/page.tsx
  // generateMetadata). Tek domain oldugu icin env degiskeni yerine sabit -
  // deploy mimarisi karmasikligindan (build-time env threading) kacinildi.
  metadataBase: new URL("https://www.tezgahimdan.com"),
  title: "Tezgahımdan",
  description:
    "Yerel pazarlardan taze ve el yapımı ürünleri rezerve et, pazar günü tezgahtan teslim al.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: bazi tarayici eklentileri <body>'ye oznitelik
          (or. data-gptw) ekleyip alakasiz hydration uyarisi tetikliyor. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
