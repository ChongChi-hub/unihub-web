# Unihub Web

Giao diện web cho nền tảng quản lý đào tạo và học tập đại học **Unihub**, xây dựng bằng **React 19**, **TypeScript**, **Vite**, **React Router** và **Axios**.

## Tính năng đã triển khai

- **Design System & Layout (`src/styles/`, `src/shared/`):**
  - Bảng màu tùy biến theo theme (**Light / Dark mode**) lưu trạng thái vào `localStorage`.
  - `AppShell` với sidebar điều hướng tự động thay đổi theo vai trò người dùng (`ADMIN`, `LECTURER`, `STUDENT`), header có nút đổi giao diện và đăng xuất.
  - Bộ component dùng chung: `DataTable`, `Modal`, `ToastProvider`, `StateView` (xử lý đồng nhất 3 trạng thái **Loading / Rỗng / Lỗi**).
- **Axios Client & Tự động làm mới phiên (`src/shared/api/http.ts`):**
  - Tự động gắn `Authorization: Bearer <accessToken>` và `X-Correlation-Id` cho mọi request.
  - Interceptor tự động gọi `POST /api/v1/auth/refresh` khi token hết hạn (`401`); nếu refresh thất bại sẽ xóa phiên và chuyển về `/login`.
- **Xác thực & Phân quyền 3 cổng (`src/features/auth/`):**
  - Trang đăng nhập (`/login`) hỗ trợ email/mật khẩu và **Đăng nhập bằng Google OAuth2** (`/oauth/callback`).
  - `ProtectedRoute` chặn truy cập chưa đăng nhập (`/login`) và sai vai trò (`/403`).
  - Điều hướng tự động theo vai trò:
    - **Admin (`/admin`):** Tổng quan, Quản lý người dùng (`/admin/users` — tìm kiếm, khóa/mở khóa), Danh mục học thuật (`/admin/academic` — Khoa, Môn học).
    - **Giảng viên (`/lecturer`):** Cổng Giảng viên.
    - **Sinh viên (`/student`):** Cổng Sinh viên.

## Cấu trúc thư mục

```text
Unihub-web/
├── .github/workflows/       # CI (gitleaks, lint, build, docker) & CD (push GHCR)
├── deploy/
│   ├── Dockerfile           # Multi-stage build (Node 22 -> Nginx 1.27)
│   └── nginx.conf           # Cấu hình SPA fallback và /health
├── src/
│   ├── features/
│   │   ├── admin/           # Trang quản trị Admin, Users, Academic
│   │   ├── auth/            # AuthContext, LoginPage, OAuthCallbackPage, ProtectedRoute, 403
│   │   ├── lecturer/        # Cổng Giảng viên
│   │   └── student/         # Cổng Sinh viên
│   ├── shared/
│   │   ├── api/             # Axios client + refresh token interceptor
│   │   ├── components/      # DataTable, Modal, StateView, ToastProvider
│   │   ├── layout/          # AppShell (sidebar + header)
│   │   └── theme/           # ThemeProvider (light/dark)
│   ├── styles/              # Design tokens & global CSS
│   ├── App.tsx
│   └── main.tsx
├── compose.prod.yml         # Chạy bản production-like từ GHCR + Traefik (unihub.localhost)
├── docker-compose.yml       # Chạy Docker build tại chỗ
└── package.json
```

## Cấu hình & Chạy phát triển (Local)

1. Tạo file biến môi trường:
   ```bash
   cp .env.example .env
   ```
   Mặc định:
   - `WEB_PORT=3000`
   - `VITE_API_BASE_URL=http://localhost:8080/api` (trỏ tới `api-gateway`)

2. Cài đặt và chạy dev server:
   ```bash
   npm install
   npm run dev
   ```
   Truy cập: `http://localhost:3000`.

3. Kiểm tra chất lượng code & build:
   ```bash
   npm run lint     # Kiểm tra ESLint
   npm run format   # Format code bằng Prettier
   npm run build    # Kiểm tra TypeScript (tsc -b) & build production (dist/)
   ```

## Docker & CI/CD

- **Chạy bằng Docker build local:**
  ```bash
  docker compose --profile core up -d --build
  ```
- **CI (`.github/workflows/ci.yml`):** Quét secret (`gitleaks`), chạy `npm ci && npm run lint && npm run build` và kiểm tra build `deploy/Dockerfile`.
- **CD (`.github/workflows/cd.yml`):** Tự động build và đẩy image lên **GHCR (`ghcr.io`)** khi merge vào `main`.
- **Chạy production-like:** Dùng [compose.prod.yml](compose.prod.yml) kết hợp Traefik từ `Unihub-service` để truy cập tại `https://unihub.localhost`.
