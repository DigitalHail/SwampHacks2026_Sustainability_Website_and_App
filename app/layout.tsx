import "leaflet/dist/leaflet.css";
import type { ReactNode } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "GatorGreen",
  description: "Environmental opportunities and sustainability platform",
  icons: {
    icon: { url: "/images/GatorGreen.PNG", sizes: "512x512" },
    apple: "/images/GatorGreen.PNG",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
