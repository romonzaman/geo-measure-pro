#!/usr/bin/env python3
"""
Generate app icons for GPS Measurement Pro
Creates icons with a GPS location pin and ruler/measurement tool design
"""

from PIL import Image, ImageDraw, ImageFont
import os
import sys

# Android mipmap sizes (in pixels)
ANDROID_SIZES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

def create_icon(size):
    """Create an icon with GPS location pin and ruler design"""
    # Create a transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors
    pin_color = '#2196F3'  # Blue for GPS pin
    ruler_color = '#4CAF50'  # Green for measurement
    shadow_color = '#00000040'  # Semi-transparent black
    
    center_x = size // 2
    center_y = size // 2
    
    # Draw GPS location pin (teardrop shape)
    pin_size = int(size * 0.4)
    pin_bottom_y = center_y + int(size * 0.15)
    
    # Pin shadow (slightly offset)
    shadow_offset = max(2, size // 48)
    draw.ellipse([
        center_x - pin_size // 2 + shadow_offset,
        pin_bottom_y - pin_size + shadow_offset,
        center_x + pin_size // 2 + shadow_offset,
        pin_bottom_y + shadow_offset
    ], fill=shadow_color)
    
    # Main pin circle
    draw.ellipse([
        center_x - pin_size // 2,
        pin_bottom_y - pin_size,
        center_x + pin_size // 2,
        pin_bottom_y
    ], fill=pin_color)
    
    # Pin point (triangle at bottom)
    triangle_size = pin_size // 2
    pin_points = [
        (center_x, pin_bottom_y + triangle_size),
        (center_x - triangle_size // 2, pin_bottom_y),
        (center_x + triangle_size // 2, pin_bottom_y),
    ]
    draw.polygon(pin_points, fill=pin_color)
    
    # Inner circle for pin accent
    inner_size = int(pin_size * 0.5)
    draw.ellipse([
        center_x - inner_size // 2,
        pin_bottom_y - pin_size + pin_size // 4 - inner_size // 2,
        center_x + inner_size // 2,
        pin_bottom_y - pin_size + pin_size // 4 + inner_size // 2
    ], fill='#FFFFFF')
    
    # Draw ruler/measurement tool (horizontal line with markings)
    ruler_length = int(size * 0.7)
    ruler_width = max(2, size // 24)
    ruler_y = center_y - int(size * 0.25)
    ruler_x_start = center_x - ruler_length // 2
    ruler_x_end = center_x + ruler_length // 2
    
    # Ruler shadow
    draw.rectangle([
        ruler_x_start + shadow_offset,
        ruler_y - ruler_width // 2 + shadow_offset,
        ruler_x_end + shadow_offset,
        ruler_y + ruler_width // 2 + shadow_offset
    ], fill=shadow_color)
    
    # Ruler body
    draw.rectangle([
        ruler_x_start,
        ruler_y - ruler_width // 2,
        ruler_x_end,
        ruler_y + ruler_width // 2
    ], fill=ruler_color)
    
    # Ruler markings (hash marks)
    num_marks = 5
    mark_height = max(2, size // 16)
    for i in range(num_marks):
        mark_x = ruler_x_start + (ruler_length // (num_marks - 1)) * i
        draw.line([
            (mark_x, ruler_y - ruler_width // 2 - mark_height),
            (mark_x, ruler_y + ruler_width // 2 + mark_height)
        ], fill='#FFFFFF', width=max(1, size // 48))
    
    # Add a small "M" or measurement symbol in the center of ruler (if size allows)
    if size >= 96:
        try:
            # Try to use a built-in font
            font_size = max(8, size // 12)
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
        except:
            try:
                font = ImageFont.truetype("Arial.ttf", font_size)
            except:
                font = ImageFont.load_default()
        
        # Draw "M" for Measurement
        text = "M"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        draw.text(
            (center_x - text_width // 2, ruler_y - text_height // 2),
            text,
            fill='#FFFFFF',
            font=font
        )
    
    return img

def generate_android_icons():
    """Generate icons for all Android mipmap densities"""
    base_path = 'android/app/src/main/res'
    
    for mipmap_folder, size in ANDROID_SIZES.items():
        folder_path = os.path.join(base_path, mipmap_folder)
        
        # Create folder if it doesn't exist
        os.makedirs(folder_path, exist_ok=True)
        
        # Generate regular icon
        icon = create_icon(size)
        icon.save(os.path.join(folder_path, 'ic_launcher.png'))
        
        # Generate round icon (same design, will be masked by Android)
        round_icon = create_icon(size)
        round_icon.save(os.path.join(folder_path, 'ic_launcher_round.png'))
        
        print(f"Generated {mipmap_folder}/ic_launcher.png ({size}x{size})")
        print(f"Generated {mipmap_folder}/ic_launcher_round.png ({size}x{size})")

if __name__ == '__main__':
    print("Generating GPS Measurement Pro icons...")
    generate_android_icons()
    print("Icon generation complete!")
