# Session Storage Hoạt Động Như Thế Nào?

> Hướng dẫn dễ hiểu về lưu trữ session trong agent Cấp 2.

## Vấn Đề

Ở Cấp 1, mỗi lần khởi động lại agent là bắt đầu từ số 0. Agent không nhớ hội thoại trước. Đóng terminal là mất hết.

**Cấp 2 thêm Storage** — lưu các session hội thoại vào SQLite để bạn có thể tiếp tục sau.

---

## Tổng Quan

```
┌─────────────────────────────────────────────────────────┐
│                  Luồng Session Storage                   │
│                                                         │
│  User: "Viết Fibonacci"                                 │
│       ↓                                                 │
│  Agent ↔ LLM ↔ Tools (nhiều lượt)                      │
│       ↓                                                 │
│  Lưu messages vào SQLite sau mỗi lượt                  │
│       ↓                                                 │
│  User thoát. Lần sau: --session my-session             │
│       ↓                                                 │
│  Load messages từ SQLite → Tiếp tục hội thoại          │
└─────────────────────────────────────────────────────────┘
```

---

## Schema SQLite

Dùng hai bảng:

```sql
-- Mỗi dòng là một cuộc hội thoại
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Lịch sử hội thoại theo session
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,        -- "user" hoặc "assistant"
    content TEXT NOT NULL,     -- Nội dung message dạng JSON
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);
```

Mỗi message lưu `role` và `content`. Content có thể là:
- Văn bản thuần (user message)
- Danh sách tool_use blocks (assistant gọi tools)
- Danh sách tool_result blocks (kết quả tools)

Chúng ta serialize content dạng JSON để lưu cấu trúc phức tạp.

---

## Các Hàm Chính (core/storage.py)

| Hàm | Mục đích |
|-----|----------|
| `init_storage(db_path)` | Tạo bảng nếu chưa có |
| `save_session(session_id, messages, db_path)` | Upsert session và thay thế toàn bộ messages |
| `load_session(session_id, db_path)` | Tải messages của session; trả `None` nếu không tồn tại |
| `list_sessions(db_path)` | Liệt kê tất cả session theo `updated_at` giảm dần |

---

## Luồng Resume

1. User chạy: `python level_2_storage.py --chat --session my-session`
2. Agent gọi `load_session("my-session", db_path)`
3. Nếu session tồn tại: load messages; agent tiếp tục từ chỗ dừng
4. Nếu session mới: messages rỗng
5. Sau mỗi lượt assistant (kể cả tool results): gọi `save_session()`

---

## Khi Nào Dùng Storage

- **Hội thoại nhiều lượt** muốn tiếp tục sau
- **Audit trail** — ai hỏi gì, khi nào, agent làm gì
- **Debug** — xem session đã lưu để hiểu hành vi agent

---

## Thử Nghiệm

```bash
# Bắt đầu session mới (ID tự sinh)
python level_2_storage.py --chat

# Tiếp tục với session ID cụ thể
python level_2_storage.py --chat --session my-project

# Liệt kê session đã lưu
python level_2_storage.py --list-sessions
```
