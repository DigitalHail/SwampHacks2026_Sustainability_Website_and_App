import "leaflet/dist/leaflet.css";
import type { ReactNode } from "react";
import Header from "../components/Header";
import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "GatorGreen",
  description: "Environmental opportunities and sustainability platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
