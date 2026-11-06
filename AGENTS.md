# AGENTS.md — SEO Management 2025

File này là nguồn quy tắc và ngữ cảnh chung cho mọi AI agent làm việc trên repo, gồm Claude Code, OpenAI Codex, Cursor, GitHub Copilot và các công cụ khác. Nó mô tả mục đích, kiến trúc, dữ liệu, tính năng hiện có, quy tắc nghiệp vụ và quy ước code. Người mới vào dự án cũng nên đọc file này trước.

Mọi thay đổi cần bám theo tài liệu này. Khi code thay đổi làm tài liệu sai lệch, cập nhật tài liệu trong cùng lần thay đổi. Không tạo file quy tắc riêng cho từng công cụ. Các file như `CLAUDE.md` chỉ trỏ về đây.

- **Cập nhật lần cuối:** 2026-11-06, tại commit `2890d3d` trên nhánh `main`
- **Tài liệu liên quan:** [docs/de-xuat-tinh-nang.md](docs/de-xuat-tinh-nang.md) chứa các đề xuất cải tiến và lộ trình

---

## 1. Tổng quan

**Sản phẩm:** webapp nội bộ của công ty GTV SEO (gtvseo.com) để quản lý các hợp đồng dịch vụ SEO với khách hàng.

**Bài toán:** mỗi hợp đồng SEO kéo dài một số tháng, khách thanh toán theo tháng hoặc theo đợt, và mỗi tháng team phải đạt KPI rồi gửi báo cáo cho khách. Nhân sự phụ trách được hưởng hoa hồng khi tháng đó đạt KPI, đã gửi báo cáo và khách đã thanh toán.

**App theo dõi bốn mảng:**

1. Tiến độ KPI theo từng tháng hợp đồng
2. Gửi báo cáo và xác nhận của khách hàng
3. Thanh toán theo tháng hoặc theo đợt, kèm ảnh chứng từ
4. Hoa hồng cho nhân sự, tính tự động và chốt sổ theo tháng

**Người dùng:** account manager và leader phụ trách dự án, quản lý, kế toán, quản trị hệ thống.

**Ngôn ngữ:** toàn bộ giao diện bằng tiếng Việt. Một số giá trị enum lưu trong database cũng là chuỗi tiếng Việt (xem mục 5.3).

---

## 2. Công nghệ và cách chạy

| Thành phần | Công nghệ |
|---|---|
| Frontend | React 19, TypeScript 5.8, Vite 6 |
| Routing | `react-router-dom` 7, dùng `HashRouter` (URL dạng `/#/project/...`) |
| Style | Tailwind CSS nạp qua CDN trong `index.html`, cấu hình màu ngay trong file đó |
| Ngày tháng | `date-fns` 4 |
| Backend | Supabase: Postgres, Auth, Storage. Không có server riêng, không có Edge Function |
| Test, lint | Chưa có |

**Lệnh:**

```bash
npm install
npm run dev      # chạy ở cổng 3000
npm run build    # build production ra dist/
npx tsc --noEmit # kiểm tra kiểu

npm run db:link -- --project-ref ncnofduhsfejlmtjfirn  # nối CLI với project Supabase, làm một lần
npm run db:new -- <ten_migration>  # tạo file migration mới
npm run db:list  # so sánh migration ở máy và trên Supabase
npm run db:push  # áp dụng các migration chưa chạy lên Supabase
```

**Supabase CLI phiên bản 3** mặc định chạy với database ở máy (cần Docker). Mọi lệnh làm việc với project thật phải có cờ `--remote`. Các lệnh `db:list` và `db:push` ở trên đã có sẵn cờ này. Khi gọi trực tiếp `npx supabase ...` thì phải tự thêm.

**Luôn truyền mật khẩu database khi chạy lệnh migration ở máy.** Nếu thiếu mật khẩu, CLI cố tạo tài khoản database tạm `cli_login_postgres` và báo lỗi `permission denied to alter role`, vì tài khoản này đã tồn tại trên project. Nhập mật khẩu vào biến môi trường để không lưu vào lịch sử terminal:

```bash
read -rs "SUPABASE_DB_PASSWORD?Mật khẩu database: "; echo; export SUPABASE_DB_PASSWORD
npm run db:list -- --password "$SUPABASE_DB_PASSWORD"
npm run db:push -- --password "$SUPABASE_DB_PASSWORD"
```

**Tình trạng build tại 2026-11-06:**

- `npm run build` chạy thành công. Bundle khoảng 680 kB, có cảnh báo chunk lớn hơn 500 kB.
- `tsc --noEmit` báo một lỗi duy nhất ở file `SetupGuide.tsx` thừa nằm ở thư mục gốc, file này không được dùng.

**Repo và deploy:**

- Code ở GitHub `minhtuanle412/SEO-Management-Project`, nhánh `main`. Repo đang ở chế độ **public**, nên không bao giờ commit secret như service role key, access token hay mật khẩu database.
- Project Supabase `ncnofduhsfejlmtjfirn` thuộc tổ chức Supabase do tài khoản email công ty GTV SEO làm Owner, từ 2026-11-06. Access token dùng cho CLI và GitHub Actions phải tạo từ tài khoản công ty. Không ghi địa chỉ email vào repo vì repo public.
- Vercel tự build và deploy production mỗi khi push lên `main`. Địa chỉ production là https://seo2026.vercel.app. Không có file `vercel.json`, Vercel dùng cấu hình mặc định cho Vite.
- GitHub Actions workflow `.github/workflows/supabase-migrations.yml` tự áp dụng migration lên Supabase khi push lên `main` có thay đổi trong `supabase/migrations/` (xem mục 2.1).

**Cấu hình Supabase:** URL và anon key hardcode trong `lib/supabaseClient.ts`. Biến `GEMINI_API_KEY` trong `vite.config.ts` và nội dung README là boilerplate từ Google AI Studio, không liên quan app.

**Database:** quản lý bằng migration của Supabase CLI trong `supabase/migrations/`. CLI được cài làm devDependency, gọi qua các lệnh `npm run db:*` ở trên. Chi tiết ở mục 2.1.

**Storage:** cần hai bucket public là `payment_proofs` và `confirmation_proofs`. Hai bucket được tạo trong migration `20261106000100_storage_buckets.sql`.

### 2.1. Quy trình thay đổi database

**Nguồn duy nhất của schema** là các file trong `supabase/migrations/`. Tên file có dạng `YYYYMMDDHHmmss_mo_ta.sql` và chạy theo thứ tự tên.

| File | Nội dung |
|---|---|
| `20261106000000_baseline_schema.sql` | Toàn bộ schema và RLS tại thời điểm chuyển sang migration, lấy từ master script cũ |
| `20261106000100_storage_buckets.sql` | Hai storage bucket và policy upload |

**Trang `/setup`** (`components/SetupGuide.tsx`) không còn chứa SQL viết tay. Trang này dùng `import.meta.glob` để ghép tất cả file migration thành một script, bọc trong `BEGIN` và `COMMIT`, dùng cho cách cài thủ công. Trang mở được kể cả khi chưa đăng nhập.

**Có ba cách áp dụng thay đổi lên Supabase:**

1. **Tự động (mặc định):** merge vào `main`, workflow `Supabase migrations` trên GitHub Actions chạy `supabase db push`. Có thể chạy lại bằng tay ở tab Actions qua nút "Run workflow". Workflow cần hai repository secret là `SUPABASE_ACCESS_TOKEN` và `SUPABASE_DB_PASSWORD`. Token nên là scoped token chỉ cho project này, với quyền đọc: `project_admin_read`, `projects_read`, `database_pooling_config_read`, `branching_production_read`. Chạy `npx supabase <lệnh> --help` để xem quyền mà từng lệnh cần.
2. **Bằng CLI ở máy:** `npm run db:push`. CLI ghi lại migration nào đã chạy trong bảng `supabase_migrations.schema_migrations` và chỉ chạy các file mới. Dùng khi cần áp dụng ngay hoặc khi workflow lỗi.
3. **Thủ công:** copy script ở trang `/setup` hoặc nội dung file migration mới, chạy trong Supabase SQL Editor. Cách này không ghi lại lịch sử, nên sau đó chạy `npx supabase migration repair --status applied <version> --remote` để CLI biết file đó đã chạy.

**Thiết lập lần đầu cho database production đang chạy:** production đã có sẵn nội dung baseline do từng chạy tay, nên không chạy lại baseline mà đánh dấu là đã áp dụng.

```bash
npx supabase login                                      # đăng nhập bằng tài khoản công ty
npm run db:link -- --project-ref ncnofduhsfejlmtjfirn
npx supabase migration repair --status applied 20261106000000 --remote --password "$SUPABASE_DB_PASSWORD"
npm run db:push    # áp dụng migration storage và các migration sau này
```

**Quy tắc viết migration:**

