export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="max-w-xl w-full px-6 py-10 space-y-4">
        <h1 className="text-3xl font-semibold text-zinc-900">TaskFlow</h1>
        <p className="text-sm text-zinc-600">
          Nền tảng quản lý công việc đơn giản cho team nhỏ. Vui lòng đăng nhập để tiếp
          tục.
        </p>
        <div className="flex gap-3 mt-4">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            Đăng nhập
          </a>
          <a
            href="/register"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Đăng ký
          </a>
        </div>
      </div>
    </div>
  );
}
