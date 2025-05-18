document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const transcriptUrlInput = document.getElementById('transcriptDownloaderUrl');
    const generateButton = document.getElementById('generateTranscriptButton');
    const transcriptContainer = document.querySelector('.transcript-container');
    const copyButton = document.querySelector('.copyTranscriptButton');
    const viewFullButton = document.querySelector('.viewFullScriptButton');
    const downloadButton = document.querySelector('.downloadScriptButton');
    const iframeElement = document.querySelector('.transcript-downloader-container iframe');
    
    // Event listener for the generate button
    generateButton.addEventListener('click', function() {
        const url = transcriptUrlInput.value.trim();
        
        if (!url) {
            alert('Please enter a YouTube URL');
            return;
        }
        
        // Show loading state
        transcriptContainer.innerHTML = '<p>Loading transcript...</p>';
        
        // Extract video ID from URL to set up the iframe
        const videoId = extractVideoId(url);
        if (videoId) {
            iframeElement.src = `https://www.youtube.com/embed/${videoId}`;
        }
        
        // Fetch transcript from backend API
        fetchTranscript(url);
    });
    
    // Function to fetch transcript
    function fetchTranscript(url, language = 'en', translateTo = null) {
        fetch('/api/get_transcript', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                language: language,
                translate_to: translateTo
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayTranscript(data);
                setupButtons(url, data.language_code);
            } else {
                transcriptContainer.innerHTML = `<p class="error">Error: ${data.error}</p>`;
                hideButtons();
            }
        })
        .catch(error => {
            transcriptContainer.innerHTML = `<p class="error">Error: ${error.message}</p>`;
            hideButtons();
        });
    }
    
    // Function to display transcript
    function displayTranscript(data) {
        // Create language selector if multiple languages available
        let languageSelector = '';
        if (data.available_languages && data.available_languages.length > 1) {
            languageSelector = '<div class="language-selector mb-3">' +
                '<label for="language-select">Transcript Language: </label>' +
                '<select id="language-select" class="ml-2 p-1 rounded">';
                
            data.available_languages.forEach(lang => {
                const selected = lang.language_code === data.language_code ? 'selected' : '';
                const type = lang.is_generated ? '(Auto)' : '';
                languageSelector += `<option value="${lang.language_code}" ${selected}>${lang.language} ${type}</option>`;
            });
            
            languageSelector += '</select></div>';
        }
        
        // Create translation selector if transcript is translatable
        let translationSelector = '';
        if (data.is_translatable) {
            translationSelector = '<div class="translation-selector mb-3">' +
                '<label for="translation-select">Translate To: </label>' +
                '<select id="translation-select" class="ml-2 p-1 rounded">' +
                '<option value="">No Translation</option>' +
                '<option value="en">English</option>' +
                '<option value="es">Spanish</option>' +
                '<option value="fr">French</option>' +
                '<option value="de">German</option>' +
                '<option value="it">Italian</option>' +
                '<option value="ja">Japanese</option>' +
                '<option value="ko">Korean</option>' +
                '<option value="pt">Portuguese</option>' +
                '<option value="ru">Russian</option>' +
                '<option value="zh-CN">Chinese (Simplified)</option>' +
                '</select></div>';
        }
        
        // Format transcript content
        let transcriptContent = '<div class="transcript-text whitespace-pre-wrap p-3 bg-gray-800 rounded max-h-[500px] overflow-y-auto">';
        data.transcript.forEach(item => {
            transcriptContent += `<div class="transcript-line" data-start="${item.start}">` +
                `<span class="timestamp text-gray-400">[${item.formatted_time}]</span> ${item.text}</div>`;
        });
        transcriptContent += '</div>';
        
        // Combine all elements
        transcriptContainer.innerHTML = 
            `<h3 class="text-lg font-semibold mb-2">Transcript (${data.language})</h3>` +
            languageSelector +
            translationSelector +
            transcriptContent;
        
        // Add event listeners for language and translation selectors
        const languageSelect = document.getElementById('language-select');
        const translationSelect = document.getElementById('translation-select');
        
        if (languageSelect) {
            languageSelect.addEventListener('change', function() {
                const translateTo = translationSelect ? translationSelect.value : null;
                fetchTranscript(transcriptUrlInput.value.trim(), this.value, translateTo);
            });
        }
        
        if (translationSelect) {
            translationSelect.addEventListener('change', function() {
                fetchTranscript(transcriptUrlInput.value.trim(), 
                    languageSelect ? languageSelect.value : data.language_code, 
                    this.value || null);
            });
        }
        
        // Add click event listeners to transcript lines to jump to that part in the video
        document.querySelectorAll('.transcript-line').forEach(line => {
            line.addEventListener('click', function() {
                const startTime = parseFloat(this.getAttribute('data-start'));
                const iframe = document.querySelector('.transcript-downloader-container iframe');
                
                // Use YouTube Player API to seek to the timestamp
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage(JSON.stringify({
                        event: 'command',
                        func: 'seekTo',
                        args: [startTime, true]
                    }), '*');
                }
            });
        });
    }
    
    // Function to set up the buttons
    function setupButtons(url, language) {
        // Show the buttons
        copyButton.classList.remove('hidden');
        viewFullButton.classList.remove('hidden');
        downloadButton.classList.remove('hidden');
        
        // Set up copy button
        copyButton.addEventListener('click', function() {
            const transcriptText = document.querySelector('.transcript-text').innerText;
            navigator.clipboard.writeText(transcriptText)
                .then(() => alert('Transcript copied to clipboard!'))
                .catch(() => alert('Failed to copy transcript. Please try again.'));
        });
        
        // Set up view full transcript button
        viewFullButton.addEventListener('click', function() {
            fetch('/api/view_full_transcript', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: url,
                    language: language
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Open new window with full transcript
                    const newWindow = window.open('', '_blank');
                    if (newWindow) {
                        let content = `<!DOCTYPE html>
                            <html>
                            <head>
                                <title>Full Transcript</title>
                                <style>
                                    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                                    .timestamp { color: #666; font-size: 0.9em; margin-right: 5px; }
                                    h1 { margin-bottom: 20px; }
                                </style>
                            </head>
                            <body>
                                <h1>Full Transcript (${data.language})</h1>`;
                        
                        data.transcript.forEach(item => {
                            content += `<p><span class="timestamp">[${item.formatted_time}]</span> ${item.text}</p>`;
                        });
                        
                        content += `</body></html>`;
                        
                        newWindow.document.write(content);
                        newWindow.document.close();
                    } else {
                        alert('Popup blocked. Please allow popups for this site.');
                    }
                } else {
                    alert(`Error: ${data.error}`);
                }
            })
            .catch(error => {
                alert(`Error: ${error.message}`);
            });
        });
        
        // Set up download button
        downloadButton.addEventListener('click', function() {
            fetch('/api/download_transcript', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: url,
                    language: language
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Create link to download file
                    const downloadLink = document.createElement('a');
                    downloadLink.href = data.download_path;
                    downloadLink.download = `transcript.txt`;
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                } else {
                    alert(`Error: ${data.error}`);
                }
            })
            .catch(error => {
                alert(`Error: ${error.message}`);
            });
        });
    }
    
    // Function to hide buttons
    function hideButtons() {
        copyButton.classList.add('hidden');
        viewFullButton.classList.add('hidden');
        downloadButton.classList.add('hidden');
    }
    
    // Helper function to extract video ID from YouTube URL
    function extractVideoId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }
}); 