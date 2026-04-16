import Link from "next/link";
import {
  CheckCircle2,
  Zap,
  BarChart3,
  Users,
  ArrowRight,
  Layers,
  Shield,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen tf-auth-bg text-white">
      {/* Floating orbs */}
      <div className="tf-orb tf-orb-1" />
      <div className="tf-orb tf-orb-2" />
      <div className="tf-orb tf-orb-3" />

      {/* ─── Navbar ───────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-extrabold text-sm tracking-tight shadow-lg shadow-indigo-500/25">
            TF
          </div>
          <span className="text-lg font-bold tracking-tight font-[family-name:var(--font-sora)]">
            TaskFlow
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 text-sm font-semibold bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 hover:border-white/20 rounded-xl transition-all"
          >
            Bắt đầu miễn phí
          </Link>
        </div>
      </nav>

      {/* ─── Hero Section ─────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 md:pt-28 pb-20">
        {/* Badge */}
        <div className="tf-animate-in inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-xs font-medium text-indigo-300 mb-8">
          <Zap className="w-3.5 h-3.5" />
          Nhẹ hơn Jira, mạnh hơn Trello
        </div>

        {/* Heading */}
        <h1 className="tf-animate-in tf-stagger-1 text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl font-[family-name:var(--font-sora)]">
          Quản lý công việc{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent">
            đơn giản & hiệu quả
          </span>
        </h1>

        {/* Subtitle */}
        <p className="tf-animate-in tf-stagger-2 mt-6 text-base md:text-lg text-white/50 max-w-xl leading-relaxed">
          TaskFlow thay thế spreadsheet và chat bằng một nơi duy nhất để assign, track và report
          công việc — dành cho team nhỏ 5–10 người.
        </p>

        {/* CTA */}
        <div className="tf-animate-in tf-stagger-3 flex flex-col sm:flex-row items-center gap-4 mt-10">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 px-7 py-3.5 font-semibold text-sm bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all"
          >
            Tạo workspace miễn phí
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 font-medium text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-xl backdrop-blur-sm transition-all"
          >
            Đăng nhập
          </Link>
        </div>

        {/* Social proof */}
        <div className="tf-animate-in tf-stagger-4 mt-14 flex items-center gap-3 text-sm text-white/30">
          <div className="flex -space-x-2">
            {["#6366f1", "#8b5cf6", "#a855f7", "#c084fc"].map((clr, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full border-2 border-[#131338] flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: clr }}
              >
                {["QN", "VT", "ML", "TH"][i]}
              </div>
            ))}
          </div>
          <span>Được sử dụng bởi các team tại Việt Nam</span>
        </div>
      </section>

      {/* ─── Features Grid ────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-12 pb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: Layers,
              title: "Kanban Board",
              desc: "Kéo thả task để đổi trạng thái. Xem tiến độ team một cách trực quan.",
              gradient: "from-indigo-500/20 to-indigo-500/5",
              iconColor: "text-indigo-400",
            },
            {
              icon: Users,
              title: "Phân quyền rõ ràng",
              desc: "Admin, Manager, Member — mỗi người thấy đúng những gì mình cần.",
              gradient: "from-purple-500/20 to-purple-500/5",
              iconColor: "text-purple-400",
            },
            {
              icon: BarChart3,
              title: "Báo cáo tự động",
              desc: "Task completed, overdue, completion rate — dữ liệu real-time cho team lead.",
              gradient: "from-blue-500/20 to-blue-500/5",
              iconColor: "text-blue-400",
            },
            {
              icon: CheckCircle2,
              title: "Task management",
              desc: "Tạo, assign, đặt deadline, priority. Không quá 3 click cho mọi thao tác.",
              gradient: "from-emerald-500/20 to-emerald-500/5",
              iconColor: "text-emerald-400",
            },
            {
              icon: Zap,
              title: "Thông báo real-time",
              desc: "Nhận notification khi được assign task, sắp deadline, hoặc được mention.",
              gradient: "from-amber-500/20 to-amber-500/5",
              iconColor: "text-amber-400",
            },
            {
              icon: Shield,
              title: "Bảo mật & An toàn",
              desc: "Row-level isolation, bcrypt password hash, JWT — dữ liệu team luôn an toàn.",
              gradient: "from-rose-500/20 to-rose-500/5",
              iconColor: "text-rose-400",
            },
          ].map((feat, i) => (
            <div
              key={feat.title}
              className={`tf-animate-in group p-6 rounded-2xl border border-white/5 bg-gradient-to-br ${feat.gradient} backdrop-blur-sm hover:border-white/10 transition-all hover:-translate-y-1`}
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 ${feat.iconColor}`}>
                <feat.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-2 font-[family-name:var(--font-sora)]">
                {feat.title}
              </h3>
              <p className="text-sm text-white/40 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6 md:px-12">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-white/30">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[8px] font-extrabold">
              TF
            </div>
            <span>TaskFlow v0.1.0</span>
          </div>
          <p className="text-xs text-white/20">
            © 2026 TaskFlow. Xây dựng cho team Việt Nam.
          </p>
        </div>
      </footer>
    </div>
  );
}
