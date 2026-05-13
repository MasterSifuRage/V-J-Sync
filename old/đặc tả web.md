# Tài liệu Đặc tả Hệ thống: V/J Sync (Được trích xuất cho Cursor AI Context)

## 1. Giới thiệu chung (Project Overview)
[cite_start]**Tên ứng dụng:** V/J Sync [cite: 954]
[cite_start]**Bối cảnh:** Giải quyết các vấn đề hiểu lầm và xung đột trong giao tiếp do rào cản ngôn ngữ và văn hóa giữa người Nhật làm việc tại Hà Nội và người Việt Nam biết tiếng Nhật đang làm việc tại Hà Nội, gây ảnh hưởng đến hiệu quả công việc. [cite: 938, 939, 940, 941, 942, 943, 947, 948, 949, 950]
[cite_start]**Giải pháp:** Xây dựng một nền tảng giao tiếp công sở chuyên dụng (Workspace-based) tích hợp trí tuệ nhân tạo (LLM) để dịch tự động, hỗ trợ ngữ cảnh, quản lý công việc và đảm bảo tính bảo mật. [cite: 952]

## 2. Định nghĩa Người dùng & Phân quyền (Roles & Permissions)
[cite_start]Hệ thống sử dụng cơ chế Role-based Access Control (RBAC) với 4 vai trò chính: [cite: 956, 957]

* [cite_start]**Role ID 1 - Giám đốc (社長 / Lãnh đạo cấp cao):** [cite: 956]
    * [cite_start]Có quyền cao nhất trong hệ thống. [cite: 956]
    * [cite_start]Giám sát toàn diện hệ thống, quản trị tài khoản người dùng và phân quyền. [cite: 956]
    * [cite_start]Có quyền tạo và quản lý Workspaces, thiết lập bảo mật dữ liệu. [cite: 958]
* [cite_start]**Role ID 2 - Quản lý (管理者):** [cite: 956]
    * [cite_start]Thực hiện ban hành chỉ thị công việc, quản lý tác vụ và giao tiếp. [cite: 956]
* [cite_start]**Role ID 3 - Nhân viên (従業員):** [cite: 956]
    * [cite_start]Nhận chỉ thị, thực hiện công việc và giao tiếp. [cite: 956]
* [cite_start]**Role ID 4 - Khách (ゲスト / Đối tác ngoài):** [cite: 957]
    * [cite_start]Chỉ tham gia trao đổi thông tin trong một phạm vi giới hạn được cấp quyền. [cite: 957]

[cite_start]*(Lưu ý cho Cursor AI: Tất cả các vai trò này đều có thể là người Nhật hoặc người Việt, hệ thống không phân biệt cứng role theo quốc tịch).* [cite: 956, 957]

## 3. Kiến trúc Core (Core Architecture)
* [cite_start]**Hệ thống Workspace độc lập:** [cite: 952]
    * Mô hình đóng (Private Workspace). [cite_start]Mỗi công ty/tổ chức tạo một môi trường làm việc kín đáo. [cite: 952]
    * Người dùng có thể thuộc nhiều Workspace. [cite_start]Giao diện (UI) phải có dấu hiệu nhận diện rõ ràng người dùng đang ở Workspace nào. [cite: 952]
* [cite_start]**Giao tiếp đa kênh (Channel-based Communication):** [cite: 952]
    * Tương tự Slack. [cite_start]Mọi giao tiếp diễn ra qua các Kênh (Channels) và Tin nhắn trực tiếp (Direct Messages - DMs). [cite: 952]
* [cite_start]**Tích hợp AI sâu (Deep AI Integration):** [cite: 952]
    * **Dịch thuật thông minh:** Tích hợp LLM vào dịch tự động. [cite_start]AI phải hiểu được ngữ cảnh văn hóa, ngữ cảnh kinh doanh, thuật ngữ chuyên ngành của từng công ty, và chức danh (vai vế) của người gửi/người nhận để dịch cho chuẩn xác (VD: dịch sang thể lịch sự/kính ngữ nếu cấp dưới nói với cấp trên). [cite: 952]

