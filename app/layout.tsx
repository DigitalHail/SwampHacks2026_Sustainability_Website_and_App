import "leaflet/dist/leaflet.css";
import { ReactNode } from "react";
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
