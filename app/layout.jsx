import './globals.css'

export const metadata = {
  title: 'Neuramine — Private AI Infrastructure',
  description: 'Deploy a private AI model in minutes. OpenAI-compatible API. Your data never leaves your infrastructure. HIPAA-compliant. Zero ML expertise required.',
  openGraph: {
    title: 'Neuramine — Private AI Infrastructure',
    description: 'Deploy a private AI model in minutes. Your data never leaves your infrastructure.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body>{children}</body>
    </html>
  )
}
