// app/layout.js
import '../styles/globals.css';

export const metadata = {
  title: 'School AI Tutor',
  description: 'AI tutor MVP - Next.js 14 App Router'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body>
        {children}
      </body>
    </html>
  );
}
