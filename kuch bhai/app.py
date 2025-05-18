from flask import Flask, request, jsonify, send_file, render_template, redirect, url_for
from youtube_transcript_api import YouTubeTranscriptApi
import re
import os
import json
from urllib.parse import urlparse, parse_qs
import tempfile

app = Flask(__name__, static_folder='static', template_folder='templates')

# Create temp directory for downloads
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp')
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR)

def extract_video_id(url):
    """Extract the video ID from a YouTube URL"""
    # Short URL format: youtu.be/VIDEO_ID
    if 'youtu.be' in url:
        return urlparse(url).path.strip('/')
    
    # Standard URL format: youtube.com/watch?v=VIDEO_ID
    parsed_url = urlparse(url)
    if 'youtube.com' in parsed_url.netloc:
        if 'watch' in parsed_url.path:
            return parse_qs(parsed_url.query).get('v', [None])[0]
        elif 'embed' in parsed_url.path:
            # Embed URL format: youtube.com/embed/VIDEO_ID
            return parsed_url.path.split('/')[-1]
        
    return None

def format_time(seconds):
    """Format seconds to MM:SS format"""
    m, s = divmod(int(float(seconds)), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"

@app.route('/')
def index():
    """Serve the main page"""
    return redirect(url_for('static', filename='index.html'))

@app.route('/api/get_transcript', methods=['POST'])
def get_transcript():
    """API endpoint to get transcript for a video"""
    data = request.get_json()
    
    if not data or 'url' not in data:
        return jsonify({'success': False, 'error': 'Missing URL parameter'}), 400
    
    url = data['url']
    video_id = extract_video_id(url)
    
    if not video_id:
        return jsonify({'success': False, 'error': 'Invalid YouTube URL'}), 400
    
    try:
        # Use youtube_transcript_api to get the transcript
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # Get available languages
        available_languages = []
        for transcript in transcript_list:
            available_languages.append({
                'language': transcript.language,
                'language_code': transcript.language_code,
                'is_generated': transcript.is_generated
            })
            
        # Try to get the requested language or default to the first available
        language = data.get('language', 'en')
        try:
            transcript = transcript_list.find_transcript([language])
        except:
            # If requested language not available, get the first one
            transcript = transcript_list[0]
        
        # Get translation if requested
        if data.get('translate_to') and transcript.is_translatable:
            target_language = data.get('translate_to')
            try:
                transcript = transcript.translate(target_language)
            except Exception as e:
                # Continue with original transcript if translation fails
                pass
        
        # Get the transcript data
        transcript_data = transcript.fetch()
        
        # Format the transcript with timestamps
        formatted_transcript = []
        for item in transcript_data:
            formatted_transcript.append({
                'text': item['text'],
                'start': item['start'],
                'duration': item['duration'],
                'formatted_time': format_time(item['start'])
            })
            
        result = {
            'success': True,
            'video_id': video_id,
            'language': transcript.language,
            'language_code': transcript.language_code,
            'is_generated': transcript.is_generated,
            'is_translatable': transcript.is_translatable,
            'available_languages': available_languages,
            'transcript': formatted_transcript
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/download_transcript', methods=['POST'])
def download_transcript():
    """API endpoint to download transcript as a text file"""
    data = request.get_json()
    
    if not data or 'url' not in data:
        return jsonify({'success': False, 'error': 'Missing URL parameter'}), 400
    
    url = data['url']
    video_id = extract_video_id(url)
    
    if not video_id:
        return jsonify({'success': False, 'error': 'Invalid YouTube URL'}), 400
    
    try:
        # Get transcript data
        language = data.get('language', 'en')
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        try:
            transcript = transcript_list.find_transcript([language])
        except:
            # If requested language not available, get the first one
            transcript = transcript_list[0]
            
        # Get translation if requested
        if data.get('translate_to') and transcript.is_translatable:
            target_language = data.get('translate_to')
            try:
                transcript = transcript.translate(target_language)
            except:
                # Continue with original transcript if translation fails
                pass
            
        transcript_data = transcript.fetch()
        
        # Format transcript for text file
        text_content = ""
        for item in transcript_data:
            time_str = format_time(item['start'])
            text_content += f"[{time_str}] {item['text']}\n"
        
        # Create temp file
        temp_file = os.path.join(TEMP_DIR, f"transcript_{video_id}.txt")
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(text_content)
        
        return jsonify({
            'success': True,
            'download_path': f"/api/download_file/{video_id}"
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/download_file/<video_id>', methods=['GET'])
def download_file(video_id):
    """Download the transcript file"""
    file_path = os.path.join(TEMP_DIR, f"transcript_{video_id}.txt")
    
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'error': 'File not found'}), 404
    
    return send_file(
        file_path, 
        as_attachment=True,
        download_name=f"transcript_{video_id}.txt",
        mimetype='text/plain'
    )

@app.route('/api/view_full_transcript', methods=['POST'])
def view_full_transcript():
    """Get full transcript for viewing in a new page"""
    data = request.get_json()
    
    if not data or 'url' not in data:
        return jsonify({'success': False, 'error': 'Missing URL parameter'}), 400
    
    url = data['url']
    video_id = extract_video_id(url)
    
    if not video_id:
        return jsonify({'success': False, 'error': 'Invalid YouTube URL'}), 400
    
    try:
        # Get transcript data
        language = data.get('language', 'en')
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        try:
            transcript = transcript_list.find_transcript([language])
        except:
            # If requested language not available, get the first one
            transcript = transcript_list[0]
            
        # Get translation if requested
        if data.get('translate_to') and transcript.is_translatable:
            target_language = data.get('translate_to')
            try:
                transcript = transcript.translate(target_language)
            except:
                # Continue with original transcript if translation fails
                pass
            
        transcript_data = transcript.fetch()
        
        # Format transcript for display
        formatted_transcript = []
        for item in transcript_data:
            formatted_transcript.append({
                'text': item['text'],
                'start': item['start'],
                'duration': item['duration'],
                'formatted_time': format_time(item['start'])
            })
        
        return jsonify({
            'success': True,
            'video_id': video_id,
            'language': transcript.language,
            'transcript': formatted_transcript
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 