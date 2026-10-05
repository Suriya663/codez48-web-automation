# Third-Party Licenses & Notices

## Koffi
- **License**: MIT License
- **Commercial Use**: Permitted under MIT License terms. Koffi is an ultra-fast native FFI (Foreign Function Interface) library for Node.js, used for zero-overhead Win32 `user32.GetCursorPos` and `SetCursorPos` cursor tracking.
- **Cross-Platform Behavior**: On non-Windows operating systems (macOS, Linux), `win32-cursor.js` safely catches loading errors when `user32.dll` is unavailable and throws `"cursor measurement unavailable"` or returns a fallback stub as required by fail-loudly compliance policies.
