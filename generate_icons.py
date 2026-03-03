from PIL import Image, ImageDraw, ImageFont
import os
import math

# Output directory
OUTPUT_DIR = "/app/store_assets/icons"

# Verityn brand color
BRAND_BLUE = (37, 99, 235)  # #2563EB
DARK_BLUE = (29, 78, 216)   # #1D4ED8
WHITE = (255, 255, 255)

def create_verityn_icon(size, output_path, include_background=True):
    """Create Verityn app icon at specified size"""
    # Create image with white background
    img = Image.new('RGBA', (size, size), WHITE if include_background else (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Calculate dimensions relative to size
    padding = size * 0.12
    center = size / 2
    
    # Draw blue circle outline
    circle_radius = (size / 2) - padding
    circle_width = max(int(size * 0.04), 2)
    
    # Draw circle
    draw.ellipse(
        [center - circle_radius, center - circle_radius,
         center + circle_radius, center + circle_radius],
        outline=BRAND_BLUE,
        width=circle_width
    )
    
    # Draw "V" checkmark
    v_width = max(int(size * 0.07), 3)
    v_top = center - circle_radius * 0.45
    v_bottom = center + circle_radius * 0.45
    v_left = center - circle_radius * 0.4
    v_right = center + circle_radius * 0.4
    v_middle_x = center
    v_middle_y = v_bottom
    
    # Draw V shape with rounded caps
    draw.line([(v_left, v_top), (v_middle_x, v_middle_y)], fill=BRAND_BLUE, width=v_width)
    draw.line([(v_middle_x, v_middle_y), (v_right, v_top)], fill=BRAND_BLUE, width=v_width)
    
    # Draw rounded ends
    end_radius = v_width // 2
    draw.ellipse([v_left - end_radius, v_top - end_radius, 
                  v_left + end_radius, v_top + end_radius], fill=BRAND_BLUE)
    draw.ellipse([v_right - end_radius, v_top - end_radius,
                  v_right + end_radius, v_top + end_radius], fill=BRAND_BLUE)
    draw.ellipse([v_middle_x - end_radius, v_middle_y - end_radius,
                  v_middle_x + end_radius, v_middle_y + end_radius], fill=BRAND_BLUE)
    
    # Save
    img.save(output_path, 'PNG')
    print(f"Created: {output_path} ({size}x{size})")

# iOS Icon Sizes
ios_sizes = [
    (1024, "ios_appstore_1024.png"),  # App Store
    (180, "ios_iphone_180.png"),       # iPhone @3x
    (167, "ios_ipad_pro_167.png"),     # iPad Pro @2x
    (152, "ios_ipad_152.png"),         # iPad @2x
    (120, "ios_iphone_120.png"),       # iPhone @2x
    (87, "ios_settings_87.png"),       # Settings @3x
    (80, "ios_spotlight_80.png"),      # Spotlight @2x
    (76, "ios_ipad_76.png"),           # iPad @1x
    (60, "ios_iphone_60.png"),         # iPhone @1x
    (58, "ios_settings_58.png"),       # Settings @2x
    (40, "ios_spotlight_40.png"),      # Spotlight @1x
    (29, "ios_settings_29.png"),       # Settings @1x
    (20, "ios_notification_20.png"),   # Notification @1x
]

# Android Icon Sizes
android_sizes = [
    (512, "android_playstore_512.png"),  # Play Store
    (192, "android_xxxhdpi_192.png"),    # xxxhdpi
    (144, "android_xxhdpi_144.png"),     # xxhdpi
    (96, "android_xhdpi_96.png"),        # xhdpi
    (72, "android_hdpi_72.png"),         # hdpi
    (48, "android_mdpi_48.png"),         # mdpi
    (36, "android_ldpi_36.png"),         # ldpi
]

# Adaptive icon (Android foreground)
adaptive_sizes = [
    (432, "android_adaptive_foreground_432.png"),  # xxxhdpi
    (324, "android_adaptive_foreground_324.png"),  # xxhdpi
    (216, "android_adaptive_foreground_216.png"),  # xhdpi
    (162, "android_adaptive_foreground_162.png"),  # hdpi
    (108, "android_adaptive_foreground_108.png"),  # mdpi
]

print("=" * 50)
print("Generating iOS Icons")
print("=" * 50)
os.makedirs(f"{OUTPUT_DIR}/ios", exist_ok=True)
for size, filename in ios_sizes:
    create_verityn_icon(size, f"{OUTPUT_DIR}/ios/{filename}")

print("\n" + "=" * 50)
print("Generating Android Icons")
print("=" * 50)
os.makedirs(f"{OUTPUT_DIR}/android", exist_ok=True)
for size, filename in android_sizes:
    create_verityn_icon(size, f"{OUTPUT_DIR}/android/{filename}")

print("\n" + "=" * 50)
print("Generating Android Adaptive Icons")
print("=" * 50)
os.makedirs(f"{OUTPUT_DIR}/android/adaptive", exist_ok=True)
for size, filename in adaptive_sizes:
    create_verityn_icon(size, f"{OUTPUT_DIR}/android/adaptive/{filename}", include_background=False)

print("\n✅ All icons generated successfully!")
print(f"\nIcon files saved to: {OUTPUT_DIR}")
