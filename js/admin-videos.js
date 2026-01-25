// Watch & Buy Video Management Functions for Admin Panel
async function loadWatchBuyVideos() {
    const loading = document.getElementById('watch-buy-loading');
    const videoList = document.getElementById('video-list');
    
    if (loading) loading.style.display = 'flex';
    if (videoList) videoList.innerHTML = '';
    
    try {
        // Query both collections to ensure all videos are found
        const [snapshotNew, snapshotOld] = await Promise.all([
            db.collection('watchBuyVideos').get(),
            db.collection('watch_buy_videos').get()
        ]);
        
        if (loading) loading.style.display = 'none';
        
        if (snapshotNew.empty && snapshotOld.empty) {
            videoList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">No videos found. Click "Upload Video" to get started.</div>';
            return;
        }

        const allVideos = [];
        
        snapshotNew.forEach(doc => {
            allVideos.push({ id: doc.id, ...doc.data(), collection: 'watchBuyVideos' });
        });

        snapshotOld.forEach(doc => {
            // Avoid duplicates if both exist
            if (!allVideos.find(v => v.id === doc.id)) {
                allVideos.push({ id: doc.id, ...doc.data(), collection: 'watch_buy_videos' });
            }
        });

        // Sort combined list by date (uploadedAt or createdAt or timestamp)
        allVideos.sort((a, b) => {
            const dateA = (a.uploadedAt || a.createdAt || a.timestamp)?.toDate() || new Date(0);
            const dateB = (b.uploadedAt || b.createdAt || b.timestamp)?.toDate() || new Date(0);
            return dateB - dateA;
        });
        
        allVideos.forEach(video => {
            const videoId = video.id;
            const collection = video.collection;
            
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <div style="position: relative; margin-bottom: 15px;">
                    <video src="${video.videoUrl}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;"></video>
                    <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 5px;">
                        <button onclick="deleteVideo('${videoId}', '${video.storagePath}', '${collection}')" class="btn btn-outline btn-sm" style="background: white; color: #dc2626; padding: 5px 8px;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div style="font-size: 14px; font-weight: 600; margin-bottom: 5px;">SKU: ${video.productSKU || video.sku || 'N/A'}</div>
                <div style="font-size: 12px; color: #64748b;">Added: ${new Date((video.uploadedAt || video.createdAt || video.timestamp)?.toDate()).toLocaleDateString()}</div>
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
                    <p style="margin: 0;">Error loading videos. Please check your connection.</p>
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
                
                await db.collection('watchBuyVideos').add({
                    videoUrl: downloadURL,
                    storagePath: storagePath,
                    productSKU: sku,
                    uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                statusDiv.textContent = 'Upload complete!';
                setTimeout(() => {
                    closeVideoModal();
                    loadWatchBuyVideos();
                    saveBtn.disabled = false;
                }, 1000);
            }
        );
    } catch (error) {
        console.error('Error saving video:', error);
        alert('Error saving video: ' + error.message);
        saveBtn.disabled = false;
    }
}

async function deleteVideo(id, storagePath, collection) {
    if (!confirm('Are you sure you want to delete this video?')) return;
    
    try {
        // Delete from the correct collection
        await db.collection(collection || 'watchBuyVideos').doc(id).delete();
        
        // Delete from Storage
        if (storagePath) {
            try {
                await firebase.storage().ref(storagePath).delete();
            } catch (storageError) {
                console.warn('Storage delete error:', storageError);
            }
        }
        
        loadWatchBuyVideos();
    } catch (error) {
        console.error('Error deleting video:', error);
        alert('Error deleting video: ' + error.message);
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