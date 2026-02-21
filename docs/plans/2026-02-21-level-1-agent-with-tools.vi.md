# Cấp 1: Agent với Tools — Kế hoạch Triển khai

**Mục tiêu:** Xây dựng một coding agent từ nền tảng cơ bản (raw OpenAI SDK) có khả năng đọc file, ghi file, và chạy lệnh shell.

**Kiến trúc:** Một vòng lặp agent đơn giản gửi prompt của người dùng đến OpenAI Chat Completions API kèm định nghĩa tool. Khi model trả về `tool_calls`, ta thực thi chúng tại local và đưa kết quả trở lại. Vòng lặp tiếp tục cho đến khi model tạo ra phản hồi văn bản cuối cùng.

**Tech Stack:** Python 3.11+, openai SDK, python-dotenv

---

### Task 1: Thiết lập Dự án

**File cần tạo:**
- `requirements.txt` — Khai báo thư viện cần cài
- `.env.example` — Mẫu biến môi trường
- `.gitignore` — Loại trừ file không cần track
- `core/__init__.py` — Đánh dấu package Python

**Các bước:**

1. Tạo `requirements.txt` với `openai` và `python-dotenv`
2. Tạo `.env.example` với `OPENAI_API_KEY=sk-your-key-here`
3. Tạo `.gitignore` (bỏ qua `__pycache__/`, `.env`, `workspace/`, `.venv/`)
4. Tạo `core/__init__.py` (file rỗng)
5. Tạo virtual environment và cài dependencies:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
6. Tạo `.env` với API key thật
7. Init git repo và commit đầu tiên

---

### Task 2: Tool Registry & Các Tool Có Sẵn

**File:** `core/tools.py`

**Khái niệm cốt lõi:**
> Một tool = Hàm Python + Mô tả JSON Schema.
> Registry ánh xạ tên tool → (hàm, schema).

Đây là nền tảng — ta định nghĩa tools dưới dạng hàm Python thuần túy, rồi mô tả chúng bằng JSON Schema để LLM biết cách gọi.

**3 tool tối thiểu cho coding agent:**

| Tool | Chức năng | Giải thích |
|------|-----------|------------|
| `read_file` | Đọc file | Đọc nội dung file theo đường dẫn tương đối so với workspace |
| `write_file` | Ghi file | Tạo/ghi đè file, tự tạo thư mục cha nếu cần |
| `run_shell` | Chạy lệnh shell | Thực thi command, trả về stdout + stderr, timeout 30 giây |

**Bảo mật:**
- Mỗi tool kiểm tra path traversal (không cho phép thoát khỏi workspace)
- Shell command có timeout để tránh treo vĩnh viễn

**API chính:**
- `get_tool_schemas()` → Trả danh sách schema cho OpenAI API
- `execute_tool(name, args, base_dir)` → Thực thi tool theo tên

**Kiểm tra:**
```bash
python -c "from core.tools import get_tool_schemas; print('OK:', len(get_tool_schemas()), 'tools')"
# Kỳ vọng: OK: 3 tools
```

---

### Task 3: Vòng Lặp Agent (Agent Loop)

**File:** `core/agent.py`

**Đây là trái tim của mọi AI agent.** Sơ đồ:

```
Prompt người dùng
    ↓
┌─→ LLM (với tools) ─→ có tool_calls? ─có─→ Thực thi tools ─→ Thêm kết quả ─┐
│                            │                                                  │
│                          không                                                │
│                            ↓                                                  │
│                      In phản hồi                                              │
│                            ↓                                                  │
│                          XONG                                                 │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Giải thích từng bước:**

1. Xây dựng `messages` gồm: system prompt (hướng dẫn) + user message
2. Gọi `client.chat.completions.create()` với messages + tools
3. Kiểm tra response:
   - **Trường hợp 1**: Model muốn gọi tool → thêm assistant message vào history → thực thi từng tool call → thêm tool result → **quay lại bước 2**
   - **Trường hợp 2**: Model trả văn bản (không có tool_calls) → in ra → **kết thúc**

**Điểm quan trọng:**
- `message.model_dump()` — serialize toàn bộ assistant message (bao gồm tool_calls) để thêm vào history
- `tool_call_id` — mỗi kết quả tool phải khớp với ID của lời gọi tool tương ứng
- Vòng lặp `while True` chỉ dừng khi model không còn gọi tool nữa

**Kiểm tra:**
```bash
python -c "from core.agent import Agent; print('Agent class loaded OK')"
```

---

### Task 4: Entry Point Cấp 1

**File:** `level_1_tools.py`

**File này làm gì:**
1. Load biến môi trường từ `.env` (API key)
2. Tạo thư mục `workspace/` — nơi agent đọc/ghi file
3. Định nghĩa instructions (hướng dẫn cho agent):
   - Quy trình: Hiểu task → Viết code → Lưu file → Chạy → Sửa lỗi nếu có
   - Quy tắc: Type hints, docstrings, test ít nhất 2-3 input
4. Tạo Agent và chạy với một task mẫu (Fibonacci)

**Chạy thử:**
```bash
python level_1_tools.py
```

**Kỳ vọng agent sẽ:**
1. Gọi `write_file` để tạo `workspace/fib.py`
2. Gọi `run_shell` để chạy `python fib.py`
3. Nếu lỗi → sửa và chạy lại
4. In phản hồi tóm tắt kết quả

---

### Task 5: Thêm Chế Độ Tương Tác (Interactive Mode)

**File sửa:** `core/agent.py`, `level_1_tools.py`

**Vấn đề hiện tại:** Agent chỉ xử lý một prompt duy nhất rồi thoát.

**Giải pháp:** Thêm phương thức `chat()` — một REPL cho phép hội thoại nhiều lượt. Vẫn stateless giữa các lần restart (đó là động lực cho Cấp 2).

**Cách hoạt động của `chat()`:**
1. Khởi tạo `messages` với system prompt
2. Vòng lặp: đọc input người dùng → thêm vào messages → chạy agent loop → in kết quả → **lặp lại**
3. Messages được tích lũy → agent nhớ ngữ cảnh trong phiên
4. Gõ `exit` hoặc `quit` để thoát

**Chạy thử:**
```bash
python level_1_tools.py --chat
```

---

## Tóm tắt

Sau khi hoàn thành tất cả 5 task, bạn sẽ có:

| Thành phần | File | Chức năng |
|------------|------|-----------|
| Tool registry | `core/tools.py` | 3 tools (read_file, write_file, run_shell) + registry |
| Vòng lặp agent | `core/agent.py` | Vòng `while` biến LLM thành agent |
| Entry point | `level_1_tools.py` | Agent Cấp 1 với chế độ single-shot và interactive |

## Bạn sẽ hiểu gì sau Cấp 1:

- **Vòng lặp agent** chỉ là vòng `while`: LLM → gọi tool → thực thi → đưa kết quả lại → lặp
- **Tools** là hàm Python + mô tả JSON Schema
- **Không có storage** → mỗi lần restart là bắt đầu lại từ đầu (đây là lý do cần Cấp 2)

## Điều thiếu (động lực cho Cấp 2):

- Không lưu trữ session → mất hết khi tắt terminal
- Không có knowledge base → agent không biết coding convention của team
- Không có audit trail → không biết agent đã làm gì trước đó
