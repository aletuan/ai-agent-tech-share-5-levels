# 5 Cấp Độ của Agentic Software — Tài liệu Thiết kế

## Mục tiêu

Xây dựng một coding agent từ nền tảng cơ bản (raw OpenAI SDK, không dùng framework) qua 5 cấp độ tiến dần. Dự án mang tính giáo dục nhằm dạy các khái niệm lập trình agent.

## Quyết định Kỹ thuật

- **LLM**: OpenAI `gpt-4.1-mini`
- **Cách tiếp cận**: Xây từ nền tảng — không dùng agno hay bất kỳ agent framework nào
- **Tham khảo**: https://github.com/agno-agi/agno/tree/main/cookbook/levels_of_agentic_software

## Cấu trúc Dự án

```
ai-agent-tech-share-5-levels/
├── level_1_tools.py              # Cấp 1: Agent + tools
├── level_2_storage_knowledge.py  # Cấp 2: + lưu trữ & kiến thức
├── level_3_memory_learning.py    # Cấp 3: + bộ nhớ & học hỏi
├── level_4_team.py               # Cấp 4: + đội đa agent
├── level_5_api.py                # Cấp 5: + hệ thống production
├── core/
│   ├── __init__.py
│   ├── agent.py          # Vòng lặp agent (trái tim hệ thống)
│   ├── tools.py          # Registry công cụ + các tool có sẵn
│   ├── storage.py        # Lưu trữ session (Cấp 2)
│   ├── knowledge.py      # Tìm kiếm vector / RAG (Cấp 2)
│   ├── memory.py         # Bộ nhớ dài hạn (Cấp 3)
│   └── team.py           # Điều phối đa agent (Cấp 4)
├── workspace/            # Thư mục làm việc của agent
├── requirements.txt
└── .env.example
```

## Cấp 1: Agent với Tools (Công cụ)

**Khái niệm cốt lõi**: Vòng lặp agent — prompt → LLM → gọi tool → thực thi → trả kết quả → lặp lại.

Thành phần:
- **Tool registry**: Hàm Python + mô tả JSON Schema
- **3 tool có sẵn**: `read_file` (đọc file), `write_file` (ghi file), `run_shell` (chạy lệnh shell)
- **Vòng lặp agent**: Vòng `while` sử dụng OpenAI Chat Completions API
- **Model**: `gpt-4.1-mini` qua raw `openai` SDK

**Điều thiếu**: Không có trạng thái (stateless). Mỗi lần chạy bắt đầu từ số 0. Agent không nhớ session trước.

## Cấp 2: Agent với Storage & Knowledge (Lưu trữ & Kiến thức)

### Storage (Lưu trữ — SQLite):
- Lưu/tải các session hội thoại vào database
- Mỗi session có `session_id`, tin nhắn lưu dạng JSON
- Tiếp tục hội thoại từ lần trước, có bản ghi audit (agent đã làm gì, khi nào, vì sao)

### Knowledge (Kiến thức — ChromaDB + OpenAI embeddings):
- Nhúng (embed) tài liệu, tìm kiếm ngữ nghĩa (semantic search)
- Dùng `text-embedding-3-small` cho embeddings
- Agent tìm kiến thức **trước khi** viết code
- Nạp sẵn các coding convention (quy chuẩn viết code)

**Khi nào dùng Cấp 2**: Khi agent cần tuân thủ chuẩn nội bộ hoặc cần hội thoại nhiều lượt.

## Cấp 3: Agent với Memory & Learning (Bộ nhớ & Học hỏi)

### Memory (Bộ nhớ):
- Lưu preference (sở thích) dài hạn của người dùng qua các session
- Xây dựng hồ sơ người dùng (coding style, thói quen...) theo thời gian
- Key-value store dựa trên SQLite

### Learning (Học hỏi):
- Lưu "lessons learned" (bài học kinh nghiệm) từ mỗi session
- Truy xuất bài học liên quan cho các tác vụ mới
- "Lần tương tác thứ 1000 phải tốt hơn lần thứ 1"

**Khi nào dùng Cấp 3**: Khi agent phục vụ người dùng lặp lại và cần cải thiện theo thời gian.

## Cấp 4: Đội Đa Agent (Multi-Agent Team)

Phân vai trò:
- **Coder** → viết code
- **Reviewer** → chỉ đọc & review (read-only tools)
- **Tester** → viết test & validate
- **Team Leader** → điều phối tổng thể

**Cảnh báo**: Multi-agent mạnh nhưng khó đoán & kém ổn định. Với production cần reliability cao → ưu tiên workflow tường minh hơn dynamic delegation.

**Khi nào dùng Cấp 4**: Khi task cần nhiều góc nhìn (review, decomposition, human-supervised).

## Cấp 5: Hệ thống Production

Nâng cấp runtime:
- SQLite → PostgreSQL
- ChromaDB → PgVector
- Thêm FastAPI để expose API
- Thêm tracing / observability (theo dõi & quan sát)

**Khi nào dùng Cấp 5**: Khi agent phục vụ nhiều user, cần uptime & debug production.

---

## Lời khuyên quan trọng nhất

> Bắt đầu từ Cấp 1. Chỉ thêm năng lực khi cấp đơn giản đã chứng minh là không đủ.

Nhiều team nhảy thẳng Cấp 4 vì demo trông "ngầu", rồi mất hàng tháng debug coordination failure. Mỗi cấp thêm complexity, mà **complexity luôn có cost** (thuế độ phức tạp).
