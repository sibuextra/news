# YouTube Transcript Tool

A Flask-based web application that fetches and displays transcripts from YouTube videos. This tool allows you to:

- Fetch transcripts from any YouTube video that has subtitles/captions
- View transcripts alongside the video
- Support for multiple languages
- Translation capabilities
- Download transcripts as text files
- View full transcripts in a separate page

## Features

- ✅ Automatic detection of available languages for each video
- ✅ Support for both manual and auto-generated captions
- ✅ Translation of transcripts between languages
- ✅ Interactive timestamps - click to jump to that part of the video
- ✅ Clean, responsive UI

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/youtube-transcript-tool.git
   cd youtube-transcript-tool
   ```

2. Create and activate a virtual environment (recommended):
   ```
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

## Usage

1. Start the Flask application:
   ```
   python app.py
   ```

2. Open a web browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

3. Enter a YouTube URL in the input box and click "Generate"
4. The video will be displayed alongside its transcript
5. Use the language selector dropdown to switch between available languages
6. If available, use the translation dropdown to translate the transcript
7. Click on any line in the transcript to jump to that part of the video
8. Use the buttons to copy, view full transcript, or download as needed

## Requirements

- Python 3.6+
- Flask
- youtube-transcript-api

## How It Works

The application uses the `youtube-transcript-api` library to fetch transcripts from YouTube videos. It extracts the video ID from the URL, uses the API to fetch the transcript data, and then formats it for display.

The frontend uses JavaScript to make AJAX requests to the Flask backend, which handles the transcript fetching and processing.

## License

MIT 