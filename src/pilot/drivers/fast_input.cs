using System;
using System.Diagnostics;
using System.Drawing;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.Runtime.InteropServices;

public class FastInput {
    [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
    [DllImport("user32.dll", SetLastError = true)] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll", SetLastError = true)] public static extern bool OpenClipboard(IntPtr hWndNewOwner);
    [DllImport("user32.dll", SetLastError = true)] public static extern bool CloseClipboard();
    [DllImport("user32.dll", SetLastError = true)] public static extern bool EmptyClipboard();
    [DllImport("user32.dll", SetLastError = true)] public static extern IntPtr SetClipboardData(uint uFormat, IntPtr hMem);
    [DllImport("kernel32.dll", SetLastError = true)] public static extern IntPtr GlobalAlloc(uint uFlags, UIntPtr dwBytes);
    [DllImport("kernel32.dll", SetLastError = true)] public static extern IntPtr GlobalLock(IntPtr hMem);
    [DllImport("kernel32.dll", SetLastError = true)] public static extern bool GlobalUnlock(IntPtr hMem);

    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
    public const uint KEYEVENTF_KEYUP = 0x0002;
    public const byte VK_RETURN = 0x0D;
    public const byte VK_CONTROL = 0x11;
    public const byte VK_V = 0x56;
    public const uint WM_COMMAND = 0x0111;
    public const uint BM_CLICK = 0x00F5;
    public const uint WM_CLOSE = 0x0010;
    public const uint CF_UNICODETEXT = 13;
    public const uint GMEM_MOVEABLE = 0x0002;

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder str, int maxCount);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder str, int maxCount);
    [DllImport("user32.dll", SetLastError = true)] public static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);
    [DllImport("user32.dll")] public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool CloseDesktop(IntPtr hDesktop);
    [DllImport("user32.dll")] public static extern IntPtr FindWindowEx(IntPtr hwndParent, IntPtr hwndChildAfter, string lpszClass, string lpszWindow);

    public static void TryCloseDialog(IntPtr h, ref int dismissed) {
        if (h == IntPtr.Zero) return;
        StringBuilder sbTitle = new StringBuilder(256);
        GetWindowText(h, sbTitle, 256);
        string title = sbTitle.ToString();

        StringBuilder sbClass = new StringBuilder(256);
        GetClassName(h, sbClass, 256);
        string cls = sbClass.ToString();

        bool isOfficeError = (
            title.IndexOf("Microsoft Office Error", StringComparison.OrdinalIgnoreCase) >= 0 ||
            title.IndexOf("Office Error", StringComparison.OrdinalIgnoreCase) >= 0 ||
            (cls == "#32770" && title.IndexOf("Office", StringComparison.OrdinalIgnoreCase) >= 0)
        );

        if (isOfficeError) {
            SendMessage(h, WM_COMMAND, (IntPtr)1, IntPtr.Zero);
            SendMessage(h, WM_COMMAND, (IntPtr)2, IntPtr.Zero);
            SendMessage(h, WM_CLOSE, IntPtr.Zero, IntPtr.Zero);

            IntPtr btn = FindWindowEx(h, IntPtr.Zero, "Button", "OK");
            if (btn == IntPtr.Zero) btn = FindWindowEx(h, IntPtr.Zero, "Button", null);
            if (btn != IntPtr.Zero) {
                SendMessage(btn, BM_CLICK, IntPtr.Zero, IntPtr.Zero);
            }

            try {
                SetForegroundWindow(h);
                keybd_event(VK_RETURN, 0, 0, 0);
                Thread.Sleep(10);
                keybd_event(VK_RETURN, 0, KEYEVENTF_KEYUP, 0);
            } catch {}

            dismissed++;
        }
    }

    public static int DismissAnyOfficeErrorDialog() {
        int dismissed = 0;

        try {
            Process[] handlers = Process.GetProcessesByName("protocolhandler");
            foreach (Process p in handlers) {
                try { p.Kill(); dismissed++; } catch {}
            }
        } catch {}

        IntPtr hDirect = FindWindow(null, "Microsoft Office Error");
        if (hDirect != IntPtr.Zero) TryCloseDialog(hDirect, ref dismissed);

        try {
            int d = dismissed;
            EnumWindows((hWnd, lParam) => {
                TryCloseDialog(hWnd, ref d);
                return true;
            }, IntPtr.Zero);
            dismissed = d;
        } catch {}

        try {
            IntPtr hDesk = OpenDesktop("Default", 0, false, 0x0100 /* DESKTOP_ENUMERATE */);
            if (hDesk != IntPtr.Zero) {
                try {
                    int d = dismissed;
                    EnumDesktopWindows(hDesk, (hWnd, lParam) => {
                        TryCloseDialog(hWnd, ref d);
                        return true;
                    }, IntPtr.Zero);
                    dismissed = d;
                } finally {
                    CloseDesktop(hDesk);
                }
            }
        } catch {}

        return dismissed;
    }

    public static bool SetClipboardTextWin32(string text) {
        for (int i = 0; i < 15; i++) {
            if (OpenClipboard(IntPtr.Zero)) {
                try {
                    EmptyClipboard();
                    int byteCount = (text.Length + 1) * 2;
                    IntPtr hGlobal = GlobalAlloc(GMEM_MOVEABLE, (UIntPtr)byteCount);
                    if (hGlobal != IntPtr.Zero) {
                        IntPtr target = GlobalLock(hGlobal);
                        if (target != IntPtr.Zero) {
                            byte[] textBytes = Encoding.Unicode.GetBytes(text + "\0");
                            Marshal.Copy(textBytes, 0, target, textBytes.Length);
                            GlobalUnlock(hGlobal);
                            SetClipboardData(CF_UNICODETEXT, hGlobal);
                            return true;
                        }
                    }
                } finally {
                    CloseClipboard();
                }
            }
            Thread.Sleep(20);
        }
        return false;
    }

    [STAThread]
    public static void Main(string[] args) {
        if (args.Length == 0) return;
        string cmd = args[0].ToLower();

        try {
            if (cmd == "click") {
                if (args.Length >= 3) {
                    int x = int.Parse(args[1]);
                    int y = int.Parse(args[2]);
                    Cursor.Position = new Point(x, y);
                    Thread.Sleep(30);
                }
                mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                Thread.Sleep(30);
                mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                Console.WriteLine("OK");
            } else if ((cmd == "doubleclick" || cmd == "click2") && args.Length >= 3) {
                int x = int.Parse(args[1]);
                int y = int.Parse(args[2]);
                Cursor.Position = new Point(x, y);
                Thread.Sleep(30);
                mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                Thread.Sleep(30);
                mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                Thread.Sleep(60);
                mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                Thread.Sleep(30);
                mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                Console.WriteLine("OK");
            } else if (cmd == "move" && args.Length >= 3) {
                int x = int.Parse(args[1]);
                int y = int.Parse(args[2]);
                Cursor.Position = new Point(x, y);
                Console.WriteLine("OK");
            } else if (cmd == "getpos") {
                Point p = Cursor.Position;
                Console.WriteLine(p.X + "," + p.Y);
            } else if (cmd == "enter") {
                keybd_event(VK_RETURN, 0, 0, 0);
                Thread.Sleep(25);
                keybd_event(VK_RETURN, 0, KEYEVENTF_KEYUP, 0);
                Console.WriteLine("OK");
            } else if (cmd == "selectall" || (cmd == "hotkey" && args.Length >= 2 && (args[1].ToLower() == "^a" || args[1].ToLower() == "ctrl+a"))) {
                keybd_event(VK_CONTROL, 0, 0, 0);
                Thread.Sleep(20);
                keybd_event(0x41, 0, 0, 0);
                Thread.Sleep(25);
                keybd_event(0x41, 0, KEYEVENTF_KEYUP, 0);
                keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
                Console.WriteLine("OK");
            } else if (cmd == "hotkey" && args.Length >= 2) {
                string k = args[1].Trim().ToLower();
                if (k == "{enter}" || k == "enter" || k == "~") {
                    keybd_event(VK_RETURN, 0, 0, 0);
                    Thread.Sleep(25);
                    keybd_event(VK_RETURN, 0, KEYEVENTF_KEYUP, 0);
                    Console.WriteLine("OK");
                } else if (k == "^v" || k == "ctrl+v") {
                    keybd_event(VK_CONTROL, 0, 0, 0);
                    Thread.Sleep(20);
                    keybd_event(VK_V, 0, 0, 0);
                    Thread.Sleep(25);
                    keybd_event(VK_V, 0, KEYEVENTF_KEYUP, 0);
                    keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
                    Console.WriteLine("OK");
                } else if (k == "{esc}" || k == "esc" || k == "{escape}") {
                    keybd_event(0x1B, 0, 0, 0);
                    Thread.Sleep(25);
                    keybd_event(0x1B, 0, KEYEVENTF_KEYUP, 0);
                    Console.WriteLine("OK");
                } else if (k == "{tab}" || k == "tab") {
                    keybd_event(0x09, 0, 0, 0);
                    Thread.Sleep(25);
                    keybd_event(0x09, 0, KEYEVENTF_KEYUP, 0);
                    Console.WriteLine("OK");
                } else {
                    Console.WriteLine("UNSUPPORTED");
                }
            } else if ((cmd == "paste" || cmd == "type") && args.Length >= 2) {
                byte[] bytes = Convert.FromBase64String(args[1]);
                string text = Encoding.UTF8.GetString(bytes);
                bool success = SetClipboardTextWin32(text);
                if (success) {
                    Thread.Sleep(25);
                    keybd_event(VK_CONTROL, 0, 0, 0);
                    keybd_event(VK_V, 0, 0, 0);
                    Thread.Sleep(25);
                    keybd_event(VK_V, 0, KEYEVENTF_KEYUP, 0);
                    keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
                    Console.WriteLine("OK");
                } else {
                    Console.WriteLine("FAIL");
                }
            } else if (cmd == "dismiss_dialog") {
                int count = DismissAnyOfficeErrorDialog();
                if (count > 0) {
                    Console.WriteLine("DISMISSED:" + count);
                } else {
                    Console.WriteLine("NONE");
                }
            } else if (cmd == "kill_zombies") {
                int killed = 0;
                string[] targets = new string[] { "POWERPNT", "WINWORD", "EXCEL", "protocolhandler" };
                foreach (string name in targets) {
                    try {
                        Process[] procs = Process.GetProcessesByName(name);
                        foreach (Process p in procs) {
                            try {
                                if (name == "protocolhandler" || string.IsNullOrEmpty(p.MainWindowTitle)) {
                                    p.Kill();
                                    killed++;
                                }
                            } catch {}
                        }
                    } catch {}
                }
                Console.WriteLine("KILLED:" + killed);
            }
        } catch (Exception ex) {
            Console.Error.WriteLine("ERR:" + ex.Message);
        }
    }
}
