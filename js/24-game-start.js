/* Chỉ khởi động sau khi các module đã đăng ký renderer và combat. */
const seenErrors = new Set();
function showErr(error) {
  const message = String(error?.message || error).slice(0, 140);
  if (seenErrors.has(message) || seenErrors.size >= 3) return;
  seenErrors.add(message);
  let banner = $('dbg');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'dbg';
    banner.style.cssText = 'position:fixed;left:8px;right:8px;top:calc(210px + env(safe-area-inset-top,0px));z-index:20;font:11px monospace;color:#ff9a8a;background:rgba(0,0,0,.75);padding:6px;pointer-events:none;white-space:pre-wrap';
    document.body.appendChild(banner);
  }
  banner.textContent += 'Lỗi: ' + message + ' | ' + W + '×' + H + ' Z' + Z + '\n';
  console.error(error);
}
requestAnimationFrame(previewCharacter);
requestAnimationFrame(tick);
