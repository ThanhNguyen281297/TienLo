# Kiểm chứng bản Tiên Lộ Online

Kiểm thử dùng DB SQLite tạm, không dùng dữ liệu tài khoản thật hoặc thay đổi VPS.

## Backend

`python tests/test_online_server.py`: 4 bài kiểm thử đạt. Bao gồm đăng ký/đăng nhập/logout, hash mật khẩu, quyền sở hữu nhân vật, CSRF/origin, revision, chặn truy cập file riêng, giao dịch giới hạn đấu trường đồng thời/qua ngày, HP quái chung, hit retry không gây damage lại, thưởng hợp tác và chat.

Backup SQLite đã được chạy trên database đang dùng WAL và xác nhận bản backup chứa dữ liệu đã commit. Script Ubuntu đã qua `bash -n`; Nginx/systemd cần được kiểm tra thực tế trên VPS sau khi có phiên SSH hợp lệ.

## Trình duyệt

Các bộ đã đạt bằng Chrome/Playwright:

- `online-game.test.cjs`: hai tài khoản thấy nhau, chat an toàn, quái/HP/thưởng chung, 30 ô túi và 6 ô trang bị, kéo thả desktop/cảm ứng thật, lưu/tải đúng tọa độ và gold, giữ đạo hạnh dự trữ, đấu trường với CSRF/tài khoản thật, đăng nhập trên browser mobile mới, không lỗi runtime/asset thiếu. Server kiểm tra chính xác chữ hoa/thường của đường dẫn để phát hiện lỗi sẽ gặp trên Linux.
- `basic-combos.test.cjs`: bốn combo, tầm/tốc độ, projectile vật lý, ấn, cooldown và reset.
- `cultivation-gameplay.test.cjs`: 150 tầng, học skill, luyện đan, điều kiện NPC và UI mobile.
- `kiem-skills.test.cjs`, `moon-skills.test.cjs`, `new-classes.test.cjs`: skill bốn phái, cooldown/mana, animation và giới tính/camera.
- `skill-aim.test.cjs`: ngắm chuột/chạm, kéo/thả/hủy và chi tiêu mana.
- `world-map.test.cjs`, `four-sect-maps.test.cjs`: bản đồ, đường cầu/va chạm, dịch vụ, truyền tống, map độc lập và mobile.
- `sect-arena.test.cjs`: 30 lượt, thắng/thua/rời, giới hạn theo tài khoản và UI mobile.
- `npc-monsters.test.cjs`: sprite Character/NPC/quái, animation, thưởng một lần và hồi sinh.
- `local-file-map.test.cjs`: kiểm tra renderer/terrain file:// bằng tài khoản mock; chơi online thực tế vẫn yêu cầu HTTP(S) và đăng nhập.

Ảnh QA nằm trong `tests/artifacts/online-*.png`. Đã xem và kiểm tra trực quan màn đăng nhập, hành trang desktop/mobile. Không có benchmark tải lớn, kiểm thử xâm nhập hoặc kiểm tra chống gian lận đầy đủ; phạm vi phát hành hiện tại là alpha cho nhóm nhỏ.

## VPS

Domain `mkt.ddnsfree.com` đã được xác nhận trỏ tới `116.118.3.118`. Kết nối SSH tới host hoạt động nhưng đăng nhập bằng key bị từ chối; chủ VPS xác nhận dùng mật khẩu. Chưa cài/cấu hình trên VPS. Kiểm tra HTTPS từ máy phát triển hiện bị từ chối kết nối port 443. Bộ ZIP và installer đã chuẩn bị cho chủ VPS chạy trực tiếp qua terminal, nhập mật khẩu tại SCP/SSH.
