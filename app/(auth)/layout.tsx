import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-brand-fg font-bold">
          P
        </span>
        <span className="text-lg font-semibold text-primary">Portfolio Care</span>
      </Link>
      <div className="card animate-rise w-full max-w-sm p-6 sm:p-8">
        {children}
      </div>
    </div>
  )
}
