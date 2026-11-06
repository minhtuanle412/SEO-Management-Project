# Đề xuất tính năng — SEO Management 2025

File này lưu các đề xuất cải tiến cho webapp quản lý dự án SEO. Mỗi đề xuất có mã riêng, ngày đề xuất, nhóm màn hình, mức ưu tiên, giai đoạn và trạng thái, để tiện xem lại và theo dõi.

- **Cập nhật lần cuối:** 2026-11-06
- **Tài liệu liên quan:** [AGENTS.md](../AGENTS.md) mô tả ngữ cảnh, tính năng hiện có và quy trình database
- **Phạm vi:** toàn bộ webapp (React + Supabase), nhánh `main` tại commit `2890d3d`

---

## Mục lục

1. [Quy ước](#1-quy-ước)
2. [Bảng tổng hợp](#2-bảng-tổng-hợp)
3. [Lộ trình theo giai đoạn](#3-lộ-trình-theo-giai-đoạn)
4. [Nhật ký đề xuất theo ngày](#4-nhật-ký-đề-xuất-theo-ngày)
5. [Chi tiết theo nhóm tính năng / màn hình](#5-chi-tiết-theo-nhóm-tính-năng--màn-hình)
   - [A. Dashboard tổng quan](#a-dashboard-tổng-quan-màn-hình-mới)
   - [B. Nền tảng kỹ thuật](#b-nền-tảng-kỹ-thuật)
   - [C. Hoa hồng](#c-hoa-hồng)
   - [D. Bảo mật và phân quyền](#d-bảo-mật-và-phân-quyền)
   - [E. Chi tiết dự án](#e-chi-tiết-dự-án)
   - [F. Build và triển khai](#f-build-và-triển-khai)
6. [Mẫu thêm đề xuất mới](#6-mẫu-thêm-đề-xuất-mới)

---

## 1. Quy ước

**Mã đề xuất:** `DX-xxx`, đánh số tăng dần, không tái sử dụng mã đã hủy.

**Mức ưu tiên**

| Mức | Ý nghĩa |
|---|---|
| P0 | Cần làm ngay, ảnh hưởng bảo mật hoặc độ đúng của số liệu |
| P1 | Giá trị cao, nên làm trong giai đoạn gần nhất |
| P2 | Nên có, làm khi có thời gian |

**Trạng thái:** `Đề xuất` → `Đã duyệt` → `Đang làm` → `Hoàn thành`. Có thể chuyển sang `Hoãn` hoặc `Hủy`, kèm lý do.

**Giai đoạn**

| Giai đoạn | Mục tiêu | Mốc dự kiến |
|---|---|---|
| GĐ1 | Dashboard tổng quan bản đầu và chuẩn hóa logic tính toán | Chưa chốt |
| GĐ2 | Mở rộng dashboard, sửa bảo mật, thống nhất hoa hồng | Chưa chốt |
| GĐ3 | Biểu đồ, tối ưu build và dọn dẹp | Chưa chốt |

---

## 2. Bảng tổng hợp

| Mã | Tên đề xuất | Nhóm / Màn hình | Ưu tiên | Giai đoạn | Trạng thái | Ngày đề xuất |
|---|---|---|---|---|---|---|
| DX-001 | 4 chỉ số chính: tổng dự án, đúng tiến độ, chậm tiến độ, chậm công nợ | A. Dashboard | P1 | GĐ1 | Đề xuất | 2026-11-04 |
| DX-002 | Bố cục và điều hướng trang Tổng quan | A. Dashboard | P1 | GĐ1 | Đề xuất | 2026-11-04 |
| DX-003 | Danh sách "Cần xử lý" | A. Dashboard | P1 | GĐ1 | Đề xuất | 2026-11-04 |
| DX-004 | Nhóm chỉ số tài chính | A. Dashboard | P1 | GĐ1 | Đề xuất | 2026-11-04 |
| DX-005 | Nhóm chỉ số KPI và báo cáo | A. Dashboard | P1 | GĐ2 | Đề xuất | 2026-11-04 |
| DX-006 | Nhóm chỉ số hoa hồng | A. Dashboard | P2 | GĐ2 | Đề xuất | 2026-11-04 |
| DX-007 | Cảnh báo vận hành | A. Dashboard | P2 | GĐ2 | Đề xuất | 2026-11-04 |
| DX-008 | Bảng theo Leader | A. Dashboard | P2 | GĐ2 | Đề xuất | 2026-11-04 |
| DX-009 | Biểu đồ xu hướng | A. Dashboard | P2 | GĐ3 | Đề xuất | 2026-11-04 |
| DX-010 | Gom logic tính toán vào file dùng chung | B. Nền tảng | P0 | GĐ1 | Đề xuất | 2026-11-04 |
| DX-011 | Dọn code không dùng | B. Nền tảng | P2 | GĐ3 | Đề xuất | 2026-11-04 |
| DX-012 | Đưa cấu hình Supabase ra biến môi trường | B. Nền tảng | P2 | GĐ3 | Đề xuất | 2026-11-04 |
| DX-013 | Thống nhất hai cơ chế theo dõi hoa hồng | C. Hoa hồng | P1 | GĐ2 | Đề xuất | 2026-11-04 |
| DX-014 | Tính truy thu ở trang Hoa hồng theo cá nhân | C. Hoa hồng | P1 | GĐ2 | Đề xuất | 2026-11-04 |
| DX-015 | Siết RLS cho thao tác xóa dự án | D. Bảo mật | P0 | GĐ2 | Đề xuất | 2026-11-04 |
| DX-016 | Bỏ Service Role Key khỏi trình duyệt | D. Bảo mật | P0 | GĐ2 | Đề xuất | 2026-11-04 |
| DX-017 | Xóa tài khoản phải chặn được đăng nhập | D. Bảo mật | P0 | GĐ2 | Đề xuất | 2026-11-04 |
| DX-018 | Bỏ importmap và Tailwind CDN | F. Build | P2 | GĐ3 | Đề xuất | 2026-11-04 |
| DX-019 | Tắt tự đăng ký tài khoản công khai | D. Bảo mật | P0 | GĐ2 | Đề xuất | 2026-11-06 |
| DX-020 | Sửa và xóa dữ liệu đã nhập | E. Chi tiết dự án | P1 | GĐ2 | Đề xuất | 2026-11-06 |
| DX-021 | Tạo storage bucket bằng migration | F. Build | P2 | GĐ3 | Hoàn thành | 2026-11-06 |
| DX-022 | Tự động áp dụng migration khi merge vào main | F. Build | P2 | GĐ3 | Đang làm | 2026-11-06 |

---

## 3. Lộ trình theo giai đoạn

### GĐ1 — Dashboard tổng quan bản đầu

Mục tiêu: người dùng mở app là thấy ngay tình hình chung và biết dự án nào cần xử lý.

- DX-010 Gom logic tính toán vào file dùng chung. Làm trước vì mọi chỉ số dashboard đều dựa vào đây.
- DX-001 4 chỉ số chính
- DX-002 Bố cục và điều hướng
- DX-003 Danh sách "Cần xử lý"
- DX-004 Nhóm chỉ số tài chính

### GĐ2 — Mở rộng và sửa lỗi nghiệp vụ, bảo mật

- DX-019, DX-015, DX-016, DX-017 Bảo mật (P0, nên làm đầu giai đoạn)
- DX-020 Sửa và xóa dữ liệu đã nhập
- DX-013, DX-014 Thống nhất hoa hồng
- DX-005 KPI và báo cáo
- DX-006 Hoa hồng trên dashboard (làm sau DX-013)
- DX-007 Cảnh báo vận hành
- DX-008 Bảng theo Leader

### GĐ3 — Hoàn thiện

- DX-009 Biểu đồ
- DX-011 Dọn code
- DX-012 Biến môi trường
- DX-021 Storage bucket (hoàn thành)
- DX-022 Tự động áp dụng migration (đang làm, chờ cấu hình secret)
- DX-018 Build

---

## 4. Nhật ký đề xuất theo ngày

### 2026-11-04

- Đọc toàn bộ source để nắm logic và tính năng. Ghi nhận các vấn đề kỹ thuật, bảo mật và nghiệp vụ, tạo thành DX-010 đến DX-018.
- Người dùng yêu cầu dashboard tổng với 4 chỉ số: tổng dự án, đúng tiến độ, chậm tiến độ, chậm công nợ. Đề xuất định nghĩa cụ thể và các chỉ số bổ sung, tạo thành DX-001 đến DX-009.

### 2026-11-06

- Tạo file này để lưu trữ và theo dõi các đề xuất.
- Rà lại toàn bộ tính năng để viết tài liệu ngữ cảnh dự án. Phát hiện thêm 3 vấn đề, tạo thành DX-019 đến DX-021. Bổ sung ghi chú vào DX-014.
- Chuyển file ngữ cảnh thành `AGENTS.md` ở thư mục gốc, dùng chung cho mọi AI agent. `CLAUDE.md` chỉ import file này.
- Chuyển database sang Supabase CLI và `supabase/migrations/`. Master script cũ thành migration baseline. Trang `/setup` ghép SQL tự động từ các migration. Hoàn thành DX-021, thêm DX-022.
- Xác nhận repo ở GitHub (public) và deploy trên Vercel. Thêm workflow GitHub Actions cho DX-022, chờ cấu hình secret. Kiểm tra cấu hình Auth production: đang mở đăng ký, nên nâng mức khẩn cấp của DX-019.
- Chuyển quyền Owner tổ chức Supabase sang tài khoản email công ty, bỏ tài khoản cá nhân khỏi tổ chức. Project ref, URL và API key không đổi.

---

## 5. Chi tiết theo nhóm tính năng / màn hình

### A. Dashboard tổng quan (màn hình mới)

Hiện tại route `/` mở thẳng danh sách dự án. Chưa có màn hình nào cho cái nhìn tổng thể. Mọi chỉ số dưới đây đều tính được từ mảng `projects` mà `App.tsx` đã tải sẵn, chỉ phần hoa hồng đã chốt và yêu cầu xóa cần query thêm.

#### DX-001 — 4 chỉ số chính

**Ưu tiên:** P1 · **Giai đoạn:** GĐ1 · **Trạng thái:** Đề xuất

Model hiện tại không có cột "tiến độ", nên cần chốt định nghĩa.

| Chỉ số | Định nghĩa đề xuất |
|---|---|
| Tổng số dự án | Toàn bộ dự án, kèm tách "đang chạy" (`endDate` từ hôm nay trở đi) và "đã kết thúc". Ba chỉ số còn lại chỉ tính trên dự án đang chạy. |
| Đúng tiến độ | Số tháng hợp đồng đạt KPI lớn hơn hoặc bằng tháng kỳ vọng trừ 1. |
| Chậm tiến độ | Dự án đang chạy không thỏa điều kiện đúng tiến độ. Hiển thị thêm số tháng chậm. |
| Chậm công nợ | Có ít nhất một tháng đã đến hạn mà chưa thanh toán. Hiển thị kèm tổng tiền quá hạn. |

Các khái niệm dùng chung:

- **Tháng kỳ vọng** bằng số tháng từ `startDate` đến hôm nay cộng 1, tối đa bằng `durationMonths`.
- **Tháng hợp đồng đạt KPI** khi KPI entry mới nhất (theo `actualMonth`) của tháng đó từ 75% trở lên. Đây là quy tắc đang dùng ở ProjectCard và ProjectDetail.
- **Trừ 1** để chừa tháng hiện tại, vì KPI thường được nhập sau khi kết thúc tháng.
- **Ngày đến hạn của tháng m** bằng `startDate` cộng m tháng. Đây là quy tắc của bộ lọc "Đang nợ phí" ở `components/Dashboard.tsx`.
- **Tiền quá hạn**: với dự án theo tháng là số tháng quá hạn nhân doanh thu tháng. Với dự án theo đợt là tổng giá trị các đợt chưa thanh toán có chứa tháng quá hạn.

Lưu ý hiển thị: một dự án có thể vừa chậm tiến độ vừa chậm công nợ, nên các card không cộng dồn. Ghi rõ dòng phụ "trên X dự án đang chạy".

**Câu hỏi mở**

- Ngưỡng "trừ 1 tháng" có phù hợp với thực tế nhập KPI của team không, hay cần trừ nhiều hơn?
- Dự án theo đợt có đợt chưa gán tháng nào thì tính quá hạn ra sao? Hiện logic cũ bỏ qua các đợt này.
- Có cần thời gian ân hạn thanh toán (ví dụ 7 hoặc 15 ngày sau ngày đến hạn) không?

#### DX-002 — Bố cục và điều hướng trang Tổng quan

**Ưu tiên:** P1 · **Giai đoạn:** GĐ1 · **Trạng thái:** Đề xuất

- Route `/` thành trang Tổng quan. Danh sách dự án chuyển sang `/projects`. Thêm mục "Tổng quan" đầu sidebar và thanh điều hướng mobile.
- Cập nhật logic `NavLink` đang coi `/` là active cho cả `/project/...`.

Bố cục đề xuất:

```
Hàng 1 — 4 card chính:
  Tổng dự án | Đúng tiến độ | Chậm tiến độ | Chậm công nợ

Hàng 2 — Tài chính (ẩn với staff):
  Còn phải thu | Quá hạn (VNĐ) | Thu tháng này | Hoa hồng dự kiến

Hàng 3 — 2 cột:
  Trái:  Danh sách "Cần xử lý" (DX-003)
  Phải:  Bảng theo Leader (DX-008)

Hàng 4 — Biểu đồ (DX-009)
```

Nguyên tắc:

- Mọi card đều click được và mở danh sách dự án với bộ lọc tương ứng, truyền qua query string (ví dụ `/projects?status=late`).
- Ẩn theo role: staff không thấy hàng tài chính và hoa hồng, giống cách sidebar đang ẩn menu admin.
- Trên mobile, card xếp 2 cột, các khối khác xếp dọc.

#### DX-003 — Danh sách "Cần xử lý"

**Ưu tiên:** P1 · **Giai đoạn:** GĐ1 · **Trạng thái:** Đề xuất

Danh sách dự án có vấn đề, mỗi dòng ghi rõ lý do và dẫn vào trang chi tiết dự án. Lý do có thể gồm:

- Chậm N tháng tiến độ
- Nợ X VNĐ, quá hạn N ngày
- Chưa nhập KPI tháng trước
- Sắp hết hạn trong N ngày

Sắp xếp theo mức nghiêm trọng: nợ quá hạn lâu nhất và chậm nhiều tháng nhất lên đầu. Giới hạn khoảng 10 dòng, có link "Xem tất cả".

#### DX-004 — Nhóm chỉ số tài chính

**Ưu tiên:** P1 · **Giai đoạn:** GĐ1 · **Trạng thái:** Đề xuất · **Hiển thị cho:** manager trở lên

| Chỉ số | Cách tính |
|---|---|
| Tổng giá trị hợp đồng đang chạy | Tổng `totalBudget` của dự án đang chạy |
| Đã thu | Tháng đã thanh toán nhân doanh thu tháng, hoặc tổng giá trị đợt đã thanh toán |
| Còn phải thu | Tổng giá trị trừ đã thu |
| Quá hạn (VNĐ) | Theo định nghĩa tiền quá hạn ở DX-001 |
| Thu trong tháng này | Tổng tiền các tháng hoặc đợt có `paymentDate` thuộc tháng hiện tại. Cột này mới thêm và chưa được khai thác ở đâu. |
| Doanh thu dự kiến tháng này | Tổng doanh thu tháng của các dự án đang chạy |

#### DX-005 — Nhóm chỉ số KPI và báo cáo

**Ưu tiên:** P1 · **Giai đoạn:** GĐ2 · **Trạng thái:** Đề xuất · **Hiển thị cho:** mọi role

- KPI trung bình tháng gần nhất trên toàn bộ dự án, kèm tỷ lệ dự án đạt và chưa đạt.
- Số dự án chưa nhập KPI cho tháng trước. Đây là lỗ hổng dữ liệu, nếu không bắt sớm thì chỉ số tiến độ ở DX-001 sẽ sai.
- Số báo cáo tháng trước chưa gửi.
- Số báo cáo đã gửi nhưng chưa có ảnh khách hàng xác nhận.

Hai chỉ số báo cáo ảnh hưởng trực tiếp đến điều kiện hưởng hoa hồng.

#### DX-006 — Nhóm chỉ số hoa hồng

**Ưu tiên:** P2 · **Giai đoạn:** GĐ2 · **Trạng thái:** Đề xuất · **Hiển thị cho:** manager trở lên · **Phụ thuộc:** DX-013

- Hoa hồng dự kiến tháng này, dùng đúng logic của trang Hoa hồng theo dự án.
- Trạng thái chốt sổ tháng trước. Nếu chưa chốt, hiện nút dẫn sang trang chốt sổ.
- Số KPI entry đủ điều kiện nhưng chưa đánh dấu trả hoa hồng.

#### DX-007 — Cảnh báo vận hành

**Ưu tiên:** P2 · **Giai đoạn:** GĐ2 · **Trạng thái:** Đề xuất

- Dự án sắp kết thúc trong 30 và 60 ngày, dùng làm danh sách theo dõi gia hạn hợp đồng.
- Dự án chưa có nhân sự phân công.
- Dự án theo đợt chưa thiết lập đợt, hoặc tổng % các đợt chưa đủ 100%, hoặc còn tháng chưa gán vào đợt.
- Yêu cầu xóa dự án đang chờ duyệt (manager). Phần này hiện nằm đầu trang Danh sách dự án, nên dời lên dashboard.

#### DX-008 — Bảng theo Leader

**Ưu tiên:** P2 · **Giai đoạn:** GĐ2 · **Trạng thái:** Đề xuất

Mỗi dòng là một Leader (nhân sự có chức vụ chứa chữ "leader", giống bộ lọc hiện có), gồm số dự án phụ trách, số chậm tiến độ, số chậm công nợ và KPI trung bình. Giúp quản lý thấy ai đang quá tải hoặc cần hỗ trợ.

**Câu hỏi mở:** cách nhận diện Leader qua tên chức vụ khá mong manh. Có nên thêm cờ "là Leader" vào bảng `chuc_vu` hoặc vai trò "Leader dự án" vào bảng phân công không?

#### DX-009 — Biểu đồ xu hướng

**Ưu tiên:** P2 · **Giai đoạn:** GĐ3 · **Trạng thái:** Đề xuất

- Tiền thu theo tháng trong 6 tháng gần nhất, dựa trên `paymentDate`.
- Tỷ lệ dự án đạt KPI theo tháng, để thấy xu hướng chất lượng.

Chỉ nên làm sau khi các card ổn định và số liệu đã được đối chiếu.

---

### B. Nền tảng kỹ thuật

#### DX-010 — Gom logic tính toán vào file dùng chung

**Ưu tiên:** P0 · **Giai đoạn:** GĐ1 · **Trạng thái:** Đề xuất

**Vấn đề:** các quy tắc "tháng đạt KPI", "tháng đã thanh toán", "nợ phí", "doanh thu tháng" đang được viết lặp lại ở ProjectCard, ProjectDetail, Dashboard, KpiTab, CommissionReportPage và CommissionPayrollPage. Dashboard mới sẽ là nơi thứ bảy nếu không tách ra, và các định nghĩa dễ lệch nhau.

**Đề xuất:** tạo `lib/projectMetrics.ts` với các hàm thuần, không phụ thuộc React:

- `getMonthlyRevenue(project)`
- `getLatestKpiByContractMonth(project)`
- `getAchievedKpiMonths(project)`
- `isContractMonthPaid(project, month)`
- `getExpectedContractMonth(project, today)`
- `getScheduleStatus(project, today)`
- `getOverdueMonths(project, today)` và `getOverdueAmount(project, today)`
- `getPaidAmount(project)`
- `isCommissionEligible(project, kpiEntry)`

Sau đó cho các màn hình hiện có dùng lại các hàm này.

**Tiêu chí hoàn thành:** không còn chỗ nào tự tính các quy tắc trên. Số liệu ở ProjectCard, ProjectDetail và dashboard khớp nhau.

#### DX-011 — Dọn code không dùng

**Ưu tiên:** P2 · **Giai đoạn:** GĐ3 · **Trạng thái:** Đề xuất

- `components/Header.tsx` không được import ở đâu.
- `components/project-detail/PerformanceTab.tsx` (nhúng Looker Studio) không nằm trong danh sách tab, và hàm cập nhật URL không tồn tại trong App. Cần quyết định bật lại hoặc xóa.
- `SetupGuide.tsx` ở thư mục gốc là bản cũ trùng với `components/SetupGuide.tsx`.
- README và `GEMINI_API_KEY` trong `vite.config.ts` là boilerplate từ AI Studio, không liên quan app.

#### DX-012 — Đưa cấu hình Supabase ra biến môi trường

**Ưu tiên:** P2 · **Giai đoạn:** GĐ3 · **Trạng thái:** Đề xuất

URL và anon key đang hardcode trong `lib/supabaseClient.ts`. Chuyển sang `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trong `.env.local` để tách môi trường dev và production. Anon key vốn công khai, nên đây là việc tổ chức cấu hình, không phải vá lỗ hổng.

---

### C. Hoa hồng

#### DX-013 — Thống nhất hai cơ chế theo dõi hoa hồng

**Ưu tiên:** P1 · **Giai đoạn:** GĐ2 · **Trạng thái:** Đề xuất

**Vấn đề:** đang có hai cơ chế không liên quan nhau.

- Cột `commission_status` trên từng KPI entry, đổi qua nút "Đánh dấu đã trả HH" ở tab Quản lý hoa hồng. Chỉ xét KPI từ 75%, không xét báo cáo và thanh toán.
- Bảng `commission_payouts` ghi khi chốt sổ, xét đủ 3 điều kiện.

Hai nguồn có thể lệch nhau khi đối chiếu.

**Đề xuất:** chọn `commission_payouts` làm nguồn chính. Tab Quản lý hoa hồng trong dự án hiển thị trạng thái từ snapshot (đã chốt ở tháng nào, số tiền cho từng người). Cột `commission_status` chỉ giữ để tương thích hoặc bỏ dần.

**Câu hỏi mở:** kế toán hiện đang dùng nút "Đánh dấu đã trả HH" cho mục đích gì? Cần hỏi trước khi bỏ.

#### DX-014 — Tính truy thu ở trang Hoa hồng theo cá nhân

**Ưu tiên:** P1 · **Giai đoạn:** GĐ2 · **Trạng thái:** Đề xuất

**Vấn đề:** trước khi chốt sổ, trang Hoa hồng theo dự án có tính truy thu (KPI tháng cũ được thanh toán trong tháng đang chọn), còn trang Hoa hồng theo cá nhân thì không. Tổng hai trang có thể khác nhau cho cùng một tháng.

Ngoài ra, trang Hoa hồng theo dự án tra tỷ lệ hoa hồng theo **tên** chức vụ, còn trang Hoa hồng theo cá nhân tra theo **id** chức vụ. Hai cách tra cho cùng kết quả vì tên chức vụ là unique, nhưng nên thống nhất dùng id.

**Đề xuất:** dùng chung một hàm tính hoa hồng dự kiến (thuộc DX-010) cho cả hai trang, tra tỷ lệ theo id chức vụ.

**Tiêu chí hoàn thành:** với cùng một tháng chưa chốt, tổng hoa hồng hai trang bằng nhau.

---

### D. Bảo mật và phân quyền

#### DX-015 — Siết RLS cho thao tác xóa dự án

**Ưu tiên:** P0 · **Giai đoạn:** GĐ2 · **Trạng thái:** Đề xuất

**Vấn đề:** policy hiện tại cho mọi user đã đăng nhập toàn quyền trên `projects` và các bảng con. Quy trình "hai manager duyệt xóa" chỉ được ép ở giao diện, bất kỳ ai cũng có thể gọi API xóa trực tiếp.

**Đề xuất:**

- Tách policy theo thao tác. `DELETE` trên `projects` chỉ cho manager trở lên.
- Tốt hơn nữa, chuyển việc duyệt xóa thành một database function kiểm tra có yêu cầu xóa và người duyệt khác người yêu cầu.
- Cân nhắc tương tự cho các thao tác nhạy cảm khác như sửa trạng thái thanh toán.

#### DX-016 — Bỏ Service Role Key khỏi trình duyệt

**Ưu tiên:** P0 · **Giai đoạn:** GĐ2 · **Trạng thái:** Đề xuất

**Vấn đề:** chức năng đổi mật khẩu người khác yêu cầu dán Service Role Key vào form và lưu vào `sessionStorage`. Khóa này bỏ qua toàn bộ RLS, lộ ra là mất quyền kiểm soát toàn bộ database.

**Đề xuất:** tạo Supabase Edge Function `admin-update-user` giữ service key ở phía server. Function kiểm tra người gọi có role admin trở lên rồi mới đổi mật khẩu. Sau khi làm xong, nên đổi (rotate) service key nếu đã từng được dán vào trình duyệt.

#### DX-019 — Tắt tự đăng ký tài khoản công khai

**Ưu tiên:** P0 · **Giai đoạn:** GĐ2 · **Trạng thái:** Đề xuất

**Cập nhật 2026-11-06:** đã kiểm tra cấu hình Auth production. Tự đăng ký đang mở, có yêu cầu xác nhận email. Repo GitHub ở chế độ public và địa chỉ app công khai, nên rủi ro này nên xử lý sớm nhất trong các đề xuất.

**Vấn đề:** trang đăng nhập có nút "Đăng ký ngay". Bất kỳ ai có link app đều tự tạo được tài khoản, nhận role `staff`, và theo RLS hiện tại có toàn quyền đọc ghi dữ liệu dự án, kể cả thông tin khách hàng và số tiền hợp đồng.

**Đề xuất:**

- Bỏ phần đăng ký khỏi trang đăng nhập. Tài khoản chỉ do admin tạo ở trang Tài khoản hệ thống.
- Tắt "Allow new users to sign up" trong Supabase Auth. Lưu ý việc này cũng chặn cách tạo tài khoản hiện tại của admin (dùng `signUp`), nên cần làm cùng Edge Function ở DX-016.
- Nếu vẫn muốn giữ đăng ký, thêm role `pending` mặc định và cho RLS từ chối role này cho tới khi admin duyệt.

#### DX-017 — Xóa tài khoản phải chặn được đăng nhập

**Ưu tiên:** P0 · **Giai đoạn:** GĐ2 · **Trạng thái:** Đề xuất

**Vấn đề:** nút xóa tài khoản chỉ xóa dòng trong `profiles`, không xóa `auth.users`. User đó vẫn đăng nhập được và vẫn đọc ghi được dữ liệu dự án.

**Đề xuất:** dùng chung Edge Function với DX-016 để gọi `auth.admin.deleteUser`, hoặc thêm trạng thái `disabled` vào profile và cho mọi policy kiểm tra trạng thái này.

---

### E. Chi tiết dự án

#### DX-020 — Sửa và xóa dữ liệu đã nhập

**Ưu tiên:** P1 · **Giai đoạn:** GĐ2 · **Trạng thái:** Đề xuất

**Vấn đề:** nhiều dữ liệu nhập sai không có cách sửa trên giao diện, phải vào Supabase sửa tay.

- KPI entry: không sửa hay xóa được % KPI, tháng, ghi chú.
- Thanh toán: không hoàn tác được trạng thái "đã thanh toán", không sửa ngày thanh toán, không thay ảnh chứng từ.
- Đợt thanh toán: không sửa tên, %, tháng đã gán, không xóa được đợt.
- Báo cáo: không bỏ đánh dấu "đã gửi", không thay ảnh xác nhận.
- Dự án: chỉ sửa được tên. Khách hàng, ngân sách, ngày bắt đầu, số tháng, hình thức thanh toán đều cố định.

**Đề xuất:**

- Thêm sửa và xóa cho các mục trên, giới hạn cho manager trở lên.
- Chặn sửa dữ liệu ảnh hưởng tới hoa hồng của tháng đã chốt sổ, hoặc ít nhất hiện cảnh báo.
- Đổi số tháng của dự án cần thêm hoặc bớt dòng `monthly_breakdown` tương ứng.
- Cân nhắc lưu lịch sử thay đổi (ai sửa, sửa gì, lúc nào) cho các trường tài chính.

**Câu hỏi mở:** những ai được phép sửa dữ liệu thanh toán? Kế toán có tài khoản riêng với role riêng không?

---

### F. Build và triển khai

#### DX-018 — Bỏ importmap và Tailwind CDN

**Ưu tiên:** P2 · **Giai đoạn:** GĐ3 · **Trạng thái:** Đề xuất

**Vấn đề:** `index.html` vừa khai báo importmap trỏ tới esm.sh vừa chạy qua bundle của Vite. Tailwind được nạp qua CDN, vốn không khuyến nghị cho production.

**Đề xuất:** xóa importmap, cài Tailwind qua npm với PostCSS, chuyển cấu hình màu sang `tailwind.config`.

#### DX-021 — Tạo storage bucket bằng migration

**Ưu tiên:** P2 · **Giai đoạn:** GĐ3 · **Trạng thái:** Hoàn thành (2026-11-06)

**Vấn đề:** app cần hai bucket public `payment_proofs` và `confirmation_proofs`, nhưng master script không tạo. Cài đặt mới sẽ lỗi upload cho tới khi có người tạo tay.

**Đã làm:** migration `supabase/migrations/20261106000100_storage_buckets.sql` tạo hai bucket với `ON CONFLICT DO NOTHING` và thêm policy cho user đã đăng nhập được upload.

**Còn lại:** cân nhắc chuyển sang bucket private với signed URL, vì ảnh chứng từ chuyển khoản là dữ liệu nhạy cảm. Nên tách thành đề xuất riêng khi làm.

#### DX-022 — Tự động áp dụng migration khi merge vào main

**Ưu tiên:** P2 · **Giai đoạn:** GĐ3 · **Trạng thái:** Đang làm

**Vấn đề:** hiện tại dev phải tự chạy `npm run db:push` sau khi merge code có migration mới. Nếu quên, code mới chạy trên database cũ và lỗi.

**Đề xuất:** thêm GitHub Actions workflow chạy `supabase db push` khi có push vào `main` mà thay đổi thư mục `supabase/migrations/`. Workflow cần hai secret là `SUPABASE_ACCESS_TOKEN` và `SUPABASE_DB_PASSWORD`. Phương án khác là dùng tích hợp GitHub của Supabase (Branching), nhưng cần kiểm tra gói dịch vụ đang dùng có hỗ trợ không.

**Đã làm:** thêm `.github/workflows/supabase-migrations.yml`. Workflow chạy khi push lên `main` có thay đổi trong `supabase/migrations/`, hoặc chạy tay từ tab Actions.

**Còn lại để hoàn thành:**

- Thêm hai repository secret trên GitHub là `SUPABASE_ACCESS_TOKEN` và `SUPABASE_DB_PASSWORD`.
- Đánh dấu migration baseline là đã áp dụng trên production trước lần chạy đầu tiên.
- Chạy thử thành công một lần.

**Ràng buộc:** Vercel deploy code và workflow chạy migration song song, nên migration phải tương thích ngược (quy tắc ghi trong AGENTS.md mục 2.1).

**Câu hỏi mở:**

- Có cần một project Supabase riêng cho môi trường thử nghiệm trước khi áp dụng lên production không?

---

## 6. Mẫu thêm đề xuất mới

Khi có đề xuất mới:

1. Thêm một dòng vào [Bảng tổng hợp](#2-bảng-tổng-hợp) với mã tiếp theo.
2. Thêm mã vào giai đoạn phù hợp ở [Lộ trình](#3-lộ-trình-theo-giai-đoạn).
3. Ghi một dòng vào [Nhật ký](#4-nhật-ký-đề-xuất-theo-ngày) dưới ngày hôm đó.
4. Thêm phần chi tiết vào đúng nhóm theo mẫu dưới đây.

```markdown
#### DX-xxx — Tên đề xuất

**Ưu tiên:** P0/P1/P2 · **Giai đoạn:** GĐx · **Trạng thái:** Đề xuất · **Hiển thị cho:** (nếu có)

**Vấn đề:** hiện trạng và lý do cần thay đổi.

**Đề xuất:** giải pháp cụ thể.

**Tiêu chí hoàn thành:** làm sao biết là xong.

**Câu hỏi mở:** những điểm cần chốt trước khi làm.
```

Khi đổi trạng thái, cập nhật cả bảng tổng hợp và dòng trạng thái trong phần chi tiết. Ghi thêm một dòng vào nhật ký nếu là thay đổi quan trọng như duyệt, hủy hay hoàn thành.
