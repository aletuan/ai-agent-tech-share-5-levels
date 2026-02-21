# Animation Minh Họa Agent Loop — Tài liệu Thiết kế

## Mục tiêu

Xây dựng một trang web animation tương tác minh họa vòng lặp agent (Level 1) cho buổi training/tech-share. Người trình bày click từng bước, thấy dòng dữ liệu chạy giữa các component với animation mượt mà.

## Quyết định

- **Tech**: Vite + React + TypeScript + Framer Motion + Tailwind CSS
- **Kịch bản**: Happy path — ví dụ Fibonacci (8 bước, 3 lần gọi API)
- **Chế độ**: Điều khiển từng bước bằng nút Next/Prev + phím mũi tên
- **Vị trí**: `docs/training/animation/` (mini-app riêng trong dự án)

## Bố cục

```
┌──────────────────────────────────────────────────────────────┐
│  Header: Tiêu đề + Chỉ số bước + Nút điều hướng            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  TRÊN: Sơ đồ Kiến trúc                                      │
│  - 5 hộp component: User, Agent, LLM, Tools, FileSystem     │
│  - Mũi tên animated (gói dữ liệu) giữa các component       │
│  - Component đang hoạt động phát sáng                        │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  DƯỚI: Panel Chi tiết                                        │
│  - Tiêu đề và mô tả bước                                    │
│  - Code/messages đang được gửi                               │
│  - Suy luận của model (khung "thought bubble")               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 8 Bước Animation

| Bước | Nguồn → Đích | Animation | Panel Chi tiết |
|------|--------------|-----------|----------------|
| 1 | User → Agent | User phát sáng, mũi tên bay đến Agent | Prompt: "Write a Fibonacci function, save to fib.py, run it" |
| 2 | Agent (nội bộ) | Agent phát sáng, xây dựng messages | Xây messages: [system_prompt, user_message] + tools: [read_file, write_file, run_shell] |
| 3 | Agent → LLM | Mũi tên bay Agent → LLM | Gọi API lần 1: chat.completions.create(messages, tools) |
| 4 | LLM → Agent | LLM "suy nghĩ", mũi tên quay lại | Response: tool_calls: [write_file(path="fib.py", content="def fibonacci...")] |
| 5 | Agent → Tools → FS | Mũi tên: Agent → Tools → FileSystem | execute_tool("write_file", ...) → "Written 324 bytes to fib.py" |
| 6 | Agent → LLM | Mũi tên bay lại | Gọi API lần 2: messages giờ có kết quả write_file |
| 7 | LLM → Agent → Tools → FS | Animation nhiều chặng | run_shell("python3 fib.py") → STDOUT: Fibonacci(0)=0... Return code: 0 |
| 8 | LLM → Agent → User | Mũi tên bay đến User | Text cuối: "I have written the Fibonacci function..." — Không còn tool_calls |

## Bảng màu

- Nền: tối (slate-900)
- User: xanh dương (blue-400)
- Agent: tím (purple-400)
- LLM: vàng hổ phách (amber-400)
- Tools: xanh lá (green-400)
- FileSystem: xanh lơ (cyan-400)