- Mỗi thay đổi là một file mới tạo bằng `npm run db:new -- <ten>`. Không sửa file migration đã được áp dụng lên production.
- Viết theo kiểu chạy lại nhiều lần được: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` trước `CREATE POLICY`, `ON CONFLICT DO NOTHING`. Lý do là trang `/setup` ghép toàn bộ migration thành một script để chạy tay.
- Không viết `BEGIN` và `COMMIT` trong file. CLI tự chạy mỗi file trong một transaction.
- Thay đổi xóa dữ liệu hoặc đổi kiểu cột phải được người dùng xác nhận trước.
- **Migration phải tương thích ngược với code đang chạy.** Vercel deploy code và GitHub Actions chạy migration cùng lúc, không có thứ tự đảm bảo. Vì vậy chỉ thêm bảng, cột, policy ở bước đầu. Muốn xóa hoặc đổi tên cột thì làm hai lần merge: lần đầu thêm cột mới và cho code dùng cột mới, lần sau mới xóa cột cũ.

**Cấu hình CLI:** `supabase/config.toml` sinh bởi `supabase init`, chỉ dùng khi chạy Supabase ở máy (cần Docker). Thư mục `supabase/.temp` và `supabase/.branches` đã được gitignore.

---

## 3. Cấu trúc thư mục

```
App.tsx                     Router, layout, tải dữ liệu, các hàm ghi dữ liệu chính
index.tsx, index.html       Điểm vào; index.html chứa Tailwind CDN và importmap
types.ts                    Kiểu dữ liệu và enum dùng chung
lib/supabaseClient.ts       Khởi tạo Supabase client
contexts/
  AuthContext.tsx           Phiên đăng nhập, profile, cờ phân quyền
  ToastContext.tsx          Thông báo dạng toast
components/
  Dashboard.tsx             Trang danh sách dự án (route /)
  ProjectCard.tsx           Card dự án trong danh sách
  AddProjectModal.tsx       Form tạo dự án
  ProjectDetail.tsx         Trang chi tiết dự án, khung chứa các tab
  project-detail/
    KpiTab.tsx              Tab Quản lý KPI
    ReportTab.tsx           Tab Quản lý báo cáo
    PaymentTab.tsx          Tab Quản lý thanh toán, kèm modal quản lý đợt
    CommissionTab.tsx       Tab Quản lý hoa hồng
    AssignmentTab.tsx       Tab Phân công
    SettingsTab.tsx         Tab Cấu hình và yêu cầu xóa dự án
    PerformanceTab.tsx      KHÔNG DÙNG (nhúng Looker Studio, chưa nối vào)
  CommissionReportPage.tsx  Hoa hồng theo dự án, chốt sổ
  CommissionPayrollPage.tsx Hoa hồng theo cá nhân, xuất CSV, in
  ManagementPage.tsx        Quản lý nhân sự, phòng ban, chức vụ, tỷ lệ hoa hồng
  UserManagementPage.tsx    Quản lý tài khoản đăng nhập
  LoginPage.tsx             Đăng nhập và đăng ký
  SetupGuide.tsx            Trang /setup, ghép SQL từ supabase/migrations
  ImagePreviewModal.tsx     Xem ảnh chứng từ
  ProgressBar.tsx           Thanh tiến độ
  Icons.tsx                 Bộ icon SVG
  ui/Button.tsx             Nút dùng chung
  Header.tsx                KHÔNG DÙNG
SetupGuide.tsx (gốc)        KHÔNG DÙNG, bản cũ, gây lỗi tsc
supabase/
  config.toml               Cấu hình Supabase CLI
  migrations/               Toàn bộ schema, RLS, storage (xem mục 2.1)
AGENTS.md                   File này
CLAUDE.md                   Trỏ về AGENTS.md cho Claude Code
docs/
  de-xuat-tinh-nang.md      Đề xuất cải tiến và lộ trình
```

---

## 4. Kiến trúc và luồng dữ liệu

**Khởi động** (`AppContent` trong `App.tsx`), theo thứ tự:

1. Supabase chưa cấu hình thì hiện màn hình hướng dẫn.
2. Đang kiểm tra phiên đăng nhập thì hiện "Đang tải...".
3. Chưa đăng nhập thì chỉ có route `/setup` và trang đăng nhập.
4. Đã đăng nhập thì gọi `fetchAllData`, lỗi thì hiện màn hình lỗi có nút thử lại.
5. Hiện layout chính gồm sidebar (desktop), bottom nav (mobile) và các route.

**Tải dữ liệu:** `fetchAllData` chạy song song 5 query và lưu vào state của `AppContent`:

- `projects` kèm `kpi_entries`, `monthly_breakdown`, `payment_installments`, `phan_cong_du_an` (kèm `nhan_su`, `chuc_vu`, `phong_ban`)
- `nhan_su`, `cau_hinh_hoa_hong`, `phong_ban`, `chuc_vu`

Dữ liệu được truyền xuống các trang qua props. Không có thư viện quản lý state hay cache.

**Mapping tên cột:** chỉ dữ liệu dự án được đổi từ snake_case sang camelCase (các hàm `mapSupabase*` đầu `App.tsx`). Dữ liệu nhân sự, phân công, hoa hồng giữ nguyên tên cột tiếng Việt snake_case như `ho_ten`, `chuc_vu`, `ty_le_phan_cong`. Khi thêm cột vào bảng dự án phải cập nhật cả type trong `types.ts` và hàm mapping.

**Ghi dữ liệu:** có hai kiểu, đang tồn tại song song.

- Hàm định nghĩa trong `App.tsx` rồi truyền xuống qua props: `addProject`, `addKpiEntry`, `updateKpiEntry`, `updateMonthlyPayment`, `updateInstallmentPayment`, `updateKpiConfirmation`, `updateProjectName`, `updateKpiCommissionStatus`.
- Component gọi `supabase` trực tiếp: phân công, đợt thanh toán, upload file, yêu cầu xóa, chốt sổ, quản lý cấu hình, quản lý tài khoản.

Sau mỗi lần ghi, app gọi lại `fetchAllData` để tải lại toàn bộ. Riêng duyệt xóa dự án thì `window.location.reload()`.

**Thông báo:** dùng `useToast().addToast(message, 'success' | 'error')`. Mọi lỗi từ Supabase đều được báo qua toast bằng tiếng Việt.

---

## 5. Mô hình dữ liệu

### 5.1. Các bảng

| Bảng | Ý nghĩa | Cột chính |
|---|---|---|
| `projects` | Hợp đồng dự án | `name`, `client`, `start_date`, `end_date`, `duration_months`, `total_budget`, `payment_type` (`monthly` hoặc `milestone`), `looker_studio_url` |
| `monthly_breakdown` | Một dòng cho mỗi tháng hợp đồng, unique theo dự án và tháng | `month` (1..N), `payment_status`, `payment_date`, `payment_proof_url`, `installment_id` |
| `payment_installments` | Đợt thanh toán của dự án theo đợt | `name`, `payment_percentage`, `status`, `payment_date`, `payment_proof_url` |
| `kpi_entries` | Một lần ghi nhận KPI | `contract_month`, `actual_month` (date, luôn là ngày 01), `kpi_percentage`, `report_status`, `report_sent_date`, `notes`, `customer_confirmation_url`, `commission_status`, `commission_paid_date` |
| `nhan_su` | Nhân sự (không phải tài khoản đăng nhập) | `ho_ten`, `phong_ban_id`, `chuc_vu_id` |
| `phong_ban` | Phòng ban | `name` (unique) |
| `chuc_vu` | Chức vụ | `name` (unique) |
| `phan_cong_du_an` | Phân công nhân sự vào dự án, unique theo dự án và nhân sự | `project_id`, `nhan_su_id`, `ty_le_phan_cong` (% đóng góp, mặc định 100) |
| `cau_hinh_hoa_hong` | Tỷ lệ hoa hồng theo chức vụ, unique theo chức vụ | `chuc_vu_id`, `ty_le_hoa_hong` (số phần trăm, ví dụ 5 nghĩa là 5%) |
| `commission_payouts` | Snapshot hoa hồng khi chốt sổ | `project_id`, `staff_id`, `amount`, `month` (chuỗi `YYYY-MM`), `effort_percentage`, `created_by` |
| `project_deletion_requests` | Yêu cầu xóa dự án, unique theo dự án | `project_id`, `requested_by` |
| `profiles` | Tài khoản đăng nhập, khóa chính trùng `auth.users.id` | `email`, `full_name`, `role` |

Các bảng con của `projects` đều xóa theo dây chuyền khi xóa dự án. Trigger `on_auth_user_created` tự tạo profile với role `staff` khi có user mới.

**Lưu ý:** `nhan_su` và `profiles` là hai thực thể tách biệt, không có liên kết. Nhân sự dùng để phân công và tính hoa hồng. Profile dùng để đăng nhập và phân quyền.

### 5.2. Hai loại "tháng"

- **Tháng hợp đồng** (`contract_month`, `monthly_breakdown.month`) là số thứ tự 1..N trong hợp đồng.
- **Tháng thực tế** (`actual_month`) là tháng dương lịch đã thực hiện.

Một tháng hợp đồng có thể có nhiều KPI entry ở nhiều tháng thực tế khác nhau. Trường hợp này xảy ra khi tháng trước chưa đạt và team làm tiếp sang tháng sau. Thanh toán gắn với tháng hợp đồng. Hoa hồng tính theo tháng thực tế.

### 5.3. Giá trị enum lưu trong database

Các enum trong `types.ts` lưu nguyên chuỗi tiếng Việt vào database. Không được đổi các chuỗi này nếu không viết migration cho dữ liệu cũ.

| Enum | Giá trị |
|---|---|
| `PaymentStatus` | `Đã thanh toán`, `Chưa thanh toán` |
| `ReportStatus` | `Đã gửi`, `Chưa gửi` |
| `CommissionStatus` | `Đã chi trả`, `Chưa chi trả`, `Không áp dụng` |
| `PaymentType` | `monthly`, `milestone` |
| `UserRole` | `super_admin`, `admin`, `manager`, `staff` |

### 5.4. Storage

| Bucket | Đường dẫn file | Dùng cho |
|---|---|---|
| `payment_proofs` | `{projectId}/monthly/{monthId}-{timestamp}.{ext}` hoặc `{projectId}/installments/...` | Ảnh chứng từ thanh toán |
| `confirmation_proofs` | `{projectId}/confirmations/{kpiEntryId}-{timestamp}.{ext}` | Ảnh khách hàng xác nhận báo cáo |

URL lưu vào database là public URL. Bucket và policy upload được tạo trong migration `20261106000100_storage_buckets.sql`.

---

## 6. Phân quyền

**Cờ trong `AuthContext`:**

| Cờ | Role được tính |
|---|---|
| `isSuperAdmin` | `super_admin` |
| `isAdmin` | `admin`, `super_admin` |
| `isManager` | `manager`, `admin`, `super_admin` |

**Phân quyền ở giao diện:**

| Chức năng | Ai thấy |
|---|---|
| Danh sách dự án, chi tiết, các tab nhập liệu, hai trang hoa hồng | Mọi user đã đăng nhập |
| Duyệt yêu cầu xóa dự án, nút yêu cầu xóa, nút chốt sổ | Manager trở lên |
| Quản lý cấu hình, Tài khoản hệ thống, Cài đặt Database | Admin trở lên. Route chỉ được đăng ký khi là admin |
| Gán role `super_admin` cho người khác | Chỉ super admin |
| Sửa và xóa tài khoản super admin | Chỉ super admin |

**RLS thực tế trong database** lỏng hơn giao diện:

- `projects`, `monthly_breakdown`, `payment_installments`, `kpi_entries`, `phan_cong_du_an`: mọi user đã đăng nhập có toàn quyền, kể cả xóa.
- `nhan_su`, `phong_ban`, `chuc_vu`, `cau_hinh_hoa_hong`: ai cũng đọc được, chỉ admin trở lên được ghi.
- `commission_payouts`: user đã đăng nhập được đọc, manager trở lên được thêm. Không ai được sửa hay xóa.
- `project_deletion_requests`: manager trở lên toàn quyền.
- `profiles`: ai cũng đọc được, user sửa được profile của mình, admin trở lên sửa được mọi profile.

**Hệ quả quan trọng:** trang đăng nhập cho phép tự đăng ký. Người tự đăng ký nhận role `staff` và theo RLS hiện tại có toàn quyền đọc ghi dữ liệu dự án.

**Khi thêm chức năng có giới hạn quyền,** phải ép quyền ở cả RLS chứ không chỉ ẩn trên giao diện.

---

## 7. Tính năng hiện có theo màn hình

### 7.1. Đăng nhập (`LoginPage`)

- Đăng nhập bằng email và mật khẩu.
- Tự đăng ký tài khoản mới.
- Link tới trang hướng dẫn cài đặt.

### 7.2. Danh sách dự án (route `/`, `Dashboard`)

- Lưới card dự án. Mỗi card có trạng thái "Đang hoạt động" hoặc "Đã kết thúc" và 3 thanh tiến độ:
  - **Tiến độ KPI:** số tháng hợp đồng đạt trên tổng số tháng.
  - **Triển khai thực tế:** số tháng thực tế khác nhau đã có KPI trên tổng số tháng.
  - **Thanh toán:** số tháng hoặc đợt đã thu, kèm số tiền đã thu trên tổng ngân sách.
- Tìm theo tên dự án hoặc khách hàng.
- Lọc theo Leader, trạng thái (đang chạy, sắp kết thúc trong 30 ngày, đã kết thúc), công nợ (đang nợ phí).
- Sắp xếp theo ngày bắt đầu mới nhất, cũ nhất, hoặc tên khách hàng.
- Nút "Thêm dự án mới" mở form gồm tên, khách hàng, ngân sách, hình thức thanh toán, ngày bắt đầu, số tháng.
- Khối "Yêu cầu xóa dự án cần phê duyệt" cho manager. Người yêu cầu không tự duyệt được yêu cầu của mình.

### 7.3. Chi tiết dự án (route `/project/:slug`, `ProjectDetail`)

**Phần đầu trang:**

- Sửa tên dự án tại chỗ. Đây là trường duy nhất của dự án sửa được.
- Banner đỏ khi dự án đang chờ duyệt xóa.
- 4 thẻ tổng quan: thông tin chung, KPI trung bình, số tiền đã thanh toán, số nhân sự phụ trách.

**Tab Quản lý KPI:**

- Lưới các tháng hợp đồng. Màu xanh nếu đạt, cam nếu chưa đạt, xám nếu chưa có KPI. Mỗi ô có badge trạng thái thanh toán và hoa hồng.
- Form thêm KPI gồm tháng hợp đồng, tháng thực tế, % KPI, ghi chú, và ô "đã gửi báo cáo". Sau khi thêm, form tự nhảy sang tháng tiếp theo.
- Bảng toàn bộ KPI entry.

**Tab Quản lý báo cáo:**

- Đánh dấu đã gửi báo cáo, ngày gửi tự lấy là hôm nay.
- Upload ảnh khách hàng xác nhận (JPEG, PNG, GIF, WEBP) và xem lại ảnh.

**Tab Quản lý thanh toán:**

- **Dự án theo tháng:** lưới các tháng, mỗi tháng có số tiền bằng ngân sách chia số tháng.
- **Dự án theo đợt:** lưới các đợt. Modal "Quản lý các đợt" để thêm đợt (tên, %, gán các tháng chưa thuộc đợt nào). Tổng % các đợt không vượt quá 100.
- Nút "Cập nhật thanh toán" mở modal chọn ngày thanh toán và ảnh chứng từ (tùy chọn). Không có ảnh thì hiện "Đã xác nhận nhanh".

**Tab Quản lý hoa hồng:**

- Liệt kê KPI entry từ 75% trở lên, nút "Đánh dấu đã trả HH" ghi ngày hôm nay.

**Tab Phân công:**

- Thêm nhân sự (chỉ nhân sự chưa được phân công) với % đóng góp từ 0 đến 100.
- Sửa % đóng góp, xóa phân công.

**Tab Cấu hình:**

- Xem thông tin chung.
- Manager thấy "Khu vực nguy hiểm" với nút yêu cầu xóa dự án.

### 7.4. Hoa hồng theo dự án (route `/commission-report`)

- Lọc theo tháng chi trả, dự án, phòng ban, nhân sự.
- Tháng chưa chốt hiển thị số **dự kiến**, chia nhóm "tháng hiện tại" và "truy thu từ tháng X". Mỗi dòng hiện trạng thái KPI, báo cáo, thanh toán, hợp lệ hay không, và hoa hồng từng người.
- Manager bấm "Chốt sổ tháng này" để lưu snapshot. Tháng đã chốt hiện biểu tượng khóa và chỉ đọc từ snapshot.

### 7.5. Hoa hồng theo cá nhân (route `/commission-payroll`)

- Tổng hoa hồng theo từng nhân sự trong tháng, lọc theo phòng ban, tìm theo tên.
- Hai thẻ tổng: số nhân sự nhận hoa hồng và tổng tiền.
- Modal chi tiết từng người theo dự án.
- Xuất CSV (có BOM UTF-8 để mở bằng Excel) và in.
- Tháng đã chốt thì đọc từ snapshot. Tỷ lệ hoa hồng hiển thị được suy ngược từ số tiền.

### 7.6. Quản lý cấu hình (route `/management`, admin)

- 4 tab: Nhân sự, Phòng ban, Chức vụ, Hoa hồng.
- CRUD nhân sự (họ tên, phòng ban, chức vụ), phòng ban, chức vụ.
- Sửa tỷ lệ hoa hồng cho từng chức vụ.

### 7.7. Tài khoản hệ thống (route `/admin/users`, admin)

- Danh sách profile kèm role.
- Thêm tài khoản: tạo qua một Supabase client tạm bằng `signUp`, sau đó cập nhật role.
- Sửa họ tên và role. Không sửa được role của chính mình.
- Đổi mật khẩu người khác bằng cách dán Service Role Key, khóa được lưu tạm trong `sessionStorage`.
- Xóa tài khoản. Thực chất chỉ xóa dòng `profiles`.

### 7.8. Cài đặt Database (route `/setup`)

- Hiển thị master SQL script có nút copy, và lệnh SQL để nâng một tài khoản lên super admin.

---

## 8. Quy tắc nghiệp vụ

Các quy tắc dưới đây đang được viết lặp lại ở nhiều component. Khi sửa một quy tắc, phải tìm và sửa ở mọi nơi, hoặc tốt hơn là gom về một chỗ theo đề xuất DX-010.

### 8.1. Dự án

- **Ngày kết thúc** bằng ngày bắt đầu cộng số tháng trừ 1 (`addMonths(start, duration - 1)`).
- **Tạo dự án** sẽ tạo luôn N dòng `monthly_breakdown` ở trạng thái chưa thanh toán. Nếu bước này lỗi thì xóa dự án vừa tạo.
- **Đã kết thúc** khi ngày kết thúc nhỏ hơn hôm nay.
- **Slug URL** là `slugify(tên)--{id}`. Trang chi tiết lấy id bằng phần sau dấu `--` cuối cùng.
- **Leader** là nhân sự được phân công có tên chức vụ chứa chữ "leader", không phân biệt hoa thường.

### 8.2. KPI

- **Ngưỡng đạt** là 75%.
- **KPI của một tháng hợp đồng** là entry có tháng thực tế mới nhất trong các entry của tháng đó.
- **Tạo KPI entry:** nếu KPI từ 75% thì `commission_status` là `Chưa chi trả`, ngược lại là `Không áp dụng`.
- `actual_month` luôn lưu dạng `YYYY-MM-01`.
- **KPI trung bình** ở trang chi tiết là trung bình của KPI mới nhất mỗi tháng hợp đồng.

### 8.3. Thanh toán

- **Doanh thu tháng** bằng tổng ngân sách chia số tháng. Áp dụng cho cả dự án theo đợt khi tính hoa hồng.
- **Giá trị một đợt** bằng tổng ngân sách nhân % của đợt.
- **Một tháng được coi là đã thanh toán** khi:
  - dự án theo tháng: dòng `monthly_breakdown` có trạng thái đã thanh toán;
  - dự án theo đợt: tháng được gán vào một đợt và đợt đó đã thanh toán. Tháng chưa gán đợt luôn coi là chưa thanh toán.
- **Ngày đến hạn của tháng hợp đồng m** bằng ngày bắt đầu cộng m tháng. Dự án "đang nợ phí" khi có tháng đã quá ngày đến hạn mà chưa thanh toán.
- Thanh toán chỉ đi một chiều từ chưa sang đã thanh toán, không có thao tác hoàn tác.

### 8.4. Hoa hồng

- **Điều kiện hợp lệ** của một KPI entry, cần đủ cả ba:
  1. KPI từ 75% trở lên
  2. Báo cáo đã gửi
  3. Tháng hợp đồng tương ứng đã thanh toán
- **Công thức** cho mỗi nhân sự được phân công:

  ```
  hoa hồng = round(doanh thu tháng × tỷ lệ HH của chức vụ / 100 × % đóng góp / 100)
  ```

- **Tháng tính hoa hồng** là tháng thực tế của KPI entry.
- **Truy thu** (chỉ có ở trang Hoa hồng theo dự án): KPI entry có tháng thực tế trước tháng đang xem, đã thanh toán, và ngày thanh toán nằm trong tháng đang xem, được tính vào tháng đang xem.
- **Chốt sổ:**
  - Ghi vào `commission_payouts` các dòng có số tiền lớn hơn 0.
  - Không có dòng nào hợp lệ thì không chốt được.
  - Một tháng được coi là đã chốt khi bảng này có ít nhất một dòng của tháng đó. Khi đó cả hai trang hoa hồng chỉ đọc snapshot, không tính lại.
  - Snapshot không sửa hay xóa được qua giao diện và RLS.
- **Trạng thái hoa hồng trên KPI entry** (`commission_status`) là cơ chế riêng, đổi bằng tay ở tab Quản lý hoa hồng. Cơ chế này không liên quan tới snapshot chốt sổ.

### 8.5. Xóa dự án

1. Manager gửi yêu cầu. Mỗi dự án chỉ có một yêu cầu đang chờ.
2. Một manager khác duyệt hoặc từ chối trên trang danh sách.
3. Duyệt thì xóa dự án và toàn bộ dữ liệu con theo dây chuyền.

---

## 9. Quy ước code và giao diện

**Ngôn ngữ:**

- Text giao diện, thông báo toast, hộp xác nhận đều bằng tiếng Việt có dấu.
- Comment trong code đang trộn tiếng Việt và tiếng Anh, cả hai đều chấp nhận được.

**Định dạng:**

- Tiền: `new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })`. Card dự án dùng dạng rút gọn như `50tr`, `1tỷ`.
- Ngày hiển thị: `dd/MM/yyyy`. Tháng hiển thị: `MM/yyyy`. Ngày lưu database: `yyyy-MM-dd`. Tháng trong bộ lọc và snapshot: `yyyy-MM`.

**Màu Tailwind tùy chỉnh** (khai báo trong `index.html`):

| Tên | Mã màu | Dùng cho |
|---|---|---|
| `primary` | `#1D4ED8` | Màu chính |
| `secondary` | `#93C5FD` | Màu phụ |
| `light` | `#F0F9FF` | Nền trang |
| `dark` | `#1E293B` | Chữ đậm, sidebar |
| `accent` | `#F59E0B` | Nhấn mạnh, KPI |

