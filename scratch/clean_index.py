import os

def clean_index_html():
    path = r'd:\KHOALUANTN2026\frontend\public\index.html'
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Standard script tags we want to keep at the end
    script_tags = """    <script src="/js/api.js"></script>
    <script src="/js/products.js"></script>
    <script src="/js/seller-registration.js"></script>
    <script src="/js/shopee-nav.js"></script>"""
    
    # We want to remove the large <script> block that follows these tags
    # or the internal ones.
    
    # Find the end of the last major HTML element (footer or modal)
    insertion_point = content.find('<!-- FOOTER -->')
    if insertion_point == -1:
        insertion_point = content.find('<footer')
        
    # Actually, let's just find where </body> starts and work backwards
    body_end = content.find('</body>')
    if body_end == -1:
        return
        
    # We'll replace everything from after the last </div> before </body> with our scripts
    # But wait, there might be important page-specific initialization scripts.
    
    # Let's just remove the specific redundant functions
    to_remove = [
        'function loadTopbarUser()',
        'function searchProducts()',
        'function updateNavbarCartCount()',
        'function logout()',
        'function toggleNotifications()',
        'function loadNavbarNotifications()',
        'function updateNotificationBadge()',
        'function markNotificationAsRead',
        'function markAllNotificationsAsRead()',
        'function getNotifications()',
        'function getUnreadNotificationsCount()'
    ]
    
    # This is complex to do with simple string replacement.
    # Instead, I'll just find the first <script src="/js/api.js"></script>
    # and replace everything from there to </body> with the clean version + page specific calls.
    
    start_scripts = content.find('<script src="/js/api.js"></script>')
    if start_scripts != -1:
        page_specific = """
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof loadCategories === 'function') loadCategories();
            if (typeof loadFeaturedProducts === 'function') loadFeaturedProducts();
            if (typeof loadNewProducts === 'function') loadNewProducts();
            if (typeof loadStats === 'function') loadStats();
        });
    </script>
"""
        new_content = content[:start_scripts] + script_tags + page_specific + "\n</body>\n</html>"
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)

if __name__ == '__main__':
    clean_index_html()
    print("Index sanitized")
