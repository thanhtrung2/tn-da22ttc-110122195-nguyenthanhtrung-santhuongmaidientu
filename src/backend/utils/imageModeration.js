/**
 * Image moderation - Auto approve (YOLOv8 removed).
 */

async function moderateImage(filePathOrUrl) {
    console.log('[MODERATION] Image moderation called, auto approving:', filePathOrUrl);
    return { label: 'approved', confidence: 1.0, reason: 'Auto-approved (YOLOv8 removed)', source: 'none' };
}

async function checkHealth() {
    return true; // Always healthy
}

module.exports = { moderateImage, checkHealth };
