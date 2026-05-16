import os

def fix_profile():
    path = r'd:\KHOALUANTN2026\frontend\public\pages\profile.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Add api.js if missing
    if '/js/api.js' not in content:
        content = content.replace('<script src="/js/profile.js"></script>', 
                                  '<script src="/js/api.js"></script>\n    <script src="/js/profile.js"></script>')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_index():
    path = r'd:\KHOALUANTN2026\frontend\public\index.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Remove redundant scripts and add shopee-nav.js
    if '/js/shopee-nav.js' not in content:
        content = content.replace('<script src="/js/seller-registration.js"></script>',
                                  '<script src="/js/seller-registration.js"></script>\n    <script src="/js/shopee-nav.js"></script>')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    fix_profile()
    fix_index()
    print("Done")
