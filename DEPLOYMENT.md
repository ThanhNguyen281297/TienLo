# Triển khai Tiên Lộ Online trên Ubuntu

Quyền GM được quản lý bằng `users.gm` (0/1), tự thêm khi service chạy bản mới; mặc định mọi tài khoản đều không có GM. Trong phiên root MobaXterm:

```bash
python3 /opt/tienlo/deploy/set-gm.py ten_dang_nhap --enable
# Thu hồi:
python3 /opt/tienlo/deploy/set-gm.py ten_dang_nhap --disable
```

Đăng xuất/đăng nhập lại để cập nhật UI. SQL tương đương: `UPDATE users SET gm=1 WHERE username='ten_dang_nhap';`. Mảnh, cống hiến, nhiệm vụ, khóa dòng và kết quả tẩy luyện nằm trong các bảng SQLite riêng; giữ toàn bộ file DB khi triển khai. Xem luật mới và lệnh kiểm tra trong [GAMEPLAY.md](GAMEPLAY.md).

Bản này hỗ trợ tài khoản, bản lưu SQLite, người chơi/quái chung, tổ đội, tông môn, boss, bí cảnh và lôi đài PvP có khán giả. Đây là bản alpha cho nhóm nhỏ: các giao dịch mảnh/cống hiến/tẩy luyện và chiến đấu PvP do server quản lý; một phần tiến trình và mô phỏng PvE cũ vẫn ở client, chưa chuyển toàn bộ game sang mô hình chống gian lận trên server.

## Triển khai bằng mật khẩu SSH trên máy bạn

Không gửi mật khẩu qua chat. Sau khi tải `tienlo-online.zip` trong `dist`, mở PowerShell tại thư mục chứa ZIP và chạy (SCP/SSH sẽ hỏi mật khẩu trực tiếp trong terminal):

```powershell
scp ./tienlo-online.zip root@116.118.3.118:/tmp/tienlo-online.zip
ssh root@116.118.3.118
```

Trong terminal VPS:

```bash
apt-get install -y unzip
mkdir -p /opt/tienlo-release
unzip -o /tmp/tienlo-online.zip -d /opt/tienlo-release
bash /opt/tienlo-release/deploy/install-ubuntu.sh tienlo2d.xyz
```

Installer yêu cầu Python 3.11+, khuyến nghị Ubuntu 24.04. Nếu domain đang có Nginx site khác hoặc Apache đang chạy, installer dừng trước khi thay đổi ứng dụng. Khi đó cần xem cấu hình hiện có để tích hợp; không xóa site hiện tại để vượt qua kiểm tra. Đọc các bước thủ công dưới đây khi cần tùy chỉnh.

## Chuẩn bị

Ubuntu có Python 3.11+ và Nginx. Domain phải trỏ A/AAAA tới VPS. Các cấu hình đã đặt domain `tienlo2d.xyz` theo thông tin bạn cung cấp. VPS: `116.118.3.118`, SSH user `root`. Trước khi bật cần kiểm tra cấu hình Nginx hiện có để tránh trùng server_name. Không cần cài dependency Python.

Upload thư mục dự án lên `/opt/tienlo`. Không upload `tests/artifacts`, `__pycache__`, các DB thử nghiệm hoặc `data/characters.txt`. Nếu đã có dữ liệu SQLite, sao lưu trước khi cập nhật và giữ DB ở `/var/lib/tienlo`, ngoài thư mục code.

```bash
sudo apt update
sudo apt install python3 nginx certbot python3-certbot-nginx
sudo useradd --system --home /var/lib/tienlo --shell /usr/sbin/nologin tienlo
sudo install -d -o tienlo -g tienlo -m 700 /var/lib/tienlo
sudo chmod -R a+rX /opt/tienlo
sudo install -m 600 /opt/tienlo/deploy/tienlo.env.example /etc/tienlo.env
sudo install -m 644 /opt/tienlo/deploy/tienlo.service /etc/systemd/system/tienlo.service
```

Nếu user `tienlo` đã tồn tại thì bỏ bước `useradd`. Sửa `/etc/tienlo.env`, đặt `TIENLO_ORIGIN=https://tienlo2d.xyz`. Origin phải đúng domain người chơi mở, không có dấu `/` cuối. Cookie Secure được bật khi origin HTTPS.

Sửa `server_name` trong `deploy/nginx.conf` thành domain thật, rồi:

```bash
sudo install -m 644 /opt/tienlo/deploy/nginx.conf /etc/nginx/sites-available/tienlo
sudo ln -s /etc/nginx/sites-available/tienlo /etc/nginx/sites-enabled/tienlo
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable --now tienlo
sudo systemctl reload nginx
sudo certbot --nginx -d tienlo2d.xyz --redirect
```

Nếu symlink đã tồn tại thì bỏ bước `ln -s`. Đăng ký và đăng nhập bằng HTTPS sau khi chứng chỉ được tạo. Backend chỉ nghe `127.0.0.1:8080`; không mở port 8080 ra Internet. Cho phép port 80/443 trong firewall và giữ SSH theo quy định VPS của bạn.

## Kiểm tra và vận hành

```bash
curl https://tienlo2d.xyz/api/health
sudo systemctl status tienlo
sudo journalctl -u tienlo -n 80 --no-pager
sudo -u tienlo python3 /opt/tienlo/deploy/backup.py
```

DB có bảng `users`, `sessions`, `characters`, `arena_visits`, dùng WAL và giao dịch. Một nhân vật/tài khoản; đăng nhập thiết bị mới thay phiên cũ. Hai lượt đấu trường mỗi tài khoản/ngày, reset theo giờ Việt Nam. Mật khẩu được hash scrypt với salt riêng; session cookie HttpOnly/SameSite, CSRF token dùng cho API ghi. Các lựa chọn này tham khảo [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) và [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Sao lưu bằng `backup.py` để bao gồm dữ liệu WAL đang được ghi; không chỉ copy riêng file `.sqlite3` khi server đang chạy. Copy backup ra ngoài VPS. Khi phục hồi: dừng service, giữ bản sao DB hiện tại, thay bằng backup rồi khởi động lại. Bản lưu nhân vật bền vững; người online, chat và trạng thái quái farm ở RAM, được tạo lại khi server restart.

## Giới hạn tải

Đồng bộ dùng HTTP polling khoảng 5 lần/giây, nội suy vị trí ở client. Bắt đầu với nhóm thử nghiệm nhỏ, theo dõi CPU/RAM và độ trễ; chưa có benchmark tải lớn. Backend Python chạy một process vì trạng thái online được giữ trong RAM. Không khởi chạy nhiều process hoặc nhiều replica trước khi tách trạng thái chung sang một dịch vụ world/Redis và chuyển transport sang WebSocket.

Bước tiếp theo cho phát hành rộng: server tự quản lý toàn bộ skill, mana/cooldown, quest, loot, mua/bán/trang bị; thêm khôi phục tài khoản/email, kiểm thử tải, metric và chống bot. Đây là công việc khác với việc đưa bản alpha này lên domain.
