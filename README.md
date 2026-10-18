# Tiên Lộ 2D Online

Game tu tiên HTML5 Canvas: bốn phái, bản đồ tông môn, thành chung, farm hợp tác, đấu trường, tu luyện và trang bị.

Giao diện mobile: joystick bên trái, bốn skill tròn quanh nút đánh thường bên phải.
Hỗ trợ hai ngón tay để vừa di chuyển vừa kéo/ngắm skill. Túi đồ, thuộc tính, auto
và chat nằm ở dãy icon giữa dưới; nút **Khác** mở bản đồ, đả tọa, tu luyện, đột phá
và GM test. Máy tính vẫn dùng được WASD, F và phím 1–4.

Đến trận truyền tống ở bốn hướng và nhấn **E** (điện thoại: nút tương tác) để sang
bãi luyện công; trận bên kia đưa về sân tông môn. Mỗi bãi có 12 quái, tổng 48 quái
chung cho mỗi phòng tông môn/cảnh giới. Bốn đảo luyện công đã được mở rộng, không
có cầu hoặc khinh công. Linh Mạch Cốc có ba cặp trận và 36 quái.

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
- 1–4/Space: skill; chuột/chạm kéo nút skill để ngắm. Tự mở ở cấp 10/20/30/40; nâng chiêu tại Truyền Công Các.
- Q: đả tọa; B: tăng tầng/đột phá tại vùng an toàn; M: bản đồ; E: tương tác NPC.
- I: túi cơ bản 30 ô, nhẫn trữ vật mở thêm tối đa 40 ô; U: thuộc tính. Kéo đồ vào chín ô trang bị, kéo về ô túi trống để tháo. Trên mobile kéo bằng chạm hoặc chọn đồ rồi nhấn Trang bị.

## Gameplay và hình ảnh

Mỗi lần lên level nhận 3 điểm thuộc tính; tăng tầng/đột phá không cấp điểm. Nhập số điểm cho từng dòng rồi Cộng điểm một lần, hoặc chọn Tối đa. Nhân vật cũ giữ điểm đã cộng và điểm dư, chỉ bù phần thiếu tới `3 × (level − 1)`; mốc `world.attributeLevel` chống nhận lặp khi tải lại. Bốn chiêu tự mở miễn phí ở cấp 10/20/30/40 cho mọi class, độc lập với tu vi. Truyền Công Các chỉ nâng chiêu đã mở. Kiểm tra bằng `node tests/level-attributes-skills.test.cjs` và `python tests/test_character_progression.py`.

Tên dịch vụ/NPC là chữ nhỏ dưới chân, không có mô tả trên đầu. `js/32b-living-world.js` giữ nguyên công trình, va chạm và đường truyền tống; tách chuyển động tán cây, gợn nước, lửa lò/đèn, linh khí theo bãi luyện và mây tiền cảnh. Tắt chuyển động khi pause hoặc reduced-motion. Buff thuẫn tăng sắc độ và độ đậm, giữ mặt nhân vật ở lớp trước. Kiểm tra bằng `node tests/living-world.test.cjs`, `node tests/map-themes.test.cjs` và `node tests/equipment-animation.test.cjs`.

`js/32c-world-atmosphere.js` làm nước trên vách đảo chảy bằng texture cuộn trong vùng alpha của ba dòng thác gốc, có bọt nước và sương chân thác. Cổng có hai dòng xoáy ngược trong lòng vòm; phần vải đèn lồng lay riêng, thân cột và mái giữ nguyên. Ao có vân sáng/gợn nước, tinh trụ có ánh quét và dòng điện cục bộ. Thành/Nguyệt Hồ có cánh hoa; Vạn Kiếm/Thiên Cơ/Linh Mạch có lá bay; Lôi Vân có tuyết linh tinh; đấu trường có tàn lửa, boss có tro. Nhiều lớp sáng, chim xa, mây và đom đóm tạo chiều sâu. Số hạt giới hạn theo bãi đang thấy, giảm trên mobile; pause và reduced-motion dừng đồng hồ. Kiểm tra bằng `node tests/world-atmosphere.test.cjs`; clip bốn map nằm tại `tests/artifacts/world-atmosphere-preview.webm`.

Cấp nhân vật (1–200) và tu vi tách riêng. Đánh quái/nhận thưởng nhiệm vụ cho EXP tự lên cấp, giữ EXP dư; EXP cần cho cấp tiếp theo là `100 + 45×(cấp−1) + 12×(cấp−1)²`. Mỗi cấp thêm 6 HP, 2 MP và 0,8 Công gốc. Tu vi vẫn giữ 15 cảnh giới × 10 tầng, dùng đạo hạnh, Linh Thạch và đan để tăng tầng/đột phá. Đả tọa và Tu Vi Đan chỉ tăng tu vi. Nhân vật cũ giữ nguyên tu vi/đạo hạnh; level khởi tạo bằng `cảnh giới×10 + tầng`, EXP level bằng 0. Hai thanh EXP/tu vi hiện trên HUD.

Bốn phái: Kiếm Tông, Minh Nguyệt Tông, Lôi Thương Tông, Thiên Cơ Môn. Có 15 cảnh giới × 10 tầng. Nhân vật mới bắt đầu với túi và chín ô trang bị trống. Bật GM mở kho 100 vật phẩm để lấy/mặc thử; bốn ô trái cần đúng class, bốn ô phải dùng chung. Chỉ bốn ô trái cường hóa +15. Bí cảnh chỉ thưởng Linh Thạch; bộ trang bị và các loại mảnh đã được gỡ.

Ô Hiệu ứng chân nằm giữa giày và pháp trận, dùng chung cho bốn class. Sáu món Bộ Bộ Sinh Liên, Ngự Phong, Lôi Hành, Băng Liên, Hỏa Phượng, Tinh Hà có trong kho GM/cửa hàng; dấu bước sinh theo quãng đường, tự tan và không xuất hiện khi đứng yên hoặc truyền tống. Từ Kim Đan đến Đạo Tổ tự hiện hào quang đúng tu vi, có ánh quét/hạt chuyển động và lớp dưới chân; level không mở hào quang. Người chơi khác nhìn thấy món đang mặc và cảnh giới đã lưu. Kiểm tra bằng `node tests/character-auras.test.cjs`; clip tại `tests/artifacts/character-auras-preview.webm`.

Túi có icon, màu phẩm chất, preview nhân vật, sắp xếp và panel chi tiết. Vũ khí phát sáng mạnh hơn theo phẩm chất; skill/hit có vòng sáng và hạt theo phái. Giữ sprite/asset nguồn và phối cảnh bản đồ. Xem [GAMEPLAY.md](GAMEPLAY.md).

Skill dùng đường khí uốn liên tục, quỹ đạo tụ lực–tung chiêu liền mạch và hạt theo thời gian mô phỏng. Pháp bảo đeo ở lưng có chuyển động cánh/dải và ánh sáng quét; buff thuẫn có lớp năng lượng chạy quanh nhân vật. Kiểm tra hình ảnh bằng `node tests/spell-actors.test.cjs` và `node tests/equipment-animation.test.cjs`; ảnh/video được ghi trong `tests/artifacts/`.

Skill dùng các bộ phận ảnh riêng: từng kiếm/nguyệt nhận bay độc lập; thân rồng có 28 khớp theo đường đầu rồng; phượng có khớp vai/khuỷu, đập cánh, lao xuống và tỏa phù. Điểm lao trúng khớp thời điểm gây sát thương. Lớp ảnh nguyên con đung đưa đã được gỡ khỏi renderer. Nguồn ImageGen và prompt tại [Skill/VFX/rig-parts-v3.prompt.md](Skill/VFX/rig-parts-v3.prompt.md). Vũ khí đeo thu nhỏ 19%, thuẫn 21% để thân nhân vật dễ nhìn.

Kiếm/Liềm bổ sung [bộ ảnh chuyển động riêng](Skill/VFX/sword-moon-parts-v4.prompt.md): 30 kiếm rơi thành sáu đợt, đại kiếm kết liễu, hai nhịp nguyệt trảm, bão nguyệt nhận, nguyệt thực và vỡ trăng. `node tests/four-class-skills.test.cjs` thử đủ 16 nút skill của bốn class, icon/tên, hiệu ứng và sát thương ở cấp 40/Phàm Nhân 1, không bật GM.

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

Hệ thống pháp bảo, tẩy luyện, hộ thuẫn và cấu trúc asset: xem [Item/README.md](Item/README.md).
