# Sơ đồ Luồng điều hướng (Navigation Flow) - V/J Sync

[cite_start]Tài liệu này mô tả cấu trúc chuyển đổi màn hình trong ứng dụng V/J Sync, được thiết kế theo cơ chế Phân quyền (Role-based Access Control)[cite: 963].

## 1. Luồng Xác thực (Authentication Flow)
[cite_start]Luồng này áp dụng chung trước khi người dùng vào hệ thống[cite: 1047, 1048].
* [cite_start]**Trang đăng ký (新規登録画面)** -> Điều hướng sang: **Màn hình Đăng nhập** [cite: 1047, 1048]
* [cite_start]**Màn hình Đăng nhập (ログイン画面)** -> Đăng nhập thành công -> Điều hướng sang: **Trang chủ** tương ứng với từng Role[cite: 1048, 1050].

---

## 2. Luồng Điều hướng theo Vai trò (Role-based Flow)

### 🟢 Role 1: Giám đốc (社長 / Giám đốc)
[cite_start]Đóng vai trò quản trị viên cấp cao[cite: 964, 965]. [cite_start]Từ màn hình **Trang chủ (トップページ)**[cite: 968], Giám đốc có thể điều hướng đến các màn hình:
* [cite_start]├── **Giao diện chat (チャット画面)** [cite: 967]
* [cite_start]├── **Màn hình cài đặt (設定画面)** [cite: 970]
* [cite_start]├── **Màn hình chọn Workspace (ワークスペース選択画面)** [cite: 972]
* [cite_start]│   └── -> **Màn hình quản lý Workspace và người dùng (ワークスペース・ユーザー管理画面)** [cite: 983]
* [cite_start]├── **Màn hình danh sách và lịch sử nhắc nhở (リマインド一覧・履歴画面)** [cite: 973, 974]
* [cite_start]│   ├── -> **Màn hình tạo nhắc nhở (リマインド作成画面)** [cite: 986]
* [cite_start]│   └── -> **Màn hình chi tiết nhắc nhở (リマインド詳細画面)** [cite: 989]
* [cite_start]└── **Màn hình danh sách và lịch sử công việc (タスク一覧・履歴画面)** [cite: 978, 979]
* [cite_start]├── -> **Màn hình tạo công việc (タスク作成画面)** [cite: 990]
* [cite_start]└── -> **Màn hình chi tiết công việc (タスク詳細画面)** [cite: 1005]

### 🔵 Role 2: Quản lý (管理者 / Quản lý)
[cite_start]Từ màn hình **Trang chủ (トップページ)**[cite: 988], Quản lý có thể điều hướng đến:
* [cite_start]├── **Giao diện chat (チャット画面)** [cite: 985]
* [cite_start]├── **Màn hình cài đặt (設定画面)** [cite: 992]
* [cite_start]├── **Màn hình chọn Workspace (ワークスペース選択画面)** [cite: 994]
* [cite_start]├── **Màn hình danh sách và lịch sử nhắc nhở (リマインド一覧・履歴画面)** [cite: 996, 997]
* [cite_start]│   ├── -> **Màn hình tạo nhắc nhở (リマインド作成画面)** [cite: 1008]
* [cite_start]│   └── -> **Màn hình chi tiết nhắc nhở (リマインド詳細画面)** [cite: 1009]
* [cite_start]└── **Màn hình danh sách và lịch sử công việc (タスク一覧・履歴画面)** [cite: 1001, 1002]
* [cite_start]├── -> **Màn hình tạo công việc (タスク作成画面)** [cite: 1010]
* [cite_start]└── -> **Màn hình chi tiết công việc (タスク詳細画面)** [cite: 1011]

### 🟡 Role 3: Nhân viên (従業員 / Nhân viên)
[cite_start]Từ màn hình **Trang chủ (トップページ)**[cite: 1015], Nhân viên có thể điều hướng đến:
* [cite_start]├── **Giao diện chat (チャット画面)** [cite: 1014]
* [cite_start]├── **Màn hình cài đặt (設定画面)** [cite: 1017]
* [cite_start]├── **Màn hình chọn Workspace (ワークスペース選択画面)** [cite: 1019]
* [cite_start]├── **Màn hình danh sách và lịch sử nhắc nhở (リマインド一覧・履歴画面)** [cite: 1021, 1022]
* [cite_start]│   ├── -> **Màn hình tạo nhắc nhở (リマインド作成画面)** [cite: 1030]
* [cite_start]│   └── -> **Màn hình chi tiết nhắc nhở (リマインド詳細画面)** [cite: 1032]
* [cite_start]└── **Màn hình danh sách và lịch sử công việc (タスク一覧・履歴画面)** [cite: 1026, 1027]
* [cite_start]└── -> **Màn hình chi tiết công việc (タスク詳細画面)** [cite: 1034] *(Lưu ý: Dựa theo sơ đồ PDF, Role 3 đi thẳng từ danh sách vào chi tiết, không có nhánh tạo mới công việc).*

### ⚪ Role 4: Khách (ゲスト / Khách)
[cite_start]Từ màn hình **Trang chủ (トップページ)**[cite: 1036]:
* [cite_start]Khách chủ yếu được cấp quyền xem **Trang chủ** sau khi Đăng nhập[cite: 1037]. Các tính năng chi tiết sẽ bị giới hạn hoặc hiển thị dưới dạng Read-only tùy theo thiết lập Workspace.