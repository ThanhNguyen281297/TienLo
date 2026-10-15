# GitHub private → kiểm thử → tự cập nhật VPS

Repo: https://github.com/ThanhNguyen281297/TienLo (private). Nhánh phát hành: `main`.

Sau khi thiết lập một lần, luồng làm việc là:

```powershell
git add .
git commit -m "Mô tả thay đổi"
git push
```

GitHub Actions chạy kiểm thử backend, kiểm tra cú pháp JavaScript/Python/shell; nếu đạt sẽ đồng bộ bản code mới, restart `tienlo.service`, kiểm tra `/api/health`. Nếu health check thất bại, helper chuyển lại bản code trước và restart. Không cần upload thủ công hoặc tự restart nữa. Pull request chỉ chạy kiểm thử, không deploy.

Chỉnh file trên laptop chưa tự lên VPS cho đến khi commit/push. Điều này tránh phát hành lúc đang viết dở. Không thiết lập watcher tự commit mọi lần Save.

## 1. Cấp quyền Git trên laptop

Git Credential Manager cần đăng nhập tài khoản ThanhNguyen281297 một lần. Hoàn tất bước Device Activation/Authorize trong trình duyệt do Git mở; không gửi mật khẩu, OTP hay token vào chat. Repo đã được cấu hình làm remote `origin`.

## 2. Thiết lập VPS một lần

Gói `dist/tienlo-cicd-setup.zip` chỉ chứa helper và public key, không chứa private key/database. Upload ZIP qua SFTP MobaXterm vào `/root/`, rồi chạy trong SSH:

```bash
mkdir -p /root/tienlo-cicd
unzip -o /root/tienlo-cicd-setup.zip -d /root/tienlo-cicd
bash /root/tienlo-cicd/setup-cicd.sh /root/tienlo-cicd/actions.pub
```

Setup tạo user `tienlo-deploy` dùng SSH key, có quyền ghi release và gọi đúng helper activate; game vẫn chạy bằng user `tienlo`. Không cấp quyền root SSH cho Actions. Không sửa `/etc/tienlo.env`, drop-in port 18080, Nginx hoặc database. Helper root được cài tại `/usr/local/sbin/tienlo-activate`; khi sửa helper trong repo cần cài lại có chủ ý qua root, không để code đẩy lên tự thay helper đặc quyền.

Lần deploy đầu chuyển `/opt/tienlo` hiện tại thành bản bootstrap dự phòng và dùng symlink `/opt/tienlo` tới release mới. Các lần sau chuyển symlink nguyên tử. Có khoảng dừng khi restart backend; đây không phải mô hình zero-downtime. Các release cũ được giữ lại; theo dõi dung lượng và dọn có kiểm tra khi cần.

## 3. Thêm hai Actions secrets

Trong repo → Settings → Secrets and variables → Actions → New repository secret:

| Tên | Nội dung lấy trên laptop |
|---|---|
| `VPS_SSH_KEY` | Toàn bộ file `C:\Users\thanhnd\.ssh\tienlo_github_actions`, gồm BEGIN/END |
| `VPS_KNOWN_HOSTS` | File `C:\Users\thanhnd\.ssh\tienlo_known_hosts` |

Private key nằm ngoài thư mục source, không được commit, không gửi vào chat. Chỉ copy vào secret của đúng repo TienLo. Trước khi dùng host key, đối chiếu fingerprint với VPS:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_rsa_key.pub
```

Trên laptop:

```powershell
ssh-keygen -lf "$env:USERPROFILE\.ssh\tienlo_known_hosts"
```

Hai fingerprint phải giống nhau; không tắt StrictHostKeyChecking để vượt lỗi. SSH đích đã cấu hình `116.118.3.118`, port 22, user `tienlo-deploy`.

## 4. Push và kiểm tra

Push đầu tiên có đầy đủ asset nên lớn; lần sau Git chỉ gửi thay đổi. Actions dùng rsync và hardlink tới bản trước để chỉ truyền nội dung khác sang VPS và giảm trùng asset giữa release.

```powershell
git push -u origin main
```

Mở tab Actions của repo, kiểm tra job `test` và `deploy`. Khi thành công, reload trang game để tải JS/CSS có version mới. Không đóng gói hoặc ghi đè `/var/lib/tienlo/tienlo.sqlite3`; tài khoản, nhân vật và lượt đấu trường được giữ nguyên. Mỗi deploy tạo backup DB trước, tự rollback chỉ code; không tự phục hồi DB về quá khứ vì sẽ mất tiến trình mới.

Nếu secrets chưa được cấu hình, job deploy sẽ báo tên secret còn thiếu. Sau khi thêm đủ, chọn Re-run jobs hoặc push commit tiếp theo. Không cần đổi repo sang public.

## Khi có lỗi

```bash
sudo journalctl -u tienlo -n 60 --no-pager
readlink -f /opt/tienlo
sudo systemctl status tienlo --no-pager
```

Workflow không chạy `install-ubuntu.sh` khi cập nhật. Script đó dành cho cài mới; CI không được dùng nó để ghi đè cấu hình đang hoạt động. Với thay đổi schema DB không tương thích, cần kế hoạch migration/rollback riêng trước khi push main.

Tham khảo [GitHub Actions deployment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments) và [GitHub Actions secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).