**Màu theo ý nghĩa:**

- Xanh lá: đạt, đã thanh toán
- Cam: chưa đạt, truy thu
- Đỏ: chưa thanh toán, cảnh báo, đã chốt sổ
- Xanh dương: thông tin

**Component dùng chung:**

- `ui/Button` có các variant `primary`, `secondary`, `danger`, `success`, `outline`, `ghost`, các size `sm`, `md`, `lg`, và hỗ trợ `isLoading`, `icon`.
- `ProgressBar`, `ImagePreviewModal`.
- Icon lấy từ `Icons.tsx`. Không thêm thư viện icon mới.

**Bố cục:**

- Card trắng `bg-white rounded-lg shadow-sm border border-gray-200`.
- Modal là overlay `fixed inset-0 bg-black bg-opacity-50`.
- Responsive: sidebar ẩn dưới breakpoint `sm`, thay bằng bottom nav cố định. Nội dung trang có `pb-24` trên mobile để không bị bottom nav che.

**Logo:** lấy từ URL ngoài `https://gtvseo.com/wp-content/uploads/2023/10/logo-new-2048x1297.png`.

---

## 10. Hạn chế đã biết

Chi tiết và hướng xử lý nằm trong [docs/de-xuat-tinh-nang.md](docs/de-xuat-tinh-nang.md).

