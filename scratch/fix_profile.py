import os

def fix_profile_html():
    path = r'd:\KHOALUANTN2026\frontend\public\pages\profile.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    # We need to find where the corruption starts and ends.
    # From view_file, line 630 is correct: <!-- Navigation Buttons -->
    # Line 631 is <div class="step-navigation" ...>
    # Line 632 is the start of corruption.
    
    # I will replace lines 632 to the end with a clean version.
    
    clean_footer = """                        <button type="button" onclick="prevSellerStep()" class="btn btn-outline" id="prev-btn" style="display: none;">
                            <i class="fas fa-arrow-left"></i> Quay lại
                        </button>
                        <div style="flex: 1;"></div>
                        <button type="button" onclick="nextSellerStep()" class="btn btn-primary" id="next-btn">
                            Tiếp tục <i class="fas fa-arrow-right"></i>
                        </button>
                        <button type="button" onclick="submitSellerRegistration()" class="btn btn-primary" id="submit-btn" style="display: none;">
                            <i class="fas fa-paper-plane"></i> Hoàn tất đăng ký
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="/js/api.js"></script>
    <script src="/js/profile.js"></script>
    <script src="/js/seller-registration.js"></script>
    <script src="/js/shopee-nav.js"></script>
</body>
</html>
"""
    
    new_content = "".join(lines[:631]) + clean_footer
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)

if __name__ == '__main__':
    fix_profile_html()
    print("Profile fixed")
