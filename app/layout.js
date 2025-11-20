// app/layout.js
import '../styles/globals.css';
import { Halant } from 'next/font/google';

export const metadata = {
  title: 'School AI Tutor',
  description: 'AI tutor MVP - Next.js 14 App Router'
};

// Load Halant for body/other text
const halant = Halant({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-halant'
});

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
  <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Joost:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
