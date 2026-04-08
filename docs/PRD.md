# Product Requirements Document (PRD)
## TaskFlow — Web Platform Quản Lý Task cho Team

---

| Trường | Nội dung |
|---|---|
| **Tên sản phẩm** | TaskFlow |
| **Phiên bản PRD** | v1.0 |
| **Ngày tạo** | 2026-04-07 |
| **Cập nhật lần cuối** | 2026-04-07 |
| **Product Owner** | Quan Nguyen |
| **Trạng thái** | Draft → In Review |
| **Chu kỳ SDLC** | Requirement → Design → Development → QA → Deploy |

---

## Mục lục

1. [Tóm tắt sản phẩm](#1-tóm-tắt-sản-phẩm)
2. [Bối cảnh và vấn đề](#2-bối-cảnh-và-vấn-đề)
3. [Mục tiêu và success metrics](#3-mục-tiêu-và-success-metrics)
4. [Người dùng mục tiêu](#4-người-dùng-mục-tiêu)
5. [Scope — In scope / Out of scope](#5-scope--in-scope--out-of-scope)
6. [Non-Goals (Anti-Goals)](#6-non-goals-anti-goals)
7. [Functional Requirements](#7-functional-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [User Stories và Acceptance Criteria](#9-user-stories-và-acceptance-criteria)
10. [Edge Cases và Error States](#10-edge-cases-và-error-states)
11. [Dependencies và Constraints](#11-dependencies-và-constraints)
12. [UX Design Notes](#12-ux-design-notes)
13. [Tech Stack đề xuất](#13-tech-stack-đề-xuất)
14. [Timeline và Milestones](#14-timeline-và-milestones)
15. [Rủi ro và kế hoạch giảm thiểu](#15-rủi-ro-và-kế-hoạch-giảm-thiểu)
16. [Stakeholders và RACI](#16-stakeholders-và-raci)
17. [Open Questions](#17-open-questions)
18. [Change Log](#18-change-log)

---

## 1. Tóm tắt sản phẩm

TaskFlow là một web platform fullstack cho phép team nhỏ (5–10 người) tạo, giao, theo dõi và hoàn thành công việc trong một giao diện duy nhất. Sản phẩm tập trung vào sự đơn giản và tốc độ: thành viên có thể thấy ngay mình cần làm gì hôm nay, và team lead có thể nắm được tiến độ tổng thể mà không cần họp.

**Câu problem statement:**
> Các team nhỏ đang dùng chat (Slack/Zalo) hoặc spreadsheet để quản lý công việc, dẫn đến task bị bỏ sót, không rõ trách nhiệm, và không có lịch sử công việc rõ ràng.

**Câu value proposition:**
> TaskFlow thay thế spreadsheet và luồng chat bằng một nơi duy nhất để assign, track và report công việc — nhẹ hơn Jira, chắc hơn Trello.

---

## 2. Bối cảnh và vấn đề

### 2.1 Vấn đề hiện tại

Các team nhỏ phổ biến gặp 3 nhóm vấn đề chính:

**Mất visibility:** Task được giao qua tin nhắn, sau vài ngày không ai nhớ. Không có trạng thái tập trung để xem "task nào đang stuck".

**Thiếu accountability:** Không rõ ai chịu trách nhiệm. Khi bị hỏi, câu trả lời thường là "tưởng anh/chị làm".

**Không có data:** Không biết team đang quá tải hay rảnh rỗi. Không ước được deadline dựa trên năng lực thực tế.

### 2.2 Bằng chứng

- Khảo sát nội bộ (n=12 team nhỏ): 83% dùng chat để giao việc, 67% nói đã từng bỏ sót task quan trọng trong tháng qua.
- Benchmark cạnh tranh: Jira quá nặng cho team <10 người; Trello thiếu báo cáo và phân quyền.

---

## 3. Mục tiêu và Success Metrics

### 3.1 Mục tiêu kinh doanh

- Ra mắt MVP trong Q2/2026 phục vụ internal team trước.
- Đạt 100% team adoption (tức là không còn giao task qua chat) sau 4 tuần onboarding.

### 3.2 Success Metrics (OKRs)

| Metric | Baseline | Target (sau 30 ngày) | Cách đo |
|---|---|---|---|
| Task completion rate | ~60% (ước tính từ khảo sát) | ≥85% | Tasks marked Done / Tasks created |
| Time to update task status | ~24h (qua chat) | ≤2h | Trung bình giữa assign và first status change |
| Daily active users | 0 | ≥80% team members | Login events per day |
| Task visibility (0 orphan tasks) | ~30% task không có assignee | 0% | Tasks with null assignee after 24h |

### 3.3 Tiêu chí phát hành (Definition of Done cho MVP)

- Tất cả Functional Requirements từ FR-01 đến FR-12 đã pass QA.
- Non-functional: page load < 2s, uptime > 99% trong 7 ngày staging.
- Không còn blocker nào ở mức Severity 1 hoặc 2.
- Stakeholder sign-off từ PM + Tech Lead + 1 đại diện người dùng cuối.

---

## 4. Người dùng mục tiêu

### 4.1 User Personas

**Persona 1: Minh — Team Lead / Project Manager**

- Tuổi: 28–35
- Vai trò: Quản lý 5–8 người, chịu trách nhiệm tiến độ dự án
- Pain points: Phải nhắn tin hỏi từng người về trạng thái task; không biết ai đang quá tải
- Goals: Xem dashboard tổng thể, assign task nhanh, get báo cáo không cần export Excel
- Behaviour: Dùng laptop, check công việc buổi sáng và cuối ngày

**Persona 2: Linh — Developer / Thành viên team**

- Tuổi: 22–30
- Vai trò: Nhận task, thực hiện, báo cáo done
- Pain points: Không biết task ưu tiên gì; bị interrupt liên tục qua chat để hỏi tiến độ
- Goals: Biết rõ mình cần làm gì hôm nay; update nhanh không mất nhiều thao tác
- Behaviour: Dùng cả laptop và điện thoại

### 4.2 User Roles trong hệ thống

| Role | Quyền hạn |
|---|---|
| **Admin** | Quản lý workspace, thêm/xóa member, cài đặt toàn bộ |
| **Manager** | Tạo project, tạo & assign task, xem báo cáo team |
| **Member** | Xem task được assign, update trạng thái, comment |

---

## 5. Scope — In Scope / Out of Scope

### 5.1 In Scope (MVP v1.0)

- Quản lý task: tạo, chỉnh sửa, xóa, assign, đặt deadline, đặt priority
- Trạng thái task: To Do → In Progress → In Review → Done
- Quản lý project: nhóm task theo project
- Dashboard cá nhân: "My Tasks" — task được assign cho tôi, sắp xếp theo deadline
- Dashboard team: tổng quan tất cả task, filter theo người/project/status
- Thông báo in-app: được assign task mới, task sắp đến deadline
- Comment thread trong từng task
- Phân quyền theo role (Admin / Manager / Member)
- Lịch sử hoạt động (activity log) của từng task
- Authentication: đăng ký / đăng nhập bằng email

### 5.2 Out of Scope (V1.0 — sẽ xem xét ở V2)

- Tích hợp email / Slack / Zalo
- Mobile native app (iOS / Android)
- Time tracking / timesheet
- Billing / subscription / payment
- File attachment dung lượng lớn (>10MB)
- Gantt chart / timeline view
- Multiple workspaces cho 1 tài khoản
- Public API / webhooks
- SSO (Google, GitHub login)
- Dark mode

---

## 6. Non-Goals (Anti-Goals)

TaskFlow **không** cố gắng:

- **Thay thế Jira cho enterprise team:** Không có sprint planning, story points, hay epics lồng nhiều tầng. Độ phức tạp đó nằm ngoài giá trị cốt lõi.
- **Trở thành công cụ communication:** TaskFlow không phải chat tool. Comment trong task là để làm rõ yêu cầu, không phải để tán gẫu.
- **Hỗ trợ quản lý nguồn lực (resource planning):** Không tính capacity, không có calendar team, không forecast workload.
- **Offline-first:** Không có service worker hay local sync. Cần internet để dùng.

---

## 7. Functional Requirements

> Ký hiệu: **FR** = Functional Requirement. Priority: **P0** = Must Have, **P1** = Should Have, **P2** = Nice to Have.

### FR-01: Authentication (P0)

Hệ thống cho phép người dùng đăng ký tài khoản bằng email + password và đăng nhập. Session kéo dài 7 ngày hoặc đến khi người dùng logout. Khi token hết hạn, redirect về trang login.

### FR-02: Workspace & Member Management (P0)

Admin tạo workspace, mời thành viên qua email. Link mời hết hạn sau 48 giờ. Admin có thể thay đổi role và xóa thành viên bất kỳ lúc nào.

### FR-03: Quản lý Project (P0)

Manager tạo project với tên, mô tả, và màu sắc label. Mỗi project hiển thị số task tổng / task done. Manager có thể archive project khi hoàn thành.

### FR-04: Tạo và chỉnh sửa Task (P0)

Manager và Member có thể tạo task với các trường:

- **Title** (bắt buộc, max 200 ký tự)
- **Description** (markdown supported, max 5000 ký tự)
- **Assignee** (1 người, có thể bỏ trống)
- **Project** (bắt buộc)
- **Priority**: Low / Medium / High / Urgent
- **Due date** (tùy chọn)
- **Status**: To Do / In Progress / In Review / Done

### FR-05: Chuyển trạng thái Task (P0)

Assignee và Manager có thể kéo-thả hoặc click để chuyển trạng thái. Mỗi lần đổi trạng thái tạo 1 activity log entry với timestamp và người thực hiện.

### FR-06: Comment trong Task (P0)

Bất kỳ member nào trong workspace có thể comment vào task. Comment hỗ trợ plain text và mention `@username`. Người được mention nhận thông báo in-app.

### FR-07: Dashboard cá nhân — My Tasks (P0)

Mỗi user thấy danh sách task được assign cho mình, sắp xếp mặc định theo due date tăng dần. Filter: All / To Do / In Progress. Task quá hạn hiển thị highlight màu đỏ.

### FR-08: Dashboard Team (P0)

Manager xem tất cả task của team trên Kanban board (cột theo status). Filter theo: Assignee, Project, Priority, Due date range. Search theo task title.

### FR-09: Thông báo In-App (P1)

Người dùng nhận notification khi:

- Được assign task mới
- Task của mình bị comment (trừ comment do chính mình tạo)
- Task của mình đến hạn trong vòng 24 giờ
- Được @mention trong comment

Notification hiển thị dưới dạng badge counter và dropdown list. Đánh dấu đã đọc khi click.

### FR-10: Activity Log trong Task (P1)

Mỗi task có tab "Activity" hiển thị toàn bộ lịch sử thay đổi: ai tạo, ai chỉnh sửa trường nào (giá trị cũ → giá trị mới), ai đổi status, ai comment. Không cho xóa activity log.

### FR-11: Báo cáo Team (P1)

Manager xem trang Reports với:

- Số task completed theo tuần (bar chart, 4 tuần gần nhất)
- Task completion rate theo từng member (bảng)
- Số task overdue hiện tại theo member

### FR-12: Search toàn cục (P2)

Thanh search ở header cho phép tìm task theo title trên toàn bộ workspace. Kết quả hiển thị ngay khi gõ (debounce 300ms), tối đa 10 kết quả.

---

## 8. Non-Functional Requirements

### NFR-01: Performance

- Thời gian load trang đầu tiên (LCP): < 2.5 giây trên kết nối 4G
- API response time (p95): < 500ms cho các endpoint đọc dữ liệu
- API response time (p95): < 1 giây cho các endpoint ghi dữ liệu

### NFR-02: Availability & Reliability

- Uptime SLA: ≥ 99.5% (tương đương < 3.65 giờ downtime/tháng)
- Scheduled maintenance: thông báo trước 24 giờ, chỉ thực hiện ngoài giờ hành chính

### NFR-03: Security

- Password hash bằng bcrypt (cost factor ≥ 12)
- All traffic qua HTTPS/TLS 1.2+
- JWT token với expiry 7 ngày, refresh token rotation
- Input sanitization toàn bộ form (ngăn XSS, SQL injection)
- Rate limiting: tối đa 100 requests/phút per IP cho API public
- Dữ liệu của workspace A không được lộ sang workspace B (row-level isolation)

### NFR-04: Scalability

- Thiết kế database hỗ trợ tối thiểu 10 workspace, mỗi workspace 50 member và 10,000 task mà không cần re-architect
- Stateless API để dễ horizontal scaling sau này

### NFR-05: Usability

- Responsive design: hoạt động trên màn hình ≥ 375px (mobile) và ≥ 1024px (desktop)
- Thao tác cốt lõi (tạo task, đổi status) không quá 3 click từ bất kỳ màn hình nào
- Trạng thái loading hiển thị khi API call > 300ms
- Empty states có hướng dẫn hành động tiếp theo (không để trang trắng)

### NFR-06: Accessibility

- Tuân thủ WCAG 2.1 mức AA cho các component core
- Tất cả form element có label rõ ràng
- Hỗ trợ keyboard navigation cho Kanban board

### NFR-07: Data Integrity & Backup

- Database backup tự động hàng ngày, giữ 30 ngày
- Không có hard delete với task (soft delete, admin có thể restore trong 30 ngày)
- Activity log không thể xóa

### NFR-08: Browser Support

- Chrome ≥ 110, Firefox ≥ 110, Safari ≥ 16, Edge ≥ 110
- Không hỗ trợ Internet Explorer

---

## 9. User Stories và Acceptance Criteria

Mỗi user story theo format: *"Với tư cách là [role], tôi muốn [hành động] để [lợi ích]."*

---

### US-01: Tạo task mới

**Story:** Với tư cách là Manager, tôi muốn tạo task mới và assign cho member để phân công công việc rõ ràng.

**Acceptance Criteria:**

```
Given: Manager đang ở trong bất kỳ trang nào của workspace
When: Click nút "+ New Task" và điền đủ Title + Project, rồi Submit
Then:
  - Task được tạo và hiển thị ngay trong project tương ứng ở status "To Do"
  - Nếu có Assignee, người đó nhận thông báo in-app "Bạn được assign task mới: [Title]"
  - Activity log ghi "Created by [Tên Manager] at [timestamp]"
  - Form đóng và user thấy task vừa tạo

Given: Manager submit form với Title để trống
When: Click Submit
Then:
  - Form hiển thị lỗi "Title không được để trống" ngay dưới trường Title
  - Task KHÔNG được tạo
```

---

### US-02: Cập nhật trạng thái task

**Story:** Với tư cách là Member, tôi muốn tự cập nhật trạng thái task của mình để team biết tiến độ mà không cần hỏi qua chat.

**Acceptance Criteria:**

```
Given: Member đang xem task được assign cho mình
When: Đổi Status từ "To Do" sang "In Progress"
Then:
  - Trạng thái thay đổi ngay lập tức (optimistic UI, không cần reload)
  - Activity log ghi "[Tên Member] changed status from To Do → In Progress at [timestamp]"
  - Dashboard team của Manager cập nhật real-time (hoặc trong vòng 5 giây)

Given: Member cố đổi status của task KHÔNG được assign cho mình
When: Truy cập task đó
Then:
  - Nút đổi status bị disabled với tooltip "Chỉ assignee hoặc Manager mới có thể đổi trạng thái"
```

---

### US-03: Xem My Tasks

**Story:** Với tư cách là Member, tôi muốn xem danh sách task của mình được sắp xếp theo độ khẩn cấp để biết mình nên làm gì trước.

**Acceptance Criteria:**

```
Given: Member vào trang My Tasks
When: Trang load
Then:
  - Hiển thị tất cả task assigned cho user, trừ task đã Done
  - Sắp xếp mặc định: task Overdue (đỏ) lên đầu, sau đó sort by due date tăng dần
  - Task không có due date xuống cuối
  - Hiển thị badge "Overdue" nếu due date < ngày hôm nay

Given: User không có task nào
When: Vào trang My Tasks
Then:
  - Hiển thị empty state: icon + text "Bạn chưa có task nào. Hãy liên hệ Manager để được assign công việc."
```

---

### US-04: Invite thành viên vào workspace

**Story:** Với tư cách là Admin, tôi muốn mời thành viên mới qua email để họ tham gia workspace.

**Acceptance Criteria:**

```
Given: Admin vào Settings > Members và nhập email hợp lệ
When: Click "Send Invite"
Then:
  - Hệ thống gửi email có link invite (dạng /invite?token=xxx)
  - Link có hiệu lực 48 giờ
  - Danh sách hiển thị email đó với badge "Pending"
  - Admin nhận thông báo in-app khi người được mời accept

Given: Admin nhập email đã là member
When: Click "Send Invite"
Then:
  - Hiển thị lỗi: "Email này đã là thành viên của workspace."
  - Không gửi email

Given: Link invite hết hạn (>48h) và người dùng click
When: Truy cập link
Then:
  - Trang hiển thị "Link mời đã hết hạn. Vui lòng liên hệ Admin để được mời lại."
```

---

### US-05: Xem báo cáo team

**Story:** Với tư cách là Manager, tôi muốn xem số task completed của từng thành viên theo tuần để đánh giá năng suất và phân bổ lại công việc.

**Acceptance Criteria:**

```
Given: Manager vào trang Reports
When: Trang load
Then:
  - Hiển thị bar chart "Tasks Completed" theo 4 tuần gần nhất (mỗi tuần là 1 cột)
  - Bảng liệt kê: Member | Assigned | Completed | Overdue | Completion Rate (%)
  - Tất cả dữ liệu chỉ tính trong workspace hiện tại

Given: Manager click vào tên một thành viên trong bảng
When: Click
Then:
  - Trang lọc My Tasks của thành viên đó, Manager xem được (read-only)
```

---

## 10. Edge Cases và Error States

### 10.1 Task Management

| Tình huống | Hành vi kỳ vọng |
|---|---|
| Assignee bị xóa khỏi workspace | Task giữ nguyên, Assignee hiển thị là "[Removed User]". Manager phải re-assign. |
| Project bị archive khi còn task đang Open | Task vẫn tồn tại, không thể tạo task mới trong project. Task cũ vẫn update được. |
| 2 user cùng edit title của 1 task cùng lúc | Last-write-wins. Không có conflict merge. Activity log ghi rõ từng lần lưu. |
| Due date được set vào ngày quá khứ | Cho phép tạo, nhưng task ngay lập tức hiển thị badge "Overdue" |
| Task title có ký tự đặc biệt `<script>` | Sanitize toàn bộ, không render HTML. Lưu dạng plain text. |
| Member tự xóa chính mình ra khỏi workspace | Không cho phép. Admin mới có quyền xóa member. |
| Task được assign cho chính Admin đang bị deactivate | Task hiển thị "[Removed User]", Manager nhận notification để re-assign. |

### 10.2 Authentication & Session

| Tình huống | Hành vi kỳ vọng |
|---|---|
| Token hết hạn giữa chừng khi đang dùng | Intercept API 401, tự redirect về login với thông báo "Phiên làm việc đã hết hạn." |
| Đăng nhập sai password 5 lần liên tiếp | Khóa tạm 15 phút. Hiển thị countdown timer. |
| Mở app trên 2 tab, logout 1 tab | Tab còn lại tự detect (storage event) và redirect về login. |
| Đăng ký email đã tồn tại | Lỗi: "Email này đã được đăng ký. Bạn có muốn đăng nhập không?" |

### 10.3 Network & Performance

| Tình huống | Hành vi kỳ vọng |
|---|---|
| API call thất bại (500 / timeout) | Toast error: "Có lỗi xảy ra. Thử lại?" với nút Retry. Không mất dữ liệu user đã nhập. |
| Mất kết nối internet | Banner cảnh báo ở top: "Bạn đang offline. Một số tính năng không hoạt động." |
| Upload ảnh trong description > 5MB | Hiển thị ngay lỗi: "File tối đa 5MB" trước khi upload. |
| Trang load nhưng API trả về empty (lỗi quyền) | Hiển thị "Không có quyền truy cập" thay vì trang trắng. |

---

## 11. Dependencies và Constraints

### 11.1 Technical Dependencies

| Dependency | Lý do | Risk nếu không có |
|---|---|---|
| Email service (SendGrid / Resend) | Gửi email invite và thông báo | Không thể onboard member mới |
| Cloud hosting (Railway / Render / VPS) | Deploy backend và frontend | Không ra được production |
| PostgreSQL ≥ 14 | Database chính | Toàn bộ data layer |
| CDN (Cloudflare) | Static asset performance | Page load chậm, không ảnh hưởng chức năng |

### 11.2 Constraints

- **Budget:** MVP phải deploy được trên tier miễn phí hoặc < $20/tháng (Railway Starter hoặc tương đương) — ảnh hưởng lựa chọn tech stack và file storage.
- **Timeline:** MVP trong 8 tuần với team 2 developer. Feature scope đã được giới hạn để khả thi.
- **Team size:** Không thiết kế cho workspace >50 người. Performance SLA chỉ cam kết với scale này.
- **Ngôn ngữ:** UI tiếng Việt cho MVP. Cần xem xét i18n framework trước khi hard-code strings.

---

## 12. UX Design Notes

### 12.1 Nguyên tắc thiết kế

- **Speed first:** Mọi action quan trọng (tạo task, đổi status) không quá 3 click.
- **Clarity over features:** Khi có trade-off giữa tính năng và sự rõ ràng, ưu tiên rõ ràng.
- **Progressive disclosure:** Không show tất cả option lên cùng lúc. Advanced settings ẩn đi cho đến khi cần.

### 12.2 Navigation Structure

```
/login                  — Login page
/register               — Register page
/invite?token=xxx       — Accept invite

/app                    — Root (redirect đến /app/my-tasks)
/app/my-tasks           — My Tasks dashboard (Member default view)
/app/team               — Team Kanban board (Manager view)
/app/projects           — Danh sách project
/app/projects/:id       — Chi tiết project + task list
/app/tasks/:id          — Chi tiết task (fullpage hoặc slide-over panel)
/app/reports            — Báo cáo (Manager only)
/app/settings           — Workspace settings (Admin only)
/app/settings/members   — Member management
```

### 12.3 Key UX Patterns

- **Kanban board:** Drag-and-drop để đổi status. Fallback click dropdown nếu dùng mobile.
- **Slide-over panel:** Task detail mở ra từ phải, không navigate ra trang mới (giữ context board).
- **Optimistic UI:** Update UI ngay, rollback nếu API lỗi.
- **Toast notifications:** Success/error toast, auto-dismiss sau 4 giây.

### 12.4 Design references

- Tham khảo: Linear.app (tốc độ, keyboard shortcuts), Height.app (simplicity), Asana My Tasks (cá nhân hóa).
- Không copy trực tiếp. TaskFlow cần visual identity riêng.

---

## 13. Tech Stack đề xuất

> *Đây là đề xuất từ PM dựa trên constraint. Tech Lead có quyền thay đổi nếu có justification rõ ràng.*

### Frontend

- **Framework:** Next.js 16 (App Router) + TypeScript
- **UI Components:** shadcn/ui + Tailwind CSS
- **State Management:** Zustand (client state) + TanStack Query (server state)
- **Drag & Drop:** @dnd-kit/core (Kanban board)
- **Form:** React Hook Form + Zod validation

### Backend

- **Runtime:** Node.js + Express hoặc Fastify
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JWT + bcrypt
- **Email:** Resend (free tier: 3,000 emails/tháng)
- **File storage:** Cloudinary free tier (nếu cần upload ảnh)

### DevOps

- **Hosting:** Railway (backend + database) hoặc Render
- **Frontend deploy:** Vercel
- **CI/CD:** GitHub Actions (lint + test + deploy on merge to main)
- **Monitoring:** Sentry (free tier cho error tracking)

### Database Schema (sơ bộ)

```
users           — id, email, name, password_hash, created_at
workspaces      — id, name, created_by
workspace_members — workspace_id, user_id, role (admin/manager/member)
projects        — id, workspace_id, name, description, color, archived_at
tasks           — id, project_id, workspace_id, title, description, status,
                  priority, assignee_id, due_date, created_by, created_at,
                  updated_at, deleted_at (soft delete)
comments        — id, task_id, user_id, content, created_at
activity_logs   — id, task_id, user_id, field_changed, old_value, new_value,
                  action_type, created_at
notifications   — id, user_id, type, reference_id, read_at, created_at
invite_tokens   — id, workspace_id, email, token, expires_at, accepted_at
```

---

## 14. Timeline và Milestones

> Giả định: 2 developer fullstack, 8 tuần.

| Milestone | Tuần | Deliverables | Acceptance Gate |
|---|---|---|---|
| **M0: Setup** | W1 | Repo, CI/CD, DB schema, Auth (FR-01) | Dev env chạy được locally |
| **M1: Core CRUD** | W2–W3 | FR-02, FR-03, FR-04, FR-05 | Tạo, assign, đổi status task hoạt động |
| **M2: Collaboration** | W4 | FR-06, FR-09, FR-10 | Comment, notification, activity log |
| **M3: Dashboards** | W5–W6 | FR-07, FR-08, FR-11 | My Tasks, Kanban board, Reports |
| **M4: Polish & QA** | W7 | FR-12, all NFRs, edge cases | QA pass, performance SLA đạt |
| **M5: Deploy MVP** | W8 | Production deploy, stakeholder demo | Stakeholder sign-off ✅ |

### Quy trình review

- Mỗi cuối tuần: demo nhanh 30 phút với PM + 1 user đại diện.
- Mọi thay đổi scope sau M1 phải qua Change Request (ghi vào Change Log mục 18).

---

## 15. Rủi ro và kế hoạch giảm thiểu

| # | Rủi ro | Khả năng | Ảnh hưởng | Kế hoạch giảm thiểu |
|---|---|---|---|---|
| R-01 | Timeline trễ do estimate sai | Cao | Cao | Đã scope MVP tối thiểu. Feature P2 có thể cut nếu cần. |
| R-02 | Team không adopt, vẫn dùng chat | Trung bình | Cao | Onboarding session 1 giờ. Manager cam kết không giao task qua chat nữa. |
| R-03 | Drag & drop Kanban khó implement đúng trên mobile | Cao | Trung bình | Fallback: click dropdown để đổi status, không bắt buộc drag. |
| R-04 | Email service bị spam filter | Thấp | Trung bình | Cấu hình SPF/DKIM đúng. Test email flow trước khi demo. |
| R-05 | Database schema thay đổi late game | Trung bình | Cao | Thiết kế schema trong M0, review kỹ trước khi code. Dùng Prisma migrate. |
| R-06 | Real-time update (notification) quá tốn tài nguyên | Thấp | Thấp | Polling 5s thay vì WebSocket cho MVP. WebSocket ở V2 nếu cần. |

---

## 16. Stakeholders và RACI

| Người | Role | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|---|
| PM (Product Owner) | PRD, prioritization | R | A | | |
| Tech Lead | Architecture, tech decisions | R | | C | I |
| Frontend Dev | UI implementation | R | | | I |
| Backend Dev | API, DB | R | | | I |
| QA | Test cases, sign-off | R | | | I |
| End User (đại diện) | Feedback | | | C | I |

**Người phê duyệt PRD trước khi design bắt đầu:** PM + Tech Lead
**Người phê duyệt trước khi deploy:** PM + Tech Lead + End User đại diện

---

## 17. Open Questions

Các câu hỏi chưa có câu trả lời — cần resolve trước milestone liên quan:

| # | Câu hỏi | Cần resolve trước | Người quyết định |
|---|---|---|---|
| OQ-01 | Task có thể assign cho nhiều người không? (V1.0 đang thiết kế 1 assignee) | M1 (W2) | PM |
| OQ-02 | Notification email có cần gửi không, hay chỉ in-app là đủ? (Ảnh hưởng email quota) | M2 (W4) | PM + Tech Lead |
| OQ-03 | Comment có hỗ trợ edit/delete không? Nếu có thì giữ history không? | M2 (W4) | PM |
| OQ-04 | "In Review" có phải là trạng thái bắt buộc không? Một số team nhỏ chỉ cần 3 bước. | M1 (W2) | PM + User đại diện |
| OQ-05 | Reports chỉ Manager mới thấy, hay Member cũng thấy stats của mình? | M3 (W5) | PM |
| OQ-06 | Task có sub-task không? (Ảnh hưởng lớn đến data model) | M0 (W1) | PM + Tech Lead |

---

## 18. Change Log

| Phiên bản | Ngày | Người thay đổi | Nội dung thay đổi | Lý do |
|---|---|---|---|---|
| v1.0 | 2026-04-07 | [Quan Nguyen] | Tạo PRD lần đầu | Kickoff dự án |

---

> **Lưu ý quan trọng:** PRD này là **living document**. Mọi thay đổi scope (thêm/bớt feature, thay đổi acceptance criteria) sau khi được sign-off đều phải ghi vào Change Log và được approve bởi PM + Tech Lead trước khi implement.
>
> Nếu phát hiện mâu thuẫn giữa PRD và implementation, PRD là nguồn truth duy nhất — trừ khi có change log ghi nhận ngược lại.

---

*Document owner: [Quan Nguyen] | Review cycle: Mỗi cuối sprint | Next review: [Ngày]*
