# TaskFlow — Agent Instructions

## Tech Stack (KHÔNG ĐƯỢC thay đổi trừ khi có justification từ Tech Lead)
### Frontend
- Framework: Next.js 16 (App Router) + TypeScript
- UI Components: shadcn/ui + Tailwind CSS
- State Management: Zustand (client state) + TanStack Query (server state)
- Drag & Drop: @dnd-kit/core (Kanban board)
- Form: React Hook Form + Zod validation

### Backend
- Runtime: Node.js + Express
- ORM: Prisma
- Database: PostgreSQL ≥ 14
- Authentication: JWT (7 ngày expiry) + bcrypt (cost factor ≥ 12)
- Email: Resend (free tier)

### DevOps
- Hosting: Railway (backend + DB), Vercel (frontend)
- CI/CD: GitHub Actions
- Monitoring: Sentry

## Coding Conventions
- TypeScript strict mode bắt buộc
- Component naming: PascalCase (e.g., TaskCard.tsx)
- API routes: kebab-case (e.g., /api/tasks/update-status)
- API response format chuẩn: { success: boolean, data?: T, error?: string }
- Luôn có error handling cho mọi API call
- Mọi form dùng React Hook Form + Zod validation
- UI text bằng tiếng Việt
- Loading state hiển thị khi API call > 300ms
- Empty states phải có hướng dẫn hành động (không để trang trắng)

## Architecture Patterns
- Feature-based folder structure
- Server Components by default, 'use client' chỉ khi cần interactivity
- Soft delete cho tasks (deleted_at timestamp)
- Optimistic UI cho status changes, rollback nếu API lỗi
- Toast notifications: auto-dismiss sau 4 giây
- Slide-over panel cho task detail (không navigate ra trang mới)

## Security Rules (KHÔNG BAO GIỜ vi phạm)
- KHÔNG hardcode secrets — dùng env variables
- Input sanitization cho mọi user input (ngăn XSS, SQL injection)
- Rate limiting: 100 requests/phút per IP
- Row-level isolation: data workspace A không lộ sang workspace B
- Password KHÔNG BAO GIỜ xuất hiện trong API response

## Testing
- Viết test cho mọi API endpoint (unit test)
- Component test cho interactive components (form, drag-drop)
- Edge case test theo PRD section 10