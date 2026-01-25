
// Watch & Buy Video Management Functions for Admin Panel
async function loadWatchBuyVideos() {
    const loading = document.getElementById('watch-buy-loading');
    const videoList = document.getElementById('video-list');
    
    if (loading) loading.style.display = 'flex';
    if (videoList) videoList.innerHTML = '';
    
    try {
        const firestore = firebase.firestore();
        const snapshot = await firestore.collection('watch_buy_videos').orderBy('createdAt', 'desc').get();
        
        if (loading) loading.style.display = 'none';
        
        if (snapshot.empty) {
            videoList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">No videos found. Click "Add New Video" to get started.</div>';
            return;
        }
        
        snapshot.forEach(doc => {
            const video = doc.data();
            const videoId = doc.id;
            
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <div style="position: relative; margin-bottom: 15px;">
                    <video src="${video.videoUrl}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;"></video>
                    <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 5px;">
                        <button onclick="editVideo('${videoId}')" class="btn btn-outline btn-sm" style="background: white; padding: 5px 8px;"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteVideo('${videoId}', '${video.storagePath}')" class="btn btn-outline btn-sm" style="background: white; color: #dc2626; padding: 5px 8px;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div style="font-size: 14px; font-weight: 600; margin-bottom: 5px;">SKU: ${video.productSKU}</div>
                <div style="font-size: 12px; color: #64748b;">Added: ${new Date(video.createdAt?.toDate()).toLocaleDateString()}</div>
            `;
            videoList.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading videos:', error);
        if (loading) loading.style.display = 'none';
        if (videoList) {
            videoList.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-video" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p style="margin: 0;">Videos will load once Firebase is connected.</p>
                </div>`;
        }
    }
}

function addNewVideoButton() {
    document.getElementById('modalTitle').textContent = 'Add Video';
    document.getElementById('editVideoId').value = '';
    document.getElementById('videoSkuInput').value = '';
    document.getElementById('videoFileInput').value = '';
    document.getElementById('videoUploadStatus').style.display = 'none';
    document.getElementById('videoModal').style.display = 'flex';
}

function closeVideoModal() {
    document.getElementById('videoModal').style.display = 'none';
}

async function saveNewVideo() {
    const fileInput = document.getElementById('videoFileInput');
    const sku = document.getElementById('videoSkuInput').value.trim();
    const statusDiv = document.getElementById('videoUploadStatus');
    const saveBtn = document.getElementById('saveVideoBtn');
    
    if (!sku) {
        alert('Please enter a Product SKU ID');
        return;
    }
    
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a video file');
        return;
    }
    
    try {
        saveBtn.disabled = true;
        statusDiv.style.display = 'block';
        statusDiv.textContent = 'Uploading video... 0%';
        
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const storagePath = `watch_buy_videos/${fileName}`;
        const storageRef = firebase.storage().ref(storagePath);
        
        const uploadTask = storageRef.put(file);
        
        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                statusDiv.textContent = `Uploading video... ${Math.round(progress)}%`;
            }, 
            (error) => {
                console.error('Upload error:', error);
                alert('Upload failed: ' + error.message);
                saveBtn.disabled = false;
            }, 
            async () => {
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                const firestore = firebase.firestore();
                
                const docRef = await firestore.collection('watch_buy_videos').add({
                    videoUrl: downloadURL,
                    storagePath: storagePath,
                    productSKU: sku,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAtLocal: new Date().toISOString()
                });
                
                await docRef.get();
                
                statusDiv.textContent = 'Upload complete!';
                closeVideoModal();
                await loadWatchBuyVideos();
                saveBtn.disabled = false;
            }
        );
    } catch (error) {
        console.error('Error saving video:', error);
        alert('Error saving video: ' + error.message);
        saveBtn.disabled = false;
    }
}

async function deleteVideo(id, storagePath) {
    if (!confirm('Are you sure you want to delete this video?')) return;
    
    console.log('🗑️ Deleting video:', { id, storagePath });
    
    try {
        // Find the buttons and disable them
        const buttons = document.querySelectorAll(`button[onclick*="deleteVideo('${id}'"]`);
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        });

        // Ensure we are using the correct Firestore instance
        // Explicitly get firestore from firebase
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase is not loaded');
        }
        
        const firestore = firebase.firestore();
        
        // Delete from Firestore
        // The collection name used in loadWatchBuyVideos is 'watch_buy_videos'
        console.log('🗑️ Attempting to delete from watch_buy_videos collection');
        await firestore.collection('watch_buy_videos').doc(id).delete();
        console.log('✅ Deleted from Firestore');
        
        // Delete from Storage
        if (storagePath && storagePath.length > 5) {
            try {
                const storageRef = firebase.storage().ref();
                const fileRef = storageRef.child(storagePath);
                await fileRef.delete();
                console.log('✅ Deleted from Storage');
            } catch (storageError) {
                console.warn('⚠️ Storage file not found or already deleted:', storageError.message);
            }
        }
        
        // Also try 'watch-buy-videos' collection just in case of inconsistency
        try {
            await firestore.collection('watch-buy-videos').doc(id).delete();
            console.log('✅ Also attempted delete from watch-buy-videos collection');
        } catch (e) {
            // Ignore errors for the alternative collection
        }
        
        // Directly remove from UI for immediate feedback
        const videoList = document.getElementById('video-list') || document.getElementById('videos-list');
        if (videoList) {
            // Find the card containing this video and remove it
            const cards = videoList.querySelectorAll('.stat-card');
            cards.forEach(card => {
                // Find button with specific ID inside the card
                const deleteBtn = card.querySelector(`button[onclick*="deleteVideo('${id}'"]`);
                if (deleteBtn) {
                    card.remove();
                }
            });
            
            // If list is now empty, show the "No videos" message
            if (videoList.children.length === 0) {
                videoList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">No videos found. Click "Add New Video" to get started.</div>';
            }
        }

        alert('Video deleted successfully');
    } catch (error) {
        console.error('❌ Error deleting video:', error);
        alert('Error deleting video: ' + error.message);
        
        // Re-enable buttons on error
        const buttons = document.querySelectorAll(`button[onclick*="deleteVideo('${id}'"]`);
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-trash"></i>';
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the admin panel page
    if (document.getElementById('watch-buy-video-management')) {
        // Wait for firebase to be ready
        const checkFirebase = setInterval(() => {
            if (typeof db !== 'undefined' && typeof firebase !== 'undefined') {
                clearInterval(checkFirebase);
                loadWatchBuyVideos();
            }
        }, 500);
    }
});
