# Bộ ảnh v3: chibi nét hơn (nhân vật, quái, NPC, trang bị)

Mục tiêu: **giữ nguyên nhận diện** (chibi 2,7 đầu, mặt meme theo từng class) và chỉ tăng chi tiết trang phục, ánh sáng, độ sạch của viền. Mọi file mới **giữ đúng tên, kích thước canvas, lưới và đường chân** của bản cũ, để thay trực tiếp mà không phải sửa code.

Từ bản này, code (`js/40-actor-clarity.js`) đã tự làm nét ảnh sau khi thu nhỏ và thêm bóng tiếp đất. Ảnh mới nên **tránh tự vẽ bóng, hào quang hay nền**, vì runtime đã lo phần đó.

## Quy tắc chung cho mọi prompt

Gắn đoạn này vào cuối từng prompt bên dưới:

> Transparent RGBA PNG, every empty pixel alpha 0. No background, floor, cast shadow, halo, aura ring, glow outline, text, labels, borders or checkerboard. Crisp clean dark-brown outline (2–3 px at full size) around the whole silhouette, flat-to-soft cel shading with ONE consistent key light from the upper left and a thin cool rim light on the right edge. High micro-detail in fabric patterns, metal trims and hair strands, but large readable shapes that still read at 48–64 px tall. No motion blur, no painterly smudge, no JPEG noise, no colored fringe on edges.

## 1. Nhân vật, 4 hướng đứng (32 file)

- **File**: `Character/<Kiem|Liem|Thuong|Quat>/<Nam|Nu>/<truoc|sau|trai|phai>.png`
- **Canvas**: giữ đúng kích thước file cũ (Kiếm nam là 1254×1254; Thương nam 1122×1402). Chân chạm cùng vị trí y như ảnh cũ.
- **Tham chiếu**: đưa ảnh cũ cùng tên vào ImageGen làm reference.

> Redraw THIS exact chibi Xianxia character from the reference at higher quality. Keep identity 100%: same 2.7-head chibi proportions, same humorous round meme face and expression, same hairstyle, headwear, costume layout and colors. Facing: {front view | back view showing full hair, no face | left profile | right profile}. Add richer embroidered cloud patterns, layered silk with visible folds, metallic gold trims with small highlights, jade/gem ornaments with specular dots, hair with individual strand groups. Same canvas size and the feet resting on exactly the same baseline as the reference. Character fully inside the canvas with 8% transparent margin. No weapon.

Ghi chú nhận diện, thêm vào prompt theo class:

| Class | Chi tiết cần giữ và tăng |
| --- | --- |
| Kiếm | Áo trắng lam, mũ lam hoa văn mây, trâm vàng ngang mũ, ngọc bội đỏ đeo hông |
| Liềm | Áo ngọc lục/lam ngọc; nam nón rộng vàng, nữ tóc tết xanh và vòng hoa |
| Thương | Giáp tím đen viền vàng, vai giáp chạm rồng; nam tóc tím dựng, nữ tóc tím dài trâm vàng |
| Quạt | Áo ngà/đen/vàng; nam vương miện nhánh sừng vàng, nữ tóc đen trâm hoa vàng |

Sau khi thay ảnh, không cần chạy script nào.

## 2. Nhân vật, atlas đi bộ và đả tọa (4 file)

- **File**: `Character/Motion/<Kiem|Liem|Thuong|Quat>-v2.png`, canvas **1585×992**, lưới **8 cột × 5 hàng** (4 cột nam, 4 cột nữ; hàng: đi tới, đi lùi, đi trái, đi phải, ngồi xếp bằng).
- **Tham chiếu**: atlas cũ cùng tên và hai ảnh `truoc.png` nam/nữ mới ở mục 1.

> Redraw this sprite animation atlas at higher quality while preserving the exact 8 columns × 5 rows layout, every pose, every cell position and the foot baselines. Columns 1–4 male, 5–8 female. Rows: walk toward viewer; walk away (full rear hair, no face); walk left; walk right; seated cross-legged meditation with hands at the lap. Match the new front reference for costume detail, outline and lighting. Alternating feet, arm swing and cloth follow-through clearly readable. Same chibi 2.7-head proportions and meme face. Transparent gutters inside every cell, nothing cropped, nothing overlapping the next cell.

Sau khi thay ảnh, chạy lại để đo khung: `python tests/build_character_motion.py` (lệnh này ghi `frames.json` và `js/35q-motion-frames.js`).

## 3. Quái bí cảnh (12 loài)

- **File**: `Character/Monsters/<Loài>/animation-v1.png` hoặc `-v2.png` (đúng tên đang dùng, xem `Character/Monsters/ANIMATION.md`). Lưới **4 cột × 5 hàng**: đứng, di chuyển, đánh, trúng đòn, chết.
- **Tham chiếu**: `1.png` và atlas cũ của loài đó.

> Redraw this monster animation atlas at higher quality, preserving the exact 4 columns × 5 rows grid, pose order, facing direction, scale and foot baseline. Same species identity, anatomy, colors and materials. Increase material definition: scales with individual specular edges, fur in clumped strands, horns and claws with hard highlights, glowing eyes small and sharp. Keep elemental effects (ice, fire, lightning) INSIDE the silhouette as small accents — no large smoke clouds, no aura blobs, no bloom spill beyond the body. Clear negative space between legs and body. Every pose complete inside its own cell with 10% transparent gutter.

Riêng Sói băng, Phượng hoàng và Sứa u linh: bản cũ có quầng sáng loang quá thân, nên thêm dòng *"remove the blue haze around the body; the silhouette edge must be clean"*.

Sau khi thay ảnh, chạy: `python tests/build_expedition_monsters.py`.

## 4. Quái bãi luyện công (Bọ Ngựa, Nguyệt Thố, Huyết Nhện, Băng Dực Dơi)

Bốn loài này dùng sprite sheet riêng trong `Map/sprite-catalog.json` (6 khung mỗi trạng thái), khác định dạng bí cảnh. Thay ảnh phải giữ đúng từng sheet và số khung. Mình đề xuất làm ở đợt sau bằng cách chuyển chúng sang định dạng atlas 4×5 như quái bí cảnh, kèm sửa loader.

## 5. NPC thành thị

- **File**: `Character/NPC/Motion/city-v1.png`, canvas **1536×1024**, lưới **6 cột × 4 hàng**, ô 256×256, chân ở y=250. Hàng 1: thợ rèn; hàng 2: người giao nhiệm vụ; hàng 3: trưởng lão truyền công; hàng 4: vệ binh.

> Redraw this NPC animation atlas at higher quality, preserving the exact 6 × 4 grid of 256 px cells, feet at y=250 in every cell, identical scale per row and the same six-frame motions (blacksmith hammer raise-strike-recover; quest guide breathing and greeting with scroll; elderly trainer idle with staff; city guard weight shift with spear). Chibi 2.7-head proportions to match player characters, friendly anime faces (not meme faces). Richer costume detail, clean outline, one upper-left key light.

Đợt tính năng "Nhiệm vụ và NPC hội thoại" sẽ cần thêm NPC (thương nhân, dược sư, truyền tống sư, thủ kho). Khi đó mình sẽ gửi prompt cho một atlas `city-v2.png` 6 × 8 hàng và sửa loader.

## 6. Icon trang bị

- **File**: giữ đúng tên trong `Item/<VuKhi|Ao|Chan|Giay|PhapBao|PhapTran|Thuan|Nhan|MatNa|...>/`. Canvas vuông, giữ kích thước cũ.

> One premium 2D Chinese fantasy MMORPG inventory icon: {tên món, chất liệu, màu}. Centered single object at a three-quarter angle, complete silhouette, 12% transparent margin, readable at 48 px. Strong material contrast: polished metal with crisp specular streaks, silk with embroidered gold thread, jade with inner translucency. One upper-left light. No background, no frame, no text, no cast shadow, no external aura.

Màu phẩm chất (viền, ánh sáng) do UI vẽ, nên icon **không tự thêm** viền màu phẩm chất.

## Thứ tự đề xuất

1. Bốn ảnh `truoc.png` nam của 4 class để thống nhất chất lượng, gửi mình xem trước.
2. Phần còn lại của mục 1, rồi mục 2.
3. Mục 3 (bắt đầu từ ba loài có quầng sáng loang).
4. Mục 5 và 6.
