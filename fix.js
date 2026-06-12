const fs = require('fs');
let content = fs.readFileSync('d:/KHOALUANTN2026/frontend/public/pages/profile.html', 'utf8');

const replacement = `                    <!-- Step 3: Identity -->
                    <div id="seller-step-3" class="step-content" style="display: none;">
                        <h3 style="color: #1e293b; margin-bottom: 1.5rem;">Thông tin định danh</h3>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                            <!-- CCCD Mặt Trước -->
                            <div class="modern-file-upload">
                                <label style="display:block;margin-bottom:0.5rem;font-weight:500;">CCCD/CMND mặt trước <span style="color: #ef4444;">*</span></label>
                                <div class="upload-area" onclick="document.getElementById('cccd_mat_truoc').click()" style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; transition: all 0.3s ease; background: #f8fafc;">
                                    <i class="fas fa-id-card upload-icon" style="font-size: 2.5rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                                    <p style="margin:0;color:#475569;font-weight:500;">Nhấn để chọn ảnh mặt trước</p>
                                </div>
                                <input type="file" class="form-control" id="cccd_mat_truoc" accept="image/*" required onchange="previewImage(this, 'preview-cccd-truoc')" style="display: none;">
                                <div id="preview-cccd-truoc" style="margin-top: 1rem;text-align:center;"></div>
                            </div>
                            
                            <!-- CCCD Mặt Sau -->
                            <div class="modern-file-upload">
                                <label style="display:block;margin-bottom:0.5rem;font-weight:500;">CCCD/CMND mặt sau <span style="color: #ef4444;">*</span></label>
                                <div class="upload-area" onclick="document.getElementById('cccd_mat_sau').click()" style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; transition: all 0.3s ease; background: #f8fafc;">
                                    <i class="fas fa-id-card upload-icon" style="font-size: 2.5rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                                    <p style="margin:0;color:#475569;font-weight:500;">Nhấn để chọn ảnh mặt sau</p>
                                </div>
                                <input type="file" class="form-control" id="cccd_mat_sau" accept="image/*" required onchange="previewImage(this, 'preview-cccd-sau')" style="display: none;">
                                <div id="preview-cccd-sau" style="margin-top: 1rem;text-align:center;"></div>
                            </div>
                        </div>

                        <!-- Ảnh Chân Dung -->
                        <div class="modern-file-upload" style="margin-bottom: 1.5rem;">
                            <label style="display:block;margin-bottom:0.5rem;font-weight:500;">Ảnh chân dung <span style="color: #ef4444;">*</span></label>
                            <div class="upload-area" onclick="document.getElementById('anh_guong_mat').click()" style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; transition: all 0.3s ease; background: #f8fafc;">
                                <i class="fas fa-user-circle upload-icon" style="font-size: 2.5rem; color: #94a3b8; margin-bottom: 1rem;"></i>
                                <p style="margin:0;color:#475569;font-weight:500;">Nhấn để chọn ảnh chân dung</p>
                            </div>
                            <input type="file" class="form-control" id="anh_guong_mat" accept="image/*" required onchange="previewImage(this, 'preview-guong-mat')" style="display: none;">
                            <div id="preview-guong-mat" style="margin-top: 1rem;text-align:center;"></div>
                        </div>
                    </div>`;

content = content.replace(/<!-- Step 3: Identity -->[\s\S]*?<!-- Step 4: Tax Info -->/, replacement + '\n\n                    <!-- Step 4: Tax Info -->');
fs.writeFileSync('d:/KHOALUANTN2026/frontend/public/pages/profile.html', content, 'utf8');
console.log('done');
