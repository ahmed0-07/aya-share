"""
Aya Share - Audio to Video Pipeline
Converts audio recitations into videos with text overlays
"""

# Standard library imports (organized alphabetically)
import json
import os
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple

# Third-party imports
import requests
from pydub import AudioSegment, silence
from moviepy import (
    ImageClip, 
    TextClip, 
    CompositeVideoClip, 
    concatenate_videoclips, 
    AudioFileClip, 
    vfx
)

# Configure logging for better debugging and monitoring
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Cross-platform paths for generated assets and static resources
SCRIPT_ROOT = Path(__file__).resolve().parent
UPLOAD_DIR = SCRIPT_ROOT.parent / "backend" / "upload"
ASSETS_DIR = SCRIPT_ROOT / "assets"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_OUTPUT_VIDEO = UPLOAD_DIR / "final_video.mp4"
DEFAULT_BG_IMAGE = ASSETS_DIR / "bg.png"
DEFAULT_FONT_FILE = ASSETS_DIR / "TheYearofTheCamel-Regular.otf"
DEFAULT_AUDIO_FILE = ASSETS_DIR / "quran.mp3"


def transcribe_chunks(
    api_url: str, 
    chunks_dir: str, 
    output_json: str,
    timeout: int = 60
) -> List[Dict[str, any]]:
    """
    Transcribe audio chunks using an external API.
    
    Args:
        api_url: URL endpoint for the transcription API
        chunks_dir: Directory containing .wav audio chunks
        output_json: Path where transcriptions will be saved
        timeout: Request timeout in seconds (default: 60)
    
    Returns:
        List of dictionaries containing file path, transcribed text, and duration
    
    Raises:
        FileNotFoundError: If chunks_dir doesn't exist
        requests.RequestException: If API request fails
    """
    # Validate inputs
    if not os.path.exists(chunks_dir):
        raise FileNotFoundError(f"Chunks directory not found: {chunks_dir}")
    
    logger.info(f"Starting transcription from directory: {chunks_dir}")
    
    data = []
    wav_files = sorted([f for f in os.listdir(chunks_dir) if f.endswith(".wav")])
    
    if not wav_files:
        logger.warning(f"No .wav files found in {chunks_dir}")
        return data
    
    total_files = len(wav_files)
    logger.info(f"Found {total_files} audio chunks to transcribe")

    for idx, file in enumerate(wav_files, start=1):
        path = os.path.join(chunks_dir, file)
        
        try:
            logger.info(f"[{idx}/{total_files}] Transcribing {file}...")
            
            # Send audio file to API
            with open(path, "rb") as f:
                response = requests.post(
                    api_url, 
                    files={"file": f},
                    timeout=timeout
                )
            
            # Check if request was successful
            response.raise_for_status()
            
            # Extract transcription text
            text = response.json().get("text", "")
            logger.info(f"  ✓ Transcribed: {text[:50]}{'...' if len(text) > 50 else ''}")
            
            # Get audio duration
            duration = AudioSegment.from_file(path).duration_seconds * 1000
            
            # Store results
            data.append({
                "file": path,
                "text": text,
                "duration_ms": duration
            })
            
        except requests.Timeout:
            logger.error(f"  ✗ Timeout while transcribing {file}")
            # Add empty entry to maintain order
            data.append({
                "file": path,
                "text": "",
                "duration_ms": AudioSegment.from_file(path).duration_seconds * 1000,
                "error": "timeout"
            })
        except requests.RequestException as e:
            logger.error(f"  ✗ API error for {file}: {e}")
            data.append({
                "file": path,
                "text": "",
                "duration_ms": AudioSegment.from_file(path).duration_seconds * 1000,
                "error": str(e)
            })
        except Exception as e:
            logger.error(f"  ✗ Unexpected error for {file}: {e}")
            raise

    # Save transcriptions to JSON file
    try:
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"✓ Saved all transcriptions to {output_json}")
    except IOError as e:
        logger.error(f"Failed to save transcriptions: {e}")
        raise
    
    return data


def split_audio(
    audio_path: str, 
    output_dir: str,
    min_silence_len: int = 100,
    silence_thresh_offset: int = 16,
    keep_silence: int = 25,
    audio_format: str = "mp3"
) -> List[Dict[str, any]]:
    """
    Split audio file into chunks based on silence detection.
    
    Args:
        audio_path: Path to the input audio file
        output_dir: Directory where chunks will be saved
        min_silence_len: Minimum length of silence to be used for a split (milliseconds)
        silence_thresh_offset: Silence threshold relative to average dBFS (higher = more strict)
        keep_silence: Amount of silence to keep at the beginning/end of chunks (milliseconds)
        audio_format: Format of input audio (default: "mp3")
    
    Returns:
        List of dictionaries containing chunk file paths and durations
    
    Raises:
        FileNotFoundError: If audio file doesn't exist
        ValueError: If parameters are invalid
    """
    # Validate inputs
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")
    
    if min_silence_len <= 0 or silence_thresh_offset <= 0 or keep_silence < 0:
        raise ValueError("Silence parameters must be positive values")
    
    logger.info(f"Loading audio from: {audio_path}")
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Load audio file
        audio = AudioSegment.from_file(audio_path, format=audio_format)
        logger.info(f"Audio loaded: duration={len(audio)/1000:.2f}s, dBFS={audio.dBFS:.2f}")
    except Exception as e:
        logger.error(f"Failed to load audio file: {e}")
        raise
    
    # Split audio on silence
    logger.info("Splitting audio on silence...")
    try:
        chunks = silence.split_on_silence(
            audio,
            min_silence_len=min_silence_len,
            silence_thresh=audio.dBFS - silence_thresh_offset,
            keep_silence=keep_silence
        )
    except Exception as e:
        logger.error(f"Failed to split audio: {e}")
        raise
    
    if not chunks:
        logger.warning("No chunks were created. Audio may be too short or has no silence.")
        return []
    
    logger.info(f"Found {len(chunks)} chunks. Exporting...")
    
    metadata = []

    for i, chunk in enumerate(chunks):
        try:
            out_path = os.path.join(output_dir, f"chunk_{i}.wav")
            chunk.export(out_path, format="wav")
            
            chunk_duration_ms = len(chunk)
            metadata.append({
                "file": out_path,
                "duration_ms": chunk_duration_ms
            })
            
            logger.info(f"  Exported chunk {i+1}/{len(chunks)}: {chunk_duration_ms/1000:.2f}s")
            
        except Exception as e:
            logger.error(f"Failed to export chunk {i}: {e}")
            raise
    
    # Save metadata to JSON
    chunks_json_path = os.path.join(output_dir, "chunks.json")
    try:
        with open(chunks_json_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        logger.info(f"✓ Saved metadata to {chunks_json_path}")
    except IOError as e:
        logger.error(f"Failed to save metadata: {e}")
        raise
    
    logger.info(f"✓ Successfully split audio into {len(chunks)} chunks in {output_dir}/")
    
    return metadata





def generate_video(
    output_dir: str,
    final_video: str,
    original_audio: str,
    bg_path: str,
    font_path: str,
    fade_duration: float = 0.8,
    min_duration_for_fade: float = 1.0,
    font_size: int = 60,
    text_color: str = "white",
    fps: int = 24
) -> str:
    """
    Generate video with text overlays from transcribed audio chunks.
    
    Args:
        output_dir: Directory containing transcriptions.json
        final_video: Output video file path
        original_audio: Path to original audio file to use in video
        bg_path: Path to background image
        font_path: Path to font file (must support Arabic if needed)
        fade_duration: Duration of fade in/out effect in seconds (default: 0.8)
        min_duration_for_fade: Minimum clip duration to apply fade (default: 1.0)
        font_size: Size of text font (default: 60)
        text_color: Color of text overlay (default: "white")
        fps: Frames per second for output video (default: 24)
    
    Returns:
        Path to the generated video file
    
    Raises:
        FileNotFoundError: If required files don't exist
        ValueError: If transcriptions are invalid or empty
    """
    # Validate required files exist
    transcriptions_path = os.path.join(output_dir, "transcriptions.json")
    
    if not os.path.exists(transcriptions_path):
        raise FileNotFoundError(f"Transcriptions file not found: {transcriptions_path}")
    if not os.path.exists(bg_path):
        raise FileNotFoundError(f"Background image not found: {bg_path}")
    if not os.path.exists(font_path):
        raise FileNotFoundError(f"Font file not found: {font_path}")
    if not os.path.exists(original_audio):
        raise FileNotFoundError(f"Audio file not found: {original_audio}")
    
    # Validate parameters
    if fade_duration < 0:
        raise ValueError("fade_duration must be non-negative")
    if font_size <= 0:
        raise ValueError("font_size must be positive")
    if fps <= 0:
        raise ValueError("fps must be positive")
    
    logger.info(f"Loading transcriptions from: {transcriptions_path}")
    
    # Load transcription data
    try:
        with open(transcriptions_path, encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in transcriptions file: {e}")
        raise
    
    if not data:
        raise ValueError("No transcription data found in file")
    
    logger.info(f"Processing {len(data)} clips for video generation...")
    
    clips = []
    skipped_clips = 0
    
    for i, item in enumerate(data, start=1):
        try:
            caption_text = item.get("text", "").strip()
            duration = item.get("duration_ms", 0) / 1000.0
            
            # Skip empty or very short clips
            if not caption_text:
                logger.warning(f"Clip {i}/{len(data)}: Empty text - skipping")
                skipped_clips += 1
                continue
            
            if duration <= 0:
                logger.warning(f"Clip {i}/{len(data)}: Invalid duration - skipping")
                skipped_clips += 1
                continue
            
            logger.info(f"Clip {i}/{len(data)}: {caption_text[:50]}{'...' if len(caption_text) > 50 else ''} (duration: {duration:.2f}s)")
            
            # Create background clip
            bg_clip = ImageClip(bg_path, duration=duration)
            
            # Calculate appropriate fade duration (don't fade more than 1/3 of clip)
            current_fade_duration = min(fade_duration, duration / 3) if duration > min_duration_for_fade else 0
            
            # Create text clip
            txt_clip = (
                TextClip(
                    text=caption_text,
                    font=font_path,
                    font_size=font_size,
                    color=text_color,
                    size=bg_clip.size,
                    method="caption",
                )
                .with_duration(duration)
                .with_position("center")
            )
            
            # Apply fade effects if duration allows
            if current_fade_duration > 0:
                txt_clip = txt_clip.with_effects([
                    vfx.FadeIn(current_fade_duration),
                    vfx.FadeOut(current_fade_duration)
                ])
            
            # Composite text over background
            composite_clip = CompositeVideoClip([bg_clip, txt_clip]).with_duration(duration)
            clips.append(composite_clip)
            
        except Exception as e:
            logger.error(f"Error processing clip {i}: {e}")
            raise
    
    if not clips:
        raise ValueError(f"No valid clips generated. Skipped {skipped_clips} clips.")
    
    if skipped_clips > 0:
        logger.warning(f"Skipped {skipped_clips} invalid clips")
    
    logger.info(f"Concatenating {len(clips)} video clips...")
    
    try:
        # Concatenate all clips
        final_video_clip = concatenate_videoclips(clips, method="compose")
        
        # Add original audio
        logger.info("Adding audio track...")
        audio = AudioFileClip(original_audio)
        final_output = final_video_clip.with_audio(audio)
        
        # Write final video
        logger.info(f"Writing video to: {final_video}")
        final_output.write_videofile(final_video, fps=fps)
        
        logger.info(f"✓ Video generated successfully: {final_video}")
        
        # Clean up resources
        final_video_clip.close()
        audio.close()
        
    except Exception as e:
        logger.error(f"Failed to generate video: {e}")
        raise
    
    return final_video


def process_full_pipeline(
    audio_path: str,
    output_video: str = str(DEFAULT_OUTPUT_VIDEO),
    output_dir: str = str(UPLOAD_DIR),
    api_url: Optional[str] = None,
    bg_path: str = str(DEFAULT_BG_IMAGE),
    font_path: str = str(DEFAULT_FONT_FILE)
) -> Dict[str, any]:
    """
    Run the complete pipeline: split → transcribe → generate video.
    
    Args:
        audio_path: Path to input audio file
        output_video: Path for output video file
        output_dir: Directory for intermediate files
        api_url: Transcription API endpoint (required for transcription)
        bg_path: Path to background image
        font_path: Path to font file
    
    Returns:
        Dictionary with pipeline results and file paths
    """
    logger.info("=" * 60)
    logger.info("AYA SHARE - FULL PIPELINE")
    logger.info("=" * 60)
    
    results = {
        "status": "started",
        "audio_path": audio_path
    }
    
    try:
        # Step 1: Split audio
        logger.info("\n[STEP 1/3] Splitting audio...")
        chunks = split_audio(audio_path, output_dir)
        results["chunks_count"] = len(chunks)
        results["chunks_dir"] = output_dir
        
        # Step 2: Transcribe (only if API URL provided)
        if api_url:
            logger.info("\n[STEP 2/3] Transcribing audio chunks...")
            transcriptions = transcribe_chunks(
                api_url,
                output_dir,
                os.path.join(output_dir, "transcriptions.json")
            )
            results["transcriptions_count"] = len(transcriptions)
        else:
            logger.warning("\n[STEP 2/3] Skipping transcription (no API URL provided)")
            results["transcriptions_count"] = 0
        
        # Step 3: Generate video
        logger.info("\n[STEP 3/3] Generating video...")
        video_path = generate_video(
            output_dir=output_dir,
            final_video=output_video,
            original_audio=audio_path,
            bg_path=bg_path,
            font_path=font_path
        )
        results["video_path"] = video_path
        results["status"] = "success"
        
        logger.info("\n" + "=" * 60)
        logger.info("✓ PIPELINE COMPLETED SUCCESSFULLY!")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"\n✗ Pipeline failed: {e}")
        results["status"] = "failed"
        results["error"] = str(e)
        raise
    
    return results


if __name__ == "__main__":
    """
    Example usage when running script directly.
    Modify these parameters as needed.
    """
    try:
        # Run the full pipeline: split → transcribe → generate video
        result = process_full_pipeline(
            audio_path=str(DEFAULT_AUDIO_FILE),
            output_video=str(DEFAULT_OUTPUT_VIDEO),
            output_dir=str(UPLOAD_DIR),
            api_url="https://fe5d98c12d9c.ngrok-free.app/transcribe",  # Set to your API URL if you want transcription
            bg_path=str(DEFAULT_BG_IMAGE),
            font_path=str(DEFAULT_FONT_FILE)
        )
        
        logger.info("\n" + "=" * 60)
        logger.info("PIPELINE RESULTS:")
        logger.info("=" * 60)
        logger.info(json.dumps(result, indent=2))
        
    except Exception as e:
        logger.error(f"Script execution failed: {e}")
        exit(1)    