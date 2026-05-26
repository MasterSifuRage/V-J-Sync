# Database schema — V-J-Sync

Nguồn: `backend/prisma/schema.prisma` (PostgreSQL).

---

## 1. User

Người dùng hệ thống.

| Cột | Kiểu (Prisma) | Ràng buộc / mặc định |
|-----|-----------------|----------------------|
| `id` | String (UUID) | PK, `default(uuid())` |
| `email` | String | UNIQUE, NOT NULL |
| `password` | String | NOT NULL |
| `name` | String | NOT NULL |
| `avatarUrl` | String? | NULL |
| `preferredLanguage` | String | NOT NULL, default `"vi"` — giá trị: `vi` \| `ja` |
| `department` | String? | NULL |
| `phone` | String? | NULL |
| `createdAt` | DateTime | NOT NULL, `default(now())` |
| `updatedAt` | DateTime | NOT NULL, `@updatedAt` |

**Quan hệ:** tạo workspace, thành viên workspace/kênh, gửi tin nhắn/DM, task, nhắc nhở, bình luận (xem các bảng liên quan).

---

## 2. Workspace

Không gian làm việc (tổ chức nhóm).

| Cột | Kiểu | Ràng buộc / mặc định |
|-----|------|----------------------|
| `id` | String (UUID) | PK, `default(uuid())` |
| `name` | String | NOT NULL |
| `description` | String? | NULL |
| `department` | String? | NULL |
| `createdById` | String | NOT NULL → **FK `User.id`** |
| `createdAt` | DateTime | NOT NULL |
| `updatedAt` | DateTime | NOT NULL |

**Quan hệ:** `createdBy` → User; có nhiều `WorkspaceMember`, `Channel`, `Task`, `Reminder`, `DirectMessage`.

---

## 3. WorkspaceMember

Thành viên workspace (N–N User ↔ Workspace + vai trò).

| Cột | Kiểu | Ràng buộc / mặc định |
|-----|------|----------------------|
| `id` | String (UUID) | PK |
| `workspaceId` | String | NOT NULL → **FK `Workspace.id`**, `onDelete: Cascade` |
| `userId` | String | NOT NULL → **FK `User.id`**, `onDelete: Cascade` |
| `roleId` | Int | NOT NULL, default `3` — 1 Giám đốc, 2 Quản lý, 3 Nhân viên, 4 Khách |
| `permission` | String | NOT NULL, default `"chat_view"` — `full` \| `task_remind` \| `chat_view` \| `view_only` |
| `joinedAt` | DateTime | NOT NULL, `default(now())` |

**Unique:** `(workspaceId, userId)`.

---

## 4. Channel

Kênh chat trong workspace.

| Cột | Kiểu | Ràng buộc / mặc định |
|-----|------|----------------------|
| `id` | String (UUID) | PK |
| `workspaceId` | String | NOT NULL → **FK `Workspace.id`**, `onDelete: Cascade` |
| `name` | String | NOT NULL |
| `description` | String? | NULL |
| `isPrivate` | Boolean | NOT NULL, default `false` |
| `createdById` | String | NOT NULL → **FK `User.id`** |
| `createdAt` | DateTime | NOT NULL |

**Quan hệ:** nhiều `ChannelMember`, `Message`.

---

## 5. ChannelMember

Thành viên kênh (N–N User ↔ Channel).

| Cột | Kiểu | Ràng buộc / mặc định |
|-----|------|----------------------|
| `id` | String (UUID) | PK |
| `channelId` | String | NOT NULL → **FK `Channel.id`**, `onDelete: Cascade` |
| `userId` | String | NOT NULL → **FK `User.id`**, `onDelete: Cascade` |
| `joinedAt` | DateTime | NOT NULL, `default(now())` |

**Unique:** `(channelId, userId)`.

---

## 6. Message

Tin nhắn trong kênh; hỗ trợ thread qua `parentId`.

| Cột | Kiểu | Ràng buộc / mặc định |
|-----|------|----------------------|
| `id` | String (UUID) | PK |
| `channelId` | String | NOT NULL → **FK `Channel.id`**, `onDelete: Cascade` |
| `senderId` | String | NOT NULL → **FK `User.id`** |
| `content` | String | NOT NULL |
| `translatedContent` | String? | NULL |
| `fileUrl` | String? | NULL |
| `fileName` | String? | NULL |
| `fileType` | String? | NULL — `text` \| `file` \| `image` |
| `parentId` | String? | NULL → **FK `Message.id`** (thread) |
| `createdAt` | DateTime | NOT NULL, `default(now())` |

**Quan hệ:** `replies` — các `Message` con cùng `parentId`.

---

## 7. DirectMessage

Tin nhắn trực tiếp trong phạm vi workspace (1–1 theo cặp gửi/nhận).

| Cột | Kiểu | Ràng buộc / mặc định |
|-----|------|----------------------|
| `id` | String (UUID) | PK |
| `workspaceId` | String | NOT NULL → **FK `Workspace.id`**, `onDelete: Cascade` |
| `senderId` | String | NOT NULL → **FK `User.id`** |
| `receiverId` | String | NOT NULL → **FK `User.id`** |
| `content` | String | NOT NULL |
| `translatedContent` | String? | NULL |
| `fileUrl` | String? | NULL |
| `fileName` | String? | NULL |
| `createdAt` | DateTime | NOT NULL |

---

## 8. Task

Công việc thuộc workspace; `channelId` tùy chọn (trong Prisma **chưa** liên kết relation tới `Channel`).

| Cột | Kiểu | Ràng buộc / mặc định |
|-----|------|----------------------|
| `id` | String (UUID) | PK |
| `workspaceId` | String | NOT NULL → **FK `Workspace.id`**, `onDelete: Cascade` |
| `channelId` | String? | NULL (không có FK Prisma tới Channel) |
| `title` | String | NOT NULL |
| `description` | String? | NULL |
| `status` | String | NOT NULL, default `"todo"` — `todo` \| `in_progress` \| `review` \| `done` |
| `priority` | String | NOT NULL, default `"normal"` — `normal` \| `high` \| `urgent` |
| `tags` | String[] | default `[]` |
| `dueDate` | DateTime? | NULL |
| `creatorId` | String | NOT NULL → **FK `User.id`** |
| `assigneeId` | String? | NULL → **FK `User.id`** |
| `createdAt` | DateTime | NOT NULL |
| `updatedAt` | DateTime | NOT NULL |

**Quan hệ:** nhiều `TaskComment`.

---

## 9. TaskComment

Bình luận trên task.

| Cột | Kiểu | Ràng buộc / mặc định |
|-----|------|----------------------|
| `id` | String (UUID) | PK |
| `taskId` | String | NOT NULL → **FK `Task.id`**, `onDelete: Cascade` |
| `userId` | String | NOT NULL → **FK `User.id`** |
| `content` | String | NOT NULL |
| `createdAt` | DateTime | NOT NULL |

---

## 10. Reminder

Nhắc nhở trong workspace.

| Cột | Kiểu | Ràng buộc / mặc định |
|-----|------|----------------------|
| `id` | String (UUID) | PK |
| `workspaceId` | String | NOT NULL → **FK `Workspace.id`**, `onDelete: Cascade` |
| `title` | String | NOT NULL |
| `description` | String? | NULL |
| `remindAt` | DateTime | NOT NULL |
| `tags` | String[] | default `[]` |
| `isCompleted` | Boolean | NOT NULL, default `false` |
| `isSent` | Boolean | NOT NULL, default `false` |
| `creatorId` | String | NOT NULL → **FK `User.id`** |
| `targetUserId` | String? | NULL → **FK `User.id`** |
| `createdAt` | DateTime | NOT NULL |
| `updatedAt` | DateTime | NOT NULL |

---

## 11. Tóm tắt quan hệ (ER)

```
User 1──N Workspace          (Workspace.createdById)
User N──M Workspace        qua WorkspaceMember
Workspace 1──N Channel
User 1──N Channel           (Channel.createdById)
User N──M Channel          qua ChannelMember
Channel 1──N Message
User 1──N Message           (Message.senderId)
Message 1──N Message        (Message.parentId — thread)
Workspace 1──N DirectMessage
User 1──N DirectMessage     (sender / receiver)
Workspace 1──N Task
User 1──N Task              (creator / assignee)
Task 1──N TaskComment
User 1──N TaskComment
Workspace 1──N Reminder
User 1──N Reminder          (creator / target)
```

---

## 12. Cập nhật schema

Sau khi sửa `schema.prisma`:

```bash
cd backend && npx prisma migrate dev
```

Hoặc chỉ generate client: `npx prisma generate`.