**Bảo mật:**

- Ai cũng tự đăng ký được và có toàn quyền dữ liệu dự án (DX-019). Đã kiểm tra ngày 2026-11-06: production đang mở đăng ký, có yêu cầu xác nhận email.
- Thao tác xóa dự án không được ép ở RLS (DX-015).
- Service Role Key được dán vào trình duyệt (DX-016).
- Xóa tài khoản không chặn được đăng nhập (DX-017).

**Nghiệp vụ:**

- Hai cơ chế hoa hồng chạy song song (DX-013).
- Trang Hoa hồng theo cá nhân không tính truy thu (DX-014).
- Trang Hoa hồng theo dự án tra tỷ lệ hoa hồng theo tên chức vụ, trang Hoa hồng theo cá nhân tra theo id chức vụ (DX-014).
- Không sửa hoặc xóa được KPI entry, đợt thanh toán, trạng thái thanh toán, hay thông tin dự án ngoài tên (DX-020).
- Tổng % đóng góp trong một dự án không bị giới hạn, có thể vượt 100.

**Kỹ thuật:**

- Logic nghiệp vụ lặp lại ở nhiều component (DX-010).
- Có file không dùng, trong đó một file làm `tsc` báo lỗi (DX-011).
- Cấu hình Supabase hardcode (DX-012).
- Tailwind CDN và importmap thừa (DX-018).
- Mỗi lần ghi dữ liệu đều tải lại toàn bộ dữ liệu.
- Chưa có test.

---

## 11. Nguyên tắc khi phát triển tiếp

1. **Đọc tài liệu này và `docs/de-xuat-tinh-nang.md` trước khi bắt đầu một tính năng.** Khi làm một đề xuất, cập nhật trạng thái của nó trong file đề xuất.
2. **Giữ nguyên quy tắc nghiệp vụ ở mục 8** trừ khi người dùng yêu cầu đổi. Khi đổi, sửa mọi nơi dùng quy tắc đó và cập nhật mục 8.
3. **Mọi thay đổi database là một file migration mới** trong `supabase/migrations/`, theo quy tắc ở mục 2.1. Không sửa migration cũ, không viết SQL vào component. Agent không tự chạy `db:push` lên production. Hãy báo người dùng tên file migration mới và lệnh cần chạy.
4. **Không đổi chuỗi enum** ở mục 5.3 khi chưa có kế hoạch migrate dữ liệu cũ.
5. **Thêm cột cho bảng dự án** thì cập nhật cả `types.ts` và hàm mapping trong `App.tsx`.
6. **Giới hạn quyền** phải làm ở cả giao diện và RLS.
7. **Giao diện mới** dùng tiếng Việt, theo quy ước màu và component ở mục 9, và kiểm tra hiển thị trên mobile.
8. **Kiểm tra trước khi báo xong:** chạy `npm run build` và `npx tsc --noEmit`. Lỗi có sẵn ở file `SetupGuide.tsx` gốc được bỏ qua cho tới khi xử lý DX-011.
9. **Cập nhật tài liệu này** khi thêm màn hình, bảng, quy tắc hoặc quy ước mới, và sửa ngày "Cập nhật lần cuối".

---

## 12. Thuật ngữ

| Thuật ngữ | Ý nghĩa | Trong code |
|---|---|---|
| Tháng HĐ | Tháng hợp đồng, số thứ tự 1..N | `contractMonth`, `contract_month`, `month` |
| Tháng thực tế | Tháng dương lịch thực hiện | `actualMonth`, `actual_month` |
| Theo tháng / theo đợt | Hình thức thanh toán | `PaymentType.Monthly` / `PaymentType.Milestone` |
| Đợt thanh toán | Một phần % ngân sách, gán cho một số tháng | `installments`, `payment_installments` |
| TT | Thanh toán | `paymentStatus` |
| BC | Báo cáo | `reportStatus` |
| C.N, KH confirm | Xác nhận của khách hàng | `customerConfirmationUrl` |
| HH | Hoa hồng | `commission` |
| Nhân sự | Người được phân công, không phải tài khoản | `nhan_su`, `Staff` |
| Phòng ban | Department | `phong_ban` |
| Chức vụ | Position | `chuc_vu` |
| Phân công | Gán nhân sự vào dự án | `phan_cong_du_an`, `assignments` |
| % đóng góp | Tỷ lệ phân công | `ty_le_phan_cong`, `effort_percentage` |
| Tỷ lệ HH | Phần trăm hoa hồng theo chức vụ | `ty_le_hoa_hong` |
| Truy thu | Hoa hồng của tháng cũ, được trả khi khách thanh toán muộn | `isBackPay` |
| Chốt sổ | Lưu snapshot hoa hồng tháng, sau đó không đổi | `commission_payouts`, `isMonthLocked` |
| Nợ phí | Có tháng quá hạn chưa thanh toán | `has_debt` |
