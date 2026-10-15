# Tiên Lộ 2D Online

Game tu tiên HTML5 Canvas: bốn phái, bản đồ tông môn, thành chung, farm hợp tác, đấu trường, tu luyện và trang bị.

## Chạy

Cần Python 3.11+ và trình duyệt hiện đại. Không cần thư viện Python ngoài.

```bash
python server.py
```

Mở http://127.0.0.1:8080, đăng ký tài khoản, chọn phái/Nam/Nữ và đặt đạo hiệu. Mỗi tài khoản có một nhân vật; đăng nhập lại hoặc từ thiết bị khác tiếp tục bản lưu trên server. Không mở trực tiếp `index.html` để chơi online.

## Database và tài khoản

Database SQLite mặc định ở `data/tienlo.sqlite3`; đổi bằng `TIENLO_DB`. Không đọc/ghi TXT và không dùng localStorage lưu nhân vật. File TXT cũ không tự nhập vào tài khoản mới.

Các bảng: `users`, `sessions`, `characters`, `arena_visits`. Mật khẩu hash scrypt, session HttpOnly/SameSite, API ghi kiểm tra CSRF. Bản lưu có revision để phát hiện ghi đè. Đăng nhập thiết bị mới thay phiên trước. Lưu tự động mỗi 5 giây và khi có thay đổi; logout chờ lưu. Đóng tab đột ngột vẫn có thể mất thay đổi sau lần lưu gần nhất.

## Online

Thấy người chơi khác cùng bản đồ, chat và biểu cảm. Quái farm chia theo map/cảnh giới luyện công; người cùng phòng thấy cùng HP, trạng thái chết/hồi sinh. Người góp sát thương gần thời điểm hạ quái đều được nhận thưởng. Thành là hub chung; đấu trường là thử thách riêng, hai lượt mỗi tài khoản/ngày theo giờ Việt Nam.

Đây là bản alpha cho nhóm nhỏ. Server quản lý HP quái chung và kiểm tra khoảng cách/tần suất hit, nhưng chưa quản lý toàn bộ kinh tế và skill trên server. Đọc giới hạn và cấu hình Ubuntu/Nginx/HTTPS trong [DEPLOYMENT.md](DEPLOYMENT.md) trước khi triển khai.

## Điều khiển

- WASD/mũi tên/chạm kéo: di chuyển; Tab/chạm quái: chọn mục tiêu; F: đánh thường; Z: auto.
- 1–4/Space: skill; chuột/chạm kéo nút skill để ngắm. Skill cần học tại Truyền Công Các.
- Q: đả tọa; B: tăng tầng/đột phá tại vùng an toàn; C: tu luyện; M: bản đồ; E: tương tác NPC.
- I: túi 30 ô; U: thuộc tính. Kéo đồ vào sáu ô trang bị, kéo về ô túi trống để tháo. Trên mobile kéo bằng chạm hoặc chọn đồ rồi nhấn Trang bị.

## Gameplay và hình ảnh

Bốn phái: Kiếm Tông, Minh Nguyệt Tông, Lôi Thương Tông, Thiên Cơ Môn. Có 15 cảnh giới × 10 tầng. Nhân vật mới nhận đồ cơ bản và thuốc. Mục tiêu tiên đồ hướng dẫn gặp Sư phụ, tăng tầng, học skill và đột phá. Mỗi 20 quái nhận một Thăng Vị Đan qua tích mảnh, bên cạnh drop ngẫu nhiên/thủ lĩnh; giữ tiến độ dù chưa gặp may.

Túi có icon, màu phẩm chất, preview nhân vật, sắp xếp và panel chi tiết. Vũ khí phát sáng mạnh hơn theo phẩm chất; skill/hit có vòng sáng và hạt theo phái. Giữ sprite/asset nguồn và phối cảnh bản đồ. Xem [GAMEPLAY.md](GAMEPLAY.md).

## Cấu trúc

`index.html` nạp script theo thứ tự. Core → renderer → nhân vật → tài khoản → skill → ngắm → world → quái → arena → tiến trình → combo → túi → auto → online → hiệu ứng → hướng dẫn → khởi động. Các module còn bọc hàm toàn cục, nên cần giữ thứ tự.

- `server.py`: SQLite/auth/API và phòng online.
- `js/13-local-database.js`: tên file giữ để tương thích thứ tự, nội dung là tài khoản/database online.
- `js/25-inventory.js`: chỉ số, drop, túi dạng ô, kéo thả/trang bị.
- `js/27-online-world.js`: đồng bộ người/quái, chat và thưởng hợp tác.
- `js/28-combat-polish.js`, `29-journey.js`: hiệu ứng và hướng dẫn nhập môn.
- `css/online-ui.css`: tài khoản, túi/trang bị, HUD và chat responsive.
- `deploy/`: service Ubuntu, Nginx và backup SQLite.

## Kiểm thử

```bash
python tests/test_online_server.py
node tests/online-game.test.cjs
node tests/basic-combos.test.cjs
node tests/cultivation-gameplay.test.cjs
node tests/world-map.test.cjs
```

Browser tests dùng Chrome và Playwright. Có thể chỉ định module qua `PLAYWRIGHT_MODULE`. Database kiểm thử nằm trong thư mục tạm. Các bộ test mechanics dùng tài khoản mock; `online-game.test.cjs` kiểm tra đăng ký/đăng nhập và hai browser profile với server/database thật.

## Tự cập nhật qua GitHub Actions

Đọc [CICD.md](CICD.md) để thiết lập một lần. Sau đó commit/push lên main sẽ chạy kiểm thử, đồng bộ code, restart service và kiểm tra health; cấu hình/DB VPS được giữ nguyên.
