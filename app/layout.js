import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata = {
  title: "IA Catequese",
  description: "Assistente de apoio à preparação de encontros de catequese"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
