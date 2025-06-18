chrome.action.onClicked.addListener(async (tab) => {
    if (!tab || !tab.url.includes("youtube.com/watch")) return;
    
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
    });
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "download") {
        console.log("Download request received:", message);
        
        try {

            const videoUrl = btoa(message.videoUrl);
            console.log("Original URL:", message.videoUrl);
            console.log("Encoded URL:", videoUrl);

            const formData = new URLSearchParams();
            formData.append('video_url', videoUrl);
            formData.append('start_time', 'false');
            formData.append('end_time', 'false');
            formData.append('title', message.title);
            formData.append('artist', message.artist);
            formData.append('audio_quality', '128k');

            console.log("Sending form data:", formData.toString());

            const response = await fetch("https://dvr.yout.com/mp3", {
                method: "POST",
                headers: {
                    "Authorization": "{YOUR API KEY GOES HERE}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData,
            });

            console.log("Response status:", response.status);
            console.log("Response headers:", [...response.headers.entries()]);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log("Error response body:", errorText);
                throw new Error(`Request failed with status ${response.status}: ${errorText}`);
            }

            const blob = await response.blob();
            console.log("Blob received, size:", blob.size, "type:", blob.type);

            if (blob.size === 0) {
                throw new Error("Received empty file - the video may not be available for download");
            }

            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            let binaryString = '';
            for (let i = 0; i < uint8Array.length; i++) {
                binaryString += String.fromCharCode(uint8Array[i]);
            }
            const base64 = btoa(binaryString);
            
            const mimeType = blob.type || 'audio/mpeg';
            const dataUri = `data:${mimeType};base64,${base64}`;
            
            const filename = `${message.title} - ${message.artist}.mp3`.replace(/[<>:"/\\|?*]/g, '_');
            
            chrome.downloads.download({
                url: dataUri,
                filename: filename,
                saveAs: false
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error("Download error:", chrome.runtime.lastError);
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: "showError",
                        error: chrome.runtime.lastError.message
                    });
                } else {
                    console.log("Download started with ID:", downloadId);
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: "downloadStarted",
                        filename: filename
                    });
                }
            });

        } catch (error) {
            console.error("Download error:", error);
            
            chrome.tabs.sendMessage(sender.tab.id, {
                action: "showError",
                error: error.message
            });
        }
    }
});