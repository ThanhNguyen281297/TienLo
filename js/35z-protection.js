/* Bảo vệ lớp sâu: chặn chuột phải, F12, DevTools, xem nguồn, lưu trang.
   Chạy ngay khi game được tải lên. */
(function(){
  'use strict';

  // 1. Chặn hoàn toàn chuột phải trên toàn bộ trang web (capture phase - bắt sớm nhất)
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }, true);

  // 2. Chặn F12 và tổ hợp phím mở Developer Tools / xem nguồn / lưu trang
  document.addEventListener('keydown', function(e) {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
    // Ctrl + Shift + I (Inspect), J (Console), C (Chọn phần tử)
    if (e.ctrlKey && e.shiftKey &&
        (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67 ||
         e.key === 'I' || e.key === 'J' || e.key === 'C')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
    // Ctrl + U (Xem source code trang)
    if (e.ctrlKey && (e.keyCode === 85 || e.key === 'u')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
    // Ctrl + S (Lưu trang web về máy)
    if (e.ctrlKey && (e.keyCode === 83 || e.key === 's')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  // 3. Chặn chọn văn bản và kéo thả (làm sạch giao diện game, tránh kéo ảnh/code)
  document.addEventListener('selectstart', function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
  }, true);
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
  }, true);

  // 4. Làm mờ console nếu DevTools đã được mở trước khi script chạy
  try {
    var noop = function(){};
    console.log = noop;
    console.debug = noop;
    console.info = noop;
    console.warn = noop;
    console.error = noop;
    console.table = noop;
    console.trace = noop;
    console.dir = noop;
    console.dirxml = noop;
    console.group = noop;
    console.groupCollapsed = noop;
    console.groupEnd = noop;
    console.time = noop;
    console.timeEnd = noop;
    console.profile = noop;
    console.profileEnd = noop;
    console.count = noop;
    console.assert = noop;
    console.clear = noop;
    Object.defineProperty(window, 'console', {
      configurable: false,
      writable: false,
      value: console
    });
  } catch (err) {
    // Bỏ qua nếu môi trường không cho phép ghi đè console
  }
})();