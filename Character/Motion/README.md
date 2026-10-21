# Hoạt ảnh nhân vật

Bốn atlas PNG trong suốt được tạo bằng **ImageGen tích hợp**, theo hai ảnh nam/nữ `Character/<class>/<Nam|Nu>/truoc.png`. File cuối: `Kiem-v2.png`, `Liem-v2.png`, `Thuong-v2.png`, `Quat-v2.png` trong thư mục này. Không thay đổi pixel PNG bằng script.

Mỗi atlas gồm 40 tư thế: bốn khung × năm trạng thái × hai giới tính. Bốn cột đầu là nam, bốn cột sau là nữ; các hàng lần lượt đi trước, đi sau, đi trái, đi phải và ngồi xếp bằng. Tổng 160 tư thế cho tám mẫu class/giới tính.

## Prompt tạo hình

Prompt chung được gửi riêng cho từng class, với ảnh nam/nữ tương ứng:

> Create a production sprite animation atlas for this Xianxia browser RPG class. Use references for costume, colors, headwear and identity; render BOTH genders in coherent CHIBI 2.7-head-tall proportions, detailed crisp game illustration. Male retains humorous expressive round face, female a stylized face without laser eyes. Eight columns by five rows, transparent RGBA, no background, floor, shadows, labels or panel lines. Each row: columns 1–4 four consecutive male animation keyframes, columns 5–8 four consecutive female keyframes. Rows: walking towards viewer; walking away with full rear hair/head; walking left; walking right; seated cross-legged meditation, hands at lap and subtle breathing. Alternating feet, passing poses, arm swing and cloth follow-through. Consistent scale and foot baseline. Complete head, shoes, clothes and hair inside each cell with transparent gutters. No weapons, shields, wings, extra effects or cropping. Readable at 64 pixels tall.

Các chỉ dẫn nhận diện thêm:

- Kiếm: áo lam/trắng; nam đội mũ lam, nữ tóc đen buộc cao/trâm hoa vàng.
- Liềm: áo ngọc lục/lam ngọc; nam nón rộng màu vàng, nữ tóc tết xanh và vòng hoa.
- Thương: giáp tím/đen viền vàng; nam tóc tím dựng cao, nữ tóc tím dài và trâm vàng.
- Quạt: áo trắng ngà/đen/vàng; nam vương miện nhánh sừng vàng, nữ tóc đen và trâm hoa vàng.

Lượt chỉnh sửa giữ nguyên nhân vật và sửa khoảng cách/viền:

> Preserve all forty characters and the 8×5 organization. Add transparent safety gutters inside each cell, shrink figures uniformly so hats, horns, hair, toes, cloth and crossed legs are complete, without overlap or outer-edge cutoffs. Distinct alternating feet. Rear row shows no face or white face oval. Final row is truly seated cross-legged. Remove colored fringes and checker artifacts; empty pixels have alpha zero. Clean antialiased edges. No background, floor, shadow, labels, halos or additional weapons/effects.

## Runtime và tác giả

`python tests/build_character_motion.py` dùng Pillow để **đọc** ảnh và đo tư thế; chỉ ghi `frames.json` và `js/35q-motion-frames.js`. Các hàng do họa sĩ dựng có chiều cao khác nhau, nên metadata dùng khe trong suốt đã kiểm tra thay vì chia ảnh thành năm hàng đều rồi cắt cụt nhân vật.

`js/35q-character-animation.js` dùng chân/tà áo/các tư thế ngồi mới cùng phần thân trên nguyên vẹn của sprite nhân vật hiện tại. Giữ dung mạo, mặt nạ, tóc và màu áo, không chèn riêng mắt/miệng/mảnh mặt. Có bốn pha bước đi, bốn pha đả tọa và cache giới hạn 96 hình. Khi đứng yên dùng hình gốc; fallback hình gốc trong lúc atlas tải. Nhân vật online dùng cùng bộ tư thế.

Kiểm tra: `python tests/test_adventure.py`, `node tests/adventure-game.test.cjs`. Ảnh kiểm tra trong `tests/artifacts/character-motion-rigs.png`, `meditation-motion.png` và `normal-critical-damage.png` không đưa lên bản production.
