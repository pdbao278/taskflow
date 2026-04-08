# Implementation Plan

## Milestones

| Milestone | Tuần | Functional Requirements | Files/Modules | Dependencies | Acceptance Gate |
|---|---|---|---|---|---|
| **M0: Setup** | W1 | FR-01 | `src/auth/`, `src/db/`, CI/CD config | Không có | Dev env chạy được locally |
| **M1: Core CRUD** | W2–W3 | FR-02, FR-03, FR-04, FR-05 | `src/tasks/`, `src/users/` | M0 | Tạo, assign, đổi status task hoạt động |
| **M2: Collaboration** | W4 | FR-06, FR-09, FR-10 | `src/comments/`, `src/notifications/`, `src/activity-log/` | M1 | Comment, notification, activity log |
| **M3: Dashboards** | W5–W6 | FR-07, FR-08, FR-11 | `src/dashboard/`, `src/kanban/`, `src/reports/` | M2 | My Tasks, Kanban board, Reports |
| **M4: Polish & QA** | W7 | FR-12, all NFRs, edge cases | Toàn bộ codebase | M3 | QA pass, performance SLA đạt |
| **M5: Deploy MVP** | W8 | Production deploy, stakeholder demo | Deployment scripts, `docs/` | M4 | Stakeholder sign-off ✅ |

---

## Notes
- Quy trình review: Mỗi cuối tuần demo nhanh 30 phút với PM + 1 user đại diện.
- Mọi thay đổi scope sau M1 phải qua Change Request (ghi vào Change Log mục 18 trong PRD).