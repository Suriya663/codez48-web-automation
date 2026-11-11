<#
.SYNOPSIS
    Codez48 Pilot - 3D Cursor-Following AI Companion & Status HUD Overlay
    Hardware-accelerated WPF Topmost Transparent Click-Through Layered Window.
    Features:
    - Single Instance Enforcement: Named OS Mutex and prior process deduplication
    - 3D Spherical AI Avatar following mouse cursor (+8px, +6px)
    - Eye-Originating Loading Animation: Concentric cyan pulse ripples expanding from eyes
    - Continuous Natural Blinking across all states including loading
    - Fluid Mouth Movements and Expressions without awkward angles
    - Thinking Thought Process Display: Full text-wrapping, 100% visible
    - Viewport Collision & Auto-Lowering: If cursor is near top of screen (Y < 190), drops down
      lower so thoughts are completely visible and never cut off off-screen
    - Glassmorphic status pill displaying live task & state text
    - Full click-through transparency (WS_EX_TRANSPARENT | WS_EX_LAYERED)
    - Real-time IPC via standard input JSON stream
#>

param(
    [string]$InitialState = 'idle',
    [string]$InitialText = 'Codez48 Pilot Active'
)

$ErrorActionPreference = 'SilentlyContinue'

# --- STRICT SINGLETON ENFORCEMENT ---
$myPid = $PID
Get-Process -Name powershell, pwsh -ErrorAction SilentlyContinue | Where-Object {
    $_.Id -ne $myPid -and $_.MainWindowTitle -eq 'Codez48PilotHUD'
} | Stop-Process -Force -ErrorAction SilentlyContinue

$createdNew = $false
$hudMutex = New-Object System.Threading.Mutex($true, "Global\Codez48PilotHUD_Singleton_Mutex", [ref]$createdNew)
if (-not $createdNew) {
    # Another instance is already active
    exit 0
}

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms, System.Drawing

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class NativeOverlayMethods {
    [DllImport("user32.dll", SetLastError=true)]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", SetLastError=true)]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    public const int GWL_EXSTYLE = -20;
    public const int WS_EX_TRANSPARENT = 0x00000020;
    public const int WS_EX_LAYERED = 0x00080000;
    public const int WS_EX_TOOLWINDOW = 0x00000080;
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_NOACTIVATE = 0x0010;
    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
}
"@

# XAML UI Definition with 3D Robot Avatar, Blinking Eyes, Eye Loading Waves, and Auto-Wrapping Text
[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Codez48PilotHUD"
        WindowStyle="None"
        AllowsTransparency="True"
        Background="Transparent"
        Topmost="True"
        ShowInTaskbar="False"
        Width="520"
        Height="76"
        WindowStartupLocation="Manual">
    <Window.Resources>
        <!-- Natural Blinking Storyboard -->
        <Storyboard x:Key="BlinkAnimation" RepeatBehavior="Forever">
            <DoubleAnimationUsingKeyFrames Storyboard.TargetName="LeftEyeScale" Storyboard.TargetProperty="ScaleY" Duration="0:0:3.5">
                <LinearDoubleKeyFrame Value="1.0" KeyTime="0:0:3.0"/>
                <LinearDoubleKeyFrame Value="0.08" KeyTime="0:0:3.15"/>
                <LinearDoubleKeyFrame Value="1.0" KeyTime="0:0:3.3"/>
            </DoubleAnimationUsingKeyFrames>
            <DoubleAnimationUsingKeyFrames Storyboard.TargetName="RightEyeScale" Storyboard.TargetProperty="ScaleY" Duration="0:0:3.5">
                <LinearDoubleKeyFrame Value="1.0" KeyTime="0:0:3.0"/>
                <LinearDoubleKeyFrame Value="0.08" KeyTime="0:0:3.15"/>
                <LinearDoubleKeyFrame Value="1.0" KeyTime="0:0:3.3"/>
            </DoubleAnimationUsingKeyFrames>
        </Storyboard>

        <!-- Eye-Originating Loading Pulse Waves -->
        <Storyboard x:Key="EyeRippleAnimation" RepeatBehavior="Forever">
            <DoubleAnimation Storyboard.TargetName="LeftRippleScale" Storyboard.TargetProperty="ScaleX" From="0.6" To="2.6" Duration="0:0:1.3"/>
            <DoubleAnimation Storyboard.TargetName="LeftRippleScale" Storyboard.TargetProperty="ScaleY" From="0.6" To="2.6" Duration="0:0:1.3"/>
            <DoubleAnimation Storyboard.TargetName="LeftEyeRipple" Storyboard.TargetProperty="Opacity" From="1.0" To="0.0" Duration="0:0:1.3"/>

            <DoubleAnimation Storyboard.TargetName="RightRippleScale" Storyboard.TargetProperty="ScaleX" From="0.6" To="2.6" Duration="0:0:1.3"/>
            <DoubleAnimation Storyboard.TargetName="RightRippleScale" Storyboard.TargetProperty="ScaleY" From="0.6" To="2.6" Duration="0:0:1.3"/>
            <DoubleAnimation Storyboard.TargetName="RightEyeRipple" Storyboard.TargetProperty="Opacity" From="1.0" To="0.0" Duration="0:0:1.3"/>
        </Storyboard>

        <Storyboard x:Key="HaloPulse" RepeatBehavior="Forever" AutoReverse="True">
            <DoubleAnimation Storyboard.TargetName="OuterHalo" Storyboard.TargetProperty="Opacity" From="0.75" To="1.0" Duration="0:0:1.4"/>
            <DoubleAnimation Storyboard.TargetName="AvatarScale" Storyboard.TargetProperty="ScaleX" From="1.0" To="1.03" Duration="0:0:1.4"/>
            <DoubleAnimation Storyboard.TargetName="AvatarScale" Storyboard.TargetProperty="ScaleY" From="1.0" To="1.03" Duration="0:0:1.4"/>
        </Storyboard>

        <Storyboard x:Key="DotsAnimation" RepeatBehavior="Forever">
            <DoubleAnimation Storyboard.TargetName="Dot1" Storyboard.TargetProperty="Opacity" From="0.2" To="1.0" AutoReverse="True" Duration="0:0:0.6" BeginTime="0:0:0.0"/>
            <DoubleAnimation Storyboard.TargetName="Dot2" Storyboard.TargetProperty="Opacity" From="0.2" To="1.0" AutoReverse="True" Duration="0:0:0.6" BeginTime="0:0:0.2"/>
            <DoubleAnimation Storyboard.TargetName="Dot3" Storyboard.TargetProperty="Opacity" From="0.2" To="1.0" AutoReverse="True" Duration="0:0:0.6" BeginTime="0:0:0.4"/>
        </Storyboard>

        <Storyboard x:Key="SpinOrbit" RepeatBehavior="Forever">
            <DoubleAnimation Storyboard.TargetName="OrbitRotate" Storyboard.TargetProperty="Angle" From="0" To="360" Duration="0:0:1.8"/>
        </Storyboard>
    </Window.Resources>

    <Grid VerticalAlignment="Top" HorizontalAlignment="Left" Margin="0,2,0,0">
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="74"/>
            <ColumnDefinition Width="Auto"/>
        </Grid.ColumnDefinitions>

        <!-- 3D ROBOT AI AVATAR MATCHING OFFICIAL REFERENCE SPEC -->
        <Canvas Grid.Column="0" Width="68" Height="68" Margin="0,0,0,0">
            <Canvas.RenderTransform>
                <ScaleTransform x:Name="AvatarScale" CenterX="34" CenterY="34"/>
            </Canvas.RenderTransform>

            <!-- Outer Neon Glowing Ring -->
            <Ellipse x:Name="OuterHalo" Width="62" Height="62" Canvas.Left="3" Canvas.Top="3"
                     Stroke="#FF00E5FF" StrokeThickness="2.2">
                <Ellipse.Effect>
                    <DropShadowEffect Color="#00E5FF" BlurRadius="14" ShadowDepth="0" Opacity="0.95"/>
                </Ellipse.Effect>
            </Ellipse>

            <!-- Rotating Loading Crescent Arc (Thinking / Loading / Generating) -->
            <Path x:Name="OrbitRing" Canvas.Left="3" Canvas.Top="3"
                  Stroke="#FFFFFFFF" StrokeThickness="3.2" StrokeStartLineCap="Round" StrokeEndLineCap="Round"
                  Data="M 31,2 A 29,29 0 0 1 60,31" Visibility="Collapsed">
                <Path.Effect>
                    <DropShadowEffect Color="#00F5FF" BlurRadius="12" ShadowDepth="0" Opacity="1.0"/>
                </Path.Effect>
                <Path.RenderTransform>
                    <RotateTransform x:Name="OrbitRotate" CenterX="28" CenterY="28"/>
                </Path.RenderTransform>
            </Path>

            <!-- Top Antenna Stem -->
            <Rectangle Width="3" Height="7" Canvas.Left="32.5" Canvas.Top="4" Fill="#FFD8E4F8" RadiusX="1" RadiusY="1"/>

            <!-- Top Antenna Glowing Orb -->
            <Ellipse x:Name="AntennaOrb" Width="8" Height="8" Canvas.Left="30" Canvas.Top="0" Fill="#FF00F5FF">
                <Ellipse.Effect>
                    <DropShadowEffect Color="#00F5FF" BlurRadius="10" ShadowDepth="0" Opacity="1.0"/>
                </Ellipse.Effect>
            </Ellipse>

            <!-- Left Ear-Pod Headphone -->
            <Rectangle Width="5.5" Height="14" Canvas.Left="4" Canvas.Top="25" Fill="#FFE5EEF8" RadiusX="2.5" RadiusY="2.5"/>
            <Ellipse Width="3" Height="7" Canvas.Left="5.5" Canvas.Top="28.5" Fill="#FF00E5FF"/>

            <!-- Right Ear-Pod Headphone -->
            <Rectangle Width="5.5" Height="14" Canvas.Left="58.5" Canvas.Top="25" Fill="#FFE5EEF8" RadiusX="2.5" RadiusY="2.5"/>
            <Ellipse Width="3" Height="7" Canvas.Left="59.5" Canvas.Top="28.5" Fill="#FF00E5FF"/>

            <!-- Glossy White Robot Helmet -->
            <Ellipse Width="48" Height="44" Canvas.Left="10" Canvas.Top="10">
                <Ellipse.Fill>
                    <RadialGradientBrush Center="0.32,0.22" GradientOrigin="0.25,0.18" RadiusX="0.8" RadiusY="0.8">
                        <GradientStop Color="#FFFFFFFF" Offset="0.0"/>
                        <GradientStop Color="#FFF0F6FF" Offset="0.35"/>
                        <GradientStop Color="#FFD4E2F5" Offset="0.75"/>
                        <GradientStop Color="#FF90B2DF" Offset="1.0"/>
                    </RadialGradientBrush>
                </Ellipse.Fill>
                <Ellipse.Effect>
                    <DropShadowEffect Color="#0077FE" BlurRadius="8" ShadowDepth="0" Opacity="0.5"/>
                </Ellipse.Effect>
            </Ellipse>

            <!-- Dark Curved Visor Screen -->
            <Ellipse Width="36" Height="28" Canvas.Left="16" Canvas.Top="18">
                <Ellipse.Fill>
                    <LinearGradientBrush StartPoint="0,0" EndPoint="0,1">
                        <GradientStop Color="#FF060C1D" Offset="0.0"/>
                        <GradientStop Color="#FF0A1633" Offset="0.6"/>
                        <GradientStop Color="#FF0D2048" Offset="1.0"/>
                    </LinearGradientBrush>
                </Ellipse.Fill>
            </Ellipse>

            <!-- EYE-ORIGINATING LOADING RIPPLES (Concentric radiant pulses) -->
            <Canvas x:Name="EyeLoadingGroup" Canvas.Left="0" Canvas.Top="0" Visibility="Collapsed">
                <Ellipse x:Name="LeftEyeRipple" Width="14" Height="14" Canvas.Left="18.5" Canvas.Top="23"
                         Stroke="#FF00F5FF" StrokeThickness="1.5">
                    <Ellipse.RenderTransform>
                        <ScaleTransform x:Name="LeftRippleScale" CenterX="7" CenterY="7"/>
                    </Ellipse.RenderTransform>
                    <Ellipse.Effect>
                        <DropShadowEffect Color="#00F5FF" BlurRadius="8" ShadowDepth="0" Opacity="0.85"/>
                    </Ellipse.Effect>
                </Ellipse>
                <Ellipse x:Name="RightEyeRipple" Width="14" Height="14" Canvas.Left="35.5" Canvas.Top="23"
                         Stroke="#FF00F5FF" StrokeThickness="1.5">
                    <Ellipse.RenderTransform>
                        <ScaleTransform x:Name="RightRippleScale" CenterX="7" CenterY="7"/>
                    </Ellipse.RenderTransform>
                    <Ellipse.Effect>
                        <DropShadowEffect Color="#00F5FF" BlurRadius="8" ShadowDepth="0" Opacity="0.85"/>
                    </Ellipse.Effect>
                </Ellipse>
            </Canvas>

            <!-- Open Glowing Eyes with Natural Blinking (Active across ALL states) -->
            <Canvas x:Name="OpenEyesGroup" Canvas.Left="0" Canvas.Top="0">
                <!-- Left Eye -->
                <Canvas Canvas.Left="21" Canvas.Top="24" Width="9" Height="12">
                    <Canvas.RenderTransform>
                        <ScaleTransform x:Name="LeftEyeScale" CenterX="4.5" CenterY="6"/>
                    </Canvas.RenderTransform>
                    <Ellipse Width="9" Height="12" Fill="#FF00F5FF">
                        <Ellipse.Effect>
                            <DropShadowEffect Color="#00F5FF" BlurRadius="8" ShadowDepth="0" Opacity="0.9"/>
                        </Ellipse.Effect>
                    </Ellipse>
                    <Ellipse Width="4.5" Height="6" Canvas.Left="2" Canvas.Top="3" Fill="#FF051226"/>
                    <Ellipse Width="2.5" Height="2.5" Canvas.Left="2" Canvas.Top="2.5" Fill="#FFFFFFFF"/>
                    <Ellipse Width="1.2" Height="1.2" Canvas.Left="5.5" Canvas.Top="7" Fill="#FFFFFFFF"/>
                </Canvas>

                <!-- Right Eye -->
                <Canvas Canvas.Left="38" Canvas.Top="24" Width="9" Height="12">
                    <Canvas.RenderTransform>
                        <ScaleTransform x:Name="RightEyeScale" CenterX="4.5" CenterY="6"/>
                    </Canvas.RenderTransform>
                    <Ellipse Width="9" Height="12" Fill="#FF00F5FF">
                        <Ellipse.Effect>
                            <DropShadowEffect Color="#00F5FF" BlurRadius="8" ShadowDepth="0" Opacity="0.9"/>
                        </Ellipse.Effect>
                    </Ellipse>
                    <Ellipse Width="4.5" Height="6" Canvas.Left="2" Canvas.Top="3" Fill="#FF051226"/>
                    <Ellipse Width="2.5" Height="2.5" Canvas.Left="2" Canvas.Top="2.5" Fill="#FFFFFFFF"/>
                    <Ellipse Width="1.2" Height="1.2" Canvas.Left="5.5" Canvas.Top="7" Fill="#FFFFFFFF"/>
                </Canvas>
            </Canvas>

            <!-- Fluid Smiling Mouth -->
            <Path x:Name="MouthPath" Canvas.Left="28" Canvas.Top="36"
                  Stroke="#FF00F5FF" StrokeThickness="2.0" StrokeStartLineCap="Round" StrokeEndLineCap="Round"
                  Data="M 0,0 Q 6,5 12,0">
                <Path.Effect>
                    <DropShadowEffect Color="#00F5FF" BlurRadius="6" ShadowDepth="0" Opacity="0.9"/>
                </Path.Effect>
            </Path>

            <!-- Snug Upper-Right Message Pill (• • •) -->
            <Border x:Name="DockedBubblePill" Canvas.Left="46" Canvas.Top="2"
                    Background="#F00A1C4E" BorderBrush="#FF00E5FF" BorderThickness="1.2"
                    CornerRadius="10" Padding="5,2,5,2">
                <Border.Effect>
                    <DropShadowEffect Color="#00E5FF" BlurRadius="8" ShadowDepth="0" Opacity="0.8"/>
                </Border.Effect>
                <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                    <Ellipse x:Name="Dot1" Width="4" Height="4" Fill="#FFFFFFFF" Margin="1,0"/>
                    <Ellipse x:Name="Dot2" Width="4" Height="4" Fill="#FFFFFFFF" Margin="1,0"/>
                    <Ellipse x:Name="Dot3" Width="4" Height="4" Fill="#FFFFFFFF" Margin="1,0"/>
                </StackPanel>
            </Border>
        </Canvas>

        <!-- SNUG COMPACT STATUS & OPTIONS (Auto-wrapping, never clipped) -->
        <Border Grid.Column="1" x:Name="StatusBadge"
                Background="#F2081538"
                BorderBrush="#B000E5FF"
                BorderThickness="1.2"
                CornerRadius="14"
                Padding="10,6,12,6"
                VerticalAlignment="Center"
                Margin="3,0,0,0">
            <Border.Effect>
                <DropShadowEffect Color="#000000" BlurRadius="16" ShadowDepth="2" Opacity="0.85"/>
            </Border.Effect>

            <StackPanel Orientation="Vertical">
                <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                    <TextBlock x:Name="StateBadgeText" Text="AI READY"
                               FontFamily="Segoe UI" FontSize="9.5" FontWeight="Black"
                               Foreground="#FF00E5FF" Margin="0,0,6,0"/>
                    <TextBlock x:Name="StatusDetailText" Text="Codez48 Pilot"
                               FontFamily="Segoe UI" FontSize="11" FontWeight="SemiBold"
                               Foreground="#FFE8F4FF" TextWrapping="Wrap" MaxWidth="380"
                               LineHeight="15"/>
                </StackPanel>
            </StackPanel>
        </Border>
    </Grid>
</Window>
"@

$reader = (New-Object System.Xml.XmlNodeReader $xaml)
$window = [System.Windows.Markup.XamlReader]::Load($reader)

# Retrieve named elements
$outerHalo = $window.FindName('OuterHalo')
$orbitRing = $window.FindName('OrbitRing')
$orbitRotate = $window.FindName('OrbitRotate')
$leftEyeScale = $window.FindName('LeftEyeScale')
$rightEyeScale = $window.FindName('RightEyeScale')
$openEyesGroup = $window.FindName('OpenEyesGroup')
$eyeLoadingGroup = $window.FindName('EyeLoadingGroup')
$mouthPath = $window.FindName('MouthPath')
$statusBadge = $window.FindName('StatusBadge')
$stateBadgeText = $window.FindName('StateBadgeText')
$statusDetailText = $window.FindName('StatusDetailText')
$dot1 = $window.FindName('Dot1')
$dot2 = $window.FindName('Dot2')
$dot3 = $window.FindName('Dot3')

# Start Storyboard Animations
$blinkAnim = $window.Resources['BlinkAnimation']
$haloAnim = $window.Resources['HaloPulse']
$dotsAnim = $window.Resources['DotsAnimation']
$spinAnim = $window.Resources['SpinOrbit']
$eyeRippleAnim = $window.Resources['EyeRippleAnimation']

$blinkAnim.Begin($window)
$haloAnim.Begin($window)
$dotsAnim.Begin($window)
$spinAnim.Begin($window)

# Make Click-Through via Win32 extended styles and set immediate snug cursor alignment
$window.Add_SourceInitialized({
    $hwnd = (New-Object System.Windows.Interop.WindowInteropHelper($window)).Handle
    $extendedStyle = [NativeOverlayMethods]::GetWindowLong($hwnd, [NativeOverlayMethods]::GWL_EXSTYLE)
    $newStyle = $extendedStyle -bor [NativeOverlayMethods]::WS_EX_TRANSPARENT -bor [NativeOverlayMethods]::WS_EX_LAYERED -bor [NativeOverlayMethods]::WS_EX_TOOLWINDOW
    [NativeOverlayMethods]::SetWindowLong($hwnd, [NativeOverlayMethods]::GWL_EXSTYLE, $newStyle)
    [NativeOverlayMethods]::SetWindowPos($hwnd, [NativeOverlayMethods]::HWND_TOPMOST, 0, 0, 0, 0,
        [NativeOverlayMethods]::SWP_NOMOVE -bor [NativeOverlayMethods]::SWP_NOSIZE -bor [NativeOverlayMethods]::SWP_NOACTIVATE)

    # Immediately dock right next to current cursor position on start (zero initial jump or lag)
    $initPos = [System.Windows.Forms.Cursor]::Position
    $window.Left = $initPos.X + 6
    $window.Top = $initPos.Y + 4
})

# Release mutex when window closes
$window.Add_Closed({
    try { $hudMutex.ReleaseMutex() } catch {}
})

# Cursor Follow Timer (60 FPS = 16ms)
$cursorTimer = New-Object System.Windows.Threading.DispatcherTimer
$cursorTimer.Interval = [TimeSpan]::FromMilliseconds(16)
$cursorTimer.Add_Tick({
    $pos = [System.Windows.Forms.Cursor]::Position
    $screenBounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds

    # Snug offset from cursor: directly adjacent to cursor tip and icons (+6px, +4px)
    $targetX = $pos.X + 6
    $targetY = $pos.Y + 4

    # Prevent overflowing right and bottom screen bounds
    if ($targetX + $window.Width -gt $screenBounds.Width) {
        $targetX = [Math]::Max(0, $pos.X - $window.Width - 6)
    }
    if ($targetY + $window.Height -gt $screenBounds.Height) {
        $targetY = [Math]::Max(0, $pos.Y - $window.Height - 4)
    }

    $window.Left = $targetX
    $window.Top = $targetY
})
$cursorTimer.Start()

# State Manager Script Block
function Update-PilotState {
    param(
        [string]$State,
        [string]$Text
    )

    $window.Dispatcher.Invoke([Action]{
        if ($Text) {
            $statusDetailText.Text = $Text
        }

        switch ($State.ToLower()) {
            'thinking' {
                $stateBadgeText.Text = 'THINKING'
                $stateBadgeText.Foreground = [System.Windows.Media.Brushes]::Cyan
                $statusBadge.BorderBrush = (New-Object System.Windows.Media.SolidColorBrush([System.Windows.Media.Color]::FromArgb(140, 0, 240, 255)))
                $orbitRing.Visibility = [System.Windows.Visibility]::Visible
                
                # Eye-originating loading animation & continuous blinking
                $openEyesGroup.Visibility = [System.Windows.Visibility]::Visible
                $eyeLoadingGroup.Visibility = [System.Windows.Visibility]::Visible
                $eyeRippleAnim.Begin($window)

                # Focused gentle smile
                $mouthPath.Data = [System.Windows.Media.Geometry]::Parse('M 0,0 Q 6,5 12,0')
            }
            'loading' {
                $stateBadgeText.Text = 'LOADING'
                $stateBadgeText.Foreground = [System.Windows.Media.Brushes]::Cyan
                $statusBadge.BorderBrush = (New-Object System.Windows.Media.SolidColorBrush([System.Windows.Media.Color]::FromArgb(140, 0, 240, 255)))
                $orbitRing.Visibility = [System.Windows.Visibility]::Visible
                
                # Eye-originating loading animation & continuous blinking
                $openEyesGroup.Visibility = [System.Windows.Visibility]::Visible
                $eyeLoadingGroup.Visibility = [System.Windows.Visibility]::Visible
                $eyeRippleAnim.Begin($window)

                # Focused gentle smile
                $mouthPath.Data = [System.Windows.Media.Geometry]::Parse('M 0,0 Q 6,5 12,0')
            }
            'generating' {
                $stateBadgeText.Text = 'GENERATING'
                $stateBadgeText.Foreground = (New-Object System.Windows.Media.SolidColorBrush([System.Windows.Media.Color]::FromRgb(168, 85, 247)))
                $statusBadge.BorderBrush = (New-Object System.Windows.Media.SolidColorBrush([System.Windows.Media.Color]::FromArgb(140, 168, 85, 247)))
                $orbitRing.Visibility = [System.Windows.Visibility]::Visible
                $openEyesGroup.Visibility = [System.Windows.Visibility]::Visible
                $eyeLoadingGroup.Visibility = [System.Windows.Visibility]::Collapsed
                $mouthPath.Data = [System.Windows.Media.Geometry]::Parse('M 0,0 Q 6,6 12,0')
            }
            'acting' {
                $stateBadgeText.Text = 'AUTOMATING'
                $stateBadgeText.Foreground = (New-Object System.Windows.Media.SolidColorBrush([System.Windows.Media.Color]::FromRgb(16, 185, 129)))
                $statusBadge.BorderBrush = (New-Object System.Windows.Media.SolidColorBrush([System.Windows.Media.Color]::FromArgb(140, 16, 185, 129)))
                $orbitRing.Visibility = [System.Windows.Visibility]::Collapsed
                $openEyesGroup.Visibility = [System.Windows.Visibility]::Visible
                $eyeLoadingGroup.Visibility = [System.Windows.Visibility]::Collapsed
                $mouthPath.Data = [System.Windows.Media.Geometry]::Parse('M 0,0 Q 6,6 12,0')
            }
            'smile' {
                $mouthPath.Data = [System.Windows.Media.Geometry]::Parse('M 0,0 Q 6,7 12,0')
            }
            'success' {
                $stateBadgeText.Text = 'COMPLETED'
                $stateBadgeText.Foreground = (New-Object System.Windows.Media.SolidColorBrush([System.Windows.Media.Color]::FromRgb(52, 211, 153)))
                $statusBadge.BorderBrush = (New-Object System.Windows.Media.SolidColorBrush([System.Windows.Media.Color]::FromArgb(160, 52, 211, 153)))
                $orbitRing.Visibility = [System.Windows.Visibility]::Collapsed
                $openEyesGroup.Visibility = [System.Windows.Visibility]::Visible
                $eyeLoadingGroup.Visibility = [System.Windows.Visibility]::Collapsed
                $mouthPath.Data = [System.Windows.Media.Geometry]::Parse('M 0,0 Q 6,7 12,0')
            }
            default {
                $stateBadgeText.Text = 'AI READY'
                $stateBadgeText.Foreground = [System.Windows.Media.Brushes]::Cyan
                $statusBadge.BorderBrush = (New-Object System.Windows.Media.SolidColorBrush([System.Windows.Media.Color]::FromArgb(100, 0, 229, 255)))
                $orbitRing.Visibility = [System.Windows.Visibility]::Collapsed
                $openEyesGroup.Visibility = [System.Windows.Visibility]::Visible
                $eyeLoadingGroup.Visibility = [System.Windows.Visibility]::Collapsed
                $mouthPath.Data = [System.Windows.Media.Geometry]::Parse('M 0,0 Q 6,5 12,0')
            }
        }
    })
}

# Apply Initial State
Update-PilotState -State $InitialState -Text $InitialText

# Background Thread for Stdin JSON IPC Stream
$stdinJob = [System.Threading.Tasks.Task]::Run([Action]{
    try {
        $reader = [System.IO.StreamReader]::new([System.Console]::OpenStandardInput())
        while (-not $reader.EndOfStream) {
            $line = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($line)) { continue }

            try {
                $payload = $line | ConvertFrom-Json
                if ($payload.action -eq 'set_state') {
                    Update-PilotState -State $payload.state -Text $payload.text
                }
                elseif ($payload.action -eq 'hide') {
                    $window.Dispatcher.Invoke([Action]{
                        $window.Close()
                    })
                    break
                }
            } catch {}
        }
    } catch {}
})

# Show the window and run the WPF Application message pump
$app = New-Object System.Windows.Application
$app.Run($window)
