import Link from "next/link";

export default function NotFound() {
  return (
    <div className="h-dvh flex flex-col items-center justify-center bg-bg-canvas">
      <h1 className="text-4xl font-bold text-text-inverse mb-4 text-balance">404</h1>
      <p className="text-text-secondary mb-6">Page not found</p>
      <Link
        href="/"
        className="bg-accent text-text-on-accent px-6 py-2 rounded font-medium hover:opacity-90 transition-opacity"
      >
        Go Home
      </Link>
    </div>
  );
}
