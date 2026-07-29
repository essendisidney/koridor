import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[var(--primary)] lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1600&q=80')",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-2xl font-semibold"
          >
            Koridor
          </Link>
          <div>
            <p className="max-w-md font-[family-name:var(--font-display)] text-3xl font-semibold leading-snug">
              Secure access to the trade operating system.
            </p>
            <p className="mt-3 max-w-sm text-sm text-white/75">
              Enterprise authentication with organisation-scoped roles, audit
              trails, and MFA-ready security.
            </p>
          </div>
        </div>
      </div>
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
