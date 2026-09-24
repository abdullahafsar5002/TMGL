from PIL import Image, ImageDraw
import os

LOGO = r"C:\TMGL\android\app\src\main\res\drawable\logo.png"
RES = r"C:\TMGL\android\app\src\main\res"

# Use Pillow to re-save the logo as a valid PNG
img = Image.open(LOGO).convert("RGBA")
# Re-save as clean PNG (this fixes any header corruption)
img.save(LOGO, "PNG")
print(f"Regenerated drawable/logo.png ({img.size[0]}x{img.size[1]})")

SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

for folder, size in SIZES.items():
    out_dir = os.path.join(RES, folder)

    # Square launcher
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(os.path.join(out_dir, "ic_launcher.png"), "PNG")

    # Round launcher
    round_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    round_img.paste(resized, (0, 0), mask)
    round_img.save(os.path.join(out_dir, "ic_launcher_round.png"), "PNG")

    # Foreground for adaptive icon (centered with padding)
    fg_size = max(size * 3, 108)  # adaptive icon sizing
    padding = int(fg_size * 0.1)
    logo_area = fg_size - padding * 2
    logo_resized = img.resize((logo_area, logo_area), Image.LANCZOS)
    fg = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
    fg.paste(logo_resized, (padding, padding), logo_resized)
    fg.save(os.path.join(out_dir, "ic_launcher_foreground.png"), "PNG")

    print(f"  {folder}/: launcher={size}x{size}, foreground={fg_size}x{fg_size}")

# Also save the 432x432 foreground to drawable
fg432 = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
pad432 = int(432 * 0.1)
la432 = 432 - pad432 * 2
logo432 = img.resize((la432, la432), Image.LANCZOS)
fg432.paste(logo432, (pad432, pad432), logo432)
fg432.save(os.path.join(RES, "drawable", "ic_launcher_foreground.png"), "PNG")
print(f"  drawable/ic_launcher_foreground.png  (432x432)")

print("\nAll icons regenerated!")
