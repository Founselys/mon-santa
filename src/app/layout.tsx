import './globals.css' // <-- CETTE LIGNE EST CRUCIALE
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'SantApp - Secret Santa',
  description: 'Organisez votre Secret Santa facilement',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  )
}