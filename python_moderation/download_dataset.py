"""
=========================================================
 TẢI DATASET TỪ INTERNET ĐỂ HUẤN LUYỆN MODEL KIỂM DUYỆT ẢNH
=========================================================
Script này sẽ:
  1) Tải ảnh safe (sản phẩm thông thường) từ các nguồn miễn phí
  2) Tải ảnh unsafe (vũ khí, dao, v.v.) từ các nguồn miễn phí
  3) Lưu vào dataset/safe/ và dataset/unsafe/

CÁCH DÙNG:
  python download_dataset.py

LƯU Ý: Script sử dụng Google Image Search hoặc Bing Image Search.
  Bạn cần có kết nối internet.
"""

import os
import sys
import time
import hashlib
import urllib.request
import urllib.parse
import json
import ssl
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = Path(__file__).resolve().parent
SAFE_DIR = BASE_DIR / "dataset" / "safe"
UNSAFE_DIR = BASE_DIR / "dataset" / "unsafe"

# Tạo thư mục
SAFE_DIR.mkdir(parents=True, exist_ok=True)
UNSAFE_DIR.mkdir(parents=True, exist_ok=True)

# Bỏ SSL verify cho các nguồn ảnh
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# === CẤU HÌNH ===
# Số ảnh tối thiểu mỗi loại cần tải
MIN_SAFE_IMAGES = 50
MIN_UNSAFE_IMAGES = 100

# Các từ khóa tìm kiếm
SAFE_QUERIES = [
    "t-shirt product photo white background",
    "smartphone product photography",
    "laptop computer product image",
    "shoes sneakers product photo",
    "handbag purse product photography",
    "cosmetics skincare product photo",
    "kitchen appliance product image",
    "furniture product photography",
    "book cover product photo",
    "headphones earbuds product image",
    "watch wristwatch product photography",
    "sunglasses product photo studio",
    "backpack bag product image",
    "perfume bottle product photography",
    "toy children product photo",
    "coffee maker product image",
    "ceramic mug cup product photo",
    "pillow cushion product photography",
    "desk lamp product image",
    "water bottle product photo",
]

UNSAFE_QUERIES = [
    # Súng các loại
    "pistol handgun weapon",
    "gun firearm weapon",
    "rifle gun military",
    "shotgun weapon firearm",
    "revolver handgun gun",
    "airsoft gun realistic",
    "bb gun pistol realistic",
    "toy gun realistic pistol",
    "gel blaster gun realistic",
    "airgun pellet pistol",
    # Dao vũ khí
    "hunting knife tactical",
    "switchblade butterfly knife",
    "karambit knife tactical",
    "combat knife military",
    "dagger weapon blade",
    "machete blade weapon",
    "tactical knife combat",
    # Vũ khí khác
    "slingshot weapon metal",
    "brass knuckles weapon",
    "crossbow hunting",
    "nunchaku nunchucks weapon",
    "katana sword weapon",
    "stun gun taser",
    "throwing stars shuriken",
    "baton weapon self defense",
    "compound bow archery hunting",
    "tomahawk axe tactical",
    "pepper spray self defense",
    "brass knuckles metal weapon",
]


def download_image(url, save_path, timeout=10):
    """Tải 1 ảnh từ URL."""
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            data = resp.read()
            if len(data) < 5000:  # Quá nhỏ, không phải ảnh thật
                return False
            # Kiểm tra magic bytes
            if data[:2] == b'\xff\xd8':  # JPEG
                ext = "False*
            elif data[:4] == b'\x89PNG':  # PNG
                ext = ".png"
            elif data[:4] == b'RIFF' and data[8:12] == b'WEBP':  # WebP
                ext = ".webp"
            else:
                return False

            # Hash filename để tránh trùng
            h = hashlib.md5(data).hexdigest()[:12]
            final_path = save_path.parent / f"{save_path.stem}_{h}{ext}"
            with open(final_path, "wb") as f:
                f.write(data)
            return True
    except Exception:
        return False


def search_bing_images(query, count=10):
    """Tìm ảnh qua Bing Image Search (không cần API key)."""
    urls = []
    try:
        encoded_query = urllib.parse.quote(query)
        search_url = f"https://www.bing.com/images/search?q={encoded_query}&first=1&count={count}&qft=+filterui:photo-photo"
        req = urllib.request.Request(search_url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            html_content = resp.read().decode("utf-8", errors="ignore")

        import re
        import html
        m_matches = re.findall(r'm="([^"]+)"', html_content)
        for m in m_matches:
            if len(urls) >= count:
                break
            unescaped = html.unescape(m)
            murl_match = re.search(r'"murl":"(https?://[^"]+)"', unescaped)
            if murl_match:
                url = murl_match.group(1).replace("\\u0026", "&")
                if any(ext in url.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                    urls.append(url)
    except Exception as e:
        print(f"  ⚠️ Bing search error for '{query}': {e}")
    return urls


def search_duckduckgo_images(query, count=10):
    """Tìm ảnh qua DuckDuckGo (không cần API key)."""
    urls = []
    try:
        # DuckDuckGo image search
        token_url = f"https://duckduckgo.com/?q={urllib.parse.quote(query)}&iax=images&ia=images"
        req = urllib.request.Request(token_url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            html = resp.read().decode("utf-8", errors="ignore")

        import re
        # Tìm vqd token
        vqd_match = re.search(r'vqd="([^"]+)"', html) or re.search(r"vqd='([^']+)'", html) or re.search(r"vqd=([^&]+)", html)
        if not vqd_match:
            return urls
        vqd = vqd_match.group(1)

        # Gọi API ảnh
        api_url = f"https://duckduckgo.com/i.js?l=vi-VN&o=json&q={urllib.parse.quote(query)}&vqd={vqd}&f=,,,,,&p=1"
        req2 = urllib.request.Request(api_url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://duckduckgo.com/"
        })
        with urllib.request.urlopen(req2, timeout=15, context=ctx) as resp2:
            data = json.loads(resp2.read().decode("utf-8"))

        for result in data.get("results", [])[:count]:
            img_url = result.get("image", "")
            if img_url and any(ext in img_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                urls.append(img_url)
    except Exception as e:
        print(f"  ⚠️ DDG search error for '{query}': {e}")
    return urls


def search_images(query, count=10):
    """Tìm ảnh từ nhiều nguồn."""
    urls = search_bing_images(query, count)
    if len(urls) < count // 2:
        urls.extend(search_duckduckgo_images(query, count))
    # Deduplicate
    return list(dict.fromkeys(urls))[:count]


def download_category(queries, target_dir, label, min_count):
    """Tải ảnh cho 1 category."""
    existing = sum(1 for f in target_dir.iterdir() if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    if existing >= min_count:
        print(f"  ✅ {label}: đã có {existing} ảnh (>= {min_count}), bỏ qua.")
        return existing

    needed = min_count - existing
    print(f"  📥 {label}: cần tải thêm {needed} ảnh (đã có {existing})...")

    downloaded = 0
    for i, query in enumerate(queries):
        if downloaded >= needed:
            break
        print(f"    [{i+1}/{len(queries)}] Tìm: '{query}'...")
        urls = search_images(query, count=8)
        print(f"    → Tìm được {len(urls)} URL ảnh")

        for j, url in enumerate(urls):
            if downloaded >= needed:
                break
            save_name = target_dir / f"{label}_{i}_{j}"
            if download_image(url, save_name):
                downloaded += 1
                print(f"    ✅ Tải {downloaded}/{needed}")
            time.sleep(0.3)  # Rate limit
        time.sleep(1)  # Delay giữa các query

    final_count = sum(1 for f in target_dir.iterdir() if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    print(f"  📊 {label}: tổng cộng {final_count} ảnh")
    return final_count


def main():
    print("=" * 60)
    print("  TẢI DATASET KIỂM DUYỆT ẢNH SẢN PHẨM")
    print("=" * 60)
    print()

    # Đếm ảnh hiện tại
    safe_count = sum(1 for f in SAFE_DIR.iterdir() if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    unsafe_count = sum(1 for f in UNSAFE_DIR.iterdir() if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    print(f"📊 Hiện tại: safe={safe_count}, unsafe={unsafe_count}")
    print()

    print("🔽 Tải ảnh SAFE (sản phẩm hợp lệ)...")
    download_category(SAFE_QUERIES, SAFE_DIR, "safe", MIN_SAFE_IMAGES)
    print()

    print("🔽 Tải ảnh UNSAFE (vũ khí, hàng cấm)...")
    download_category(UNSAFE_QUERIES, UNSAFE_DIR, "unsafe", MIN_UNSAFE_IMAGES)
    print()

    # Đếm lại
    safe_final = sum(1 for f in SAFE_DIR.iterdir() if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    unsafe_final = sum(1 for f in UNSAFE_DIR.iterdir() if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})

    print("=" * 60)
    print(f"✅ Tổng kết: safe={safe_final}, unsafe={unsafe_final}")
    if safe_final >= 5 and unsafe_final >= 5:
        print("🎉 Đủ dữ liệu! Chạy: python train_image_moderation.py")
    else:
        print("⚠️ Chưa đủ dữ liệu. Hãy thêm ảnh thủ công vào dataset/safe và dataset/unsafe")
        print("   Hoặc chạy lại script này.")
    print("=" * 60)


if __name__ == "__main__":
    main()
