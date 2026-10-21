# Quái bí cảnh — 12 bộ hoạt ảnh

Giữ nguyên ảnh tham chiếu `1.png` của người dùng trong từng thư mục. Các atlas mới được dựng bằng **ImageGen tích hợp**, PNG RGBA trong suốt, không sửa pixel bằng script. Bốn quái cũ giữ nguyên.

Mỗi atlas có 4 cột × 5 hàng: đứng/thở, di chuyển, tấn công, trúng đòn, chết. Mỗi trạng thái có 4 khung, tổng cộng 240 tư thế. Mỗi ô chứa toàn bộ quái, không ghép bộ phận cơ thể.

## File dùng trong game

| Thư mục | Atlas | Chủ thể tham chiếu |
| --- | --- | --- |
| BoCanhVang | animation-v1.png | Bọ vàng lục bảo |
| Ech | animation-v1.png | Ếch độc xanh có giáp và sừng |
| TeGiac | animation-v1.png | Tê giác sét xanh |
| SuaQuy | animation-v1.png | Sứa u linh tím lam |
| RongNuoc | animation-v2.png | Thủy long xanh trắng |
| BoCap | animation-v2.png | Bọ cạp lửa |
| DungNham | animation-v2.png | Cự linh đá dung nham |
| TrauQuy | animation-v1.png | Ngưu ma đỏ đen cầm rìu |
| PhuongHoang | animation-v2.png | Phượng hoàng lửa |
| Soi | animation-v2.png | Sói băng xanh |
| QuyLiem | animation-v2.png | U linh áo choàng tím cầm liềm |
| RongXuong | animation-v1.png | Cốt long lửa xanh |

Đường dẫn đầy đủ trong repo là `Character/Monsters/<thư mục>/<atlas>`.

## Bộ prompt sản xuất

Prompt chung được áp dụng riêng cho từng chủ thể trong bảng; ảnh `1.png` tương ứng là tham chiếu nhận diện:

> Production animation atlas for the EXACT SAME monster in the reference. Preserve its identity, anatomy, materials, colors and costume. 20 COMPLETE FULL MONSTER poses, high-resolution PORTRAIT transparent RGBA, FOUR columns and FIVE rows. Row 1: four-frame idle/breathing. Row 2: distinct four-frame movement/flaps/swim loop. Row 3: anticipation, windup, strike, recovery. Row 4: recoil and recovery. Row 5: stagger, buckle, collapse, corpse. Consistent three-quarter facing direction, scale and foot baseline; detailed crisp painted Xianxia game style. Complete head, feet, tail, wings, horns, weapon and effects inside each own cell. Transparent gutters at least 10%. No cropping, background, floor, cast shadow, enclosing aura circle, text, labels or borders.

Với sáu atlas v2, lượt chỉnh sửa dùng ImageGen để bỏ nền màu còn sót:

> Remove the entire colored gradient background; all empty pixels must have alpha zero. Preserve all 20 complete poses in five rows, a 4:5 portrait canvas and transparent gutters. Shrink poses if necessary to keep every body part inside its cell. Trim excess smoke. Keep consistent facing. No matte, floor shadow, labels or borders.

## Metadata và runtime

`python tests/build_expedition_monsters.py` cần Pillow, chỉ **đọc** alpha để đo hình và điểm tiếp đất; ghi `animation-frames.json` và `js/35n-monster-frames.js`. Không thay đổi PNG. `js/35n-monster-atlases.js` chọn nguyên tư thế, neo chân và lật hướng. Runtime chỉ tải loài có trong bí cảnh hiện tại, lưu cache khung đã raster hóa.

`Map/expeditions.json` cấu hình loài, kích thước hiển thị, cổng, level và phần thưởng. Chạy `python tests/test_expeditions_duels.py` để kiểm tra atlas, rơi đồ và lôi đài; `node tests/expeditions-duel-game.test.cjs` thử bằng ba tài khoản cục bộ.
