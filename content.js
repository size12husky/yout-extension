(function() {
    if (window.youtubeDownloaderExecuted) {
        return;
    }
    window.youtubeDownloaderExecuted = true;

    function sendDownloadRequest(title, artist) {
        console.log("Sending download request for:", title, "by", artist);
        
        chrome.runtime.sendMessage({
            action: "download",
            videoUrl: window.location.href,
            title: title,
            artist: artist
        });
    }
    
    function showNotification(message, type) {
        const notification = document.createElement("div");
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            ${type === "success" ? "background: #4CAF50;" : "background: #f44336;"}
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "downloadStarted") {
            console.log("Download started:", message.filename);
            showNotification("Download started: " + message.filename, "success");
        }
        
        if (message.action === "showError") {
            console.error("Download error:", message.error);
            showNotification("Download failed: " + message.error, "error");
        }
    });

    function executeDownloadLogic() {
        const titleElement = document.querySelector("#title h1");
        const artistElement = document.querySelector(".ytd-channel-name a");
        
        const timestamp = new Date().toISOString();
        const title = titleElement ? titleElement.innerText : "Yout Export";
        const artist = artistElement ? artistElement.innerText : timestamp;
        
        console.log("Preparing download request for:", title, "by", artist);
        
        const video = document.querySelector("video");
        const isPlayingWithAudio = video && !video.paused && !video.muted && video.volume > 0;
        
        if (isPlayingWithAudio) {
            console.log("Video is playing with audio - pausing before download");
            video.pause();
            setTimeout(() => {
                sendDownloadRequest(title, artist);
            }, 500);
        } else {
            sendDownloadRequest(title, artist);
        }
    }

    const observer = new MutationObserver((mutations, obs) => {
        const titleElement = document.querySelector("#title h1");
        const artistElement = document.querySelector(".ytd-channel-name a");

        if (titleElement && artistElement) {
            obs.disconnect();
            executeDownloadLogic();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

