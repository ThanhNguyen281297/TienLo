# Tiên Lộ Online – bản PC (Windows)

Cửa sổ Electron mở `https://tienlo2d.xyz/?play` (cùng tài khoản, máy chủ và bản cập nhật với web). Không đóng gói tài nguyên game nên không cần cập nhật lại khi web thay đổi.

- Build tự động: `.github/workflows/desktop.yml` (Windows runner) tạo `TienLo-PC.exe` (portable, x64) và đưa vào GitHub Release `desktop-latest`; workflow deploy chép file đó vào `Character/App/TienLo-PC.exe` trên VPS.
- Build tay trên Windows: `cd desktop && npm install && npm run dist` (cần `build/icon.png` ≥ 256 px, ví dụ copy `Character/App/icon-512.png`).
- Chưa ký số Authenticode nên Windows SmartScreen có thể cảnh báo; phát hành chính thức cần chứng chỉ ký mã.
- F11 bật/tắt toàn màn hình, F5 tải lại.