## 4. Danh sách Tính năng Chính (Features)
* [cite_start]**[F1] AI Dịch và Gợi ý:** Gợi ý cách diễn đạt văn viết/báo cáo đảm bảo lịch sự, chuyên nghiệp, hợp vai trò người dùng (Dành cho Role 1,2,3). [cite: 958]
* [cite_start]**[F2] AI Giải mã ý định:** Phân tích nội dung để giải mã "ý định thực sự" đằng sau câu từ giao tiếp của đối phương. [cite: 958]
* **[F3] Quản lý Công việc (Task Management):** Tạo task, giao task cho người khác, hoặc xin tham gia task. [cite_start]Hỗ trợ gắn tags (nhãn) để phân loại (Role 1,2,3). [cite: 958]
* **[F4] Quản lý Nhắc nhở (Reminder):** Tạo nhắc nhở cá nhân hoặc gửi nhắc nhở cho người khác vào một mốc thời gian cụ thể. [cite_start]Hỗ trợ gắn tags (Role 1,2,3). [cite: 958]
* [cite_start]**[F5] Hệ thống Chat:** Tương tác trực tiếp giữa Quản lý và Nhân viên trên hệ thống (Role 1,2,3). [cite: 958]
* [cite_start]**[F6] Tự động Tóm tắt (Auto Summarize):** AI tự động tóm tắt nội dung các đoạn chat dài, tóm tắt các task và reminder (Role 1,2,3). [cite: 958]
* [cite_start]**[F7] Lưu trữ & Tìm kiếm:** Lưu trữ bảo mật và hỗ trợ truy vấn/tìm kiếm nhanh (Global Search) toàn bộ nội dung text, ảnh, audio, file, link, task, reminder (Role 1,2,3). [cite: 958]
* [cite_start]**[F10 & F12] Quản trị Hệ thống & Workspace:** Dành riêng cho Giám đốc (Role 1) để tạo Workspace, thêm/xóa thành viên, phân quyền và cài đặt bảo mật. [cite: 958]

## 5. Cấu trúc Màn hình (Screen Flow)
* [cite_start]**Màn hình Public:** Màn hình Đăng nhập [cite: 961][cite_start], Màn hình Đăng ký tài khoản (Dành cho user mới tham gia) [cite: 961][cite_start], Trang chủ (Cổng dịch vụ, giới thiệu, chuyển ngôn ngữ). [cite: 961]
* **Luồng Workspace:**
    * [cite_start]Màn hình chọn Workspace (Truy cập vào Workspace được chỉ định). [cite: 962]
    * [cite_start]Màn hình Quản lý Workspace / Thiết lập Workspace & Quản lý người dùng (Chỉ Role 1: Điều chỉnh phân quyền, bảo mật). [cite: 962]
* **Luồng Giao tiếp (Chat):**
    * [cite_start]Giao diện Chat (Tối giản để thao tác nhanh, tích hợp AI dịch theo ngữ cảnh và AI gợi ý nhắn tin chuyên nghiệp). [cite: 962]
* [cite_start]**Luồng Công việc & Nhắc nhở:** [cite: 962]
    * [cite_start]Màn hình Tạo công việc / Tạo nhắc nhở (Quản lý nhập chỉ thị, chọn ngữ cảnh, AI đề xuất checklist). [cite: 962]
    * [cite_start]Màn hình Danh sách & Lịch sử Công việc/Nhắc nhở (Hỗ trợ truy vấn và filter). [cite: 962]
    * [cite_start]Màn hình Chi tiết Công việc/Nhắc nhở (Cập nhật trạng thái, xem AI chú thích giải thích ý định cho Nhân viên). [cite: 962]
* [cite_start]**Thiết lập cá nhân:** Màn hình Cài đặt (Thông tin cá nhân, cài đặt hệ thống). [cite: 962]