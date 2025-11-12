import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export const ffmpegConvertVideo = createTool({
  id: "ffmpeg-convert-video",
  description: "Convert video to Facebook-compatible format using FFmpeg (H.264 video codec, AAC audio codec)",
  
  inputSchema: z.object({
    videoPath: z.string().describe("Local file path of the original video to convert"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    convertedVideoPath: z.string().optional(),
    originalSize: z.number().optional(),
    convertedSize: z.number().optional(),
    error: z.string().optional(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [ffmpegConvertVideo] Starting execution with params:', context);
    
    try {
      // Check if input file exists
      if (!fs.existsSync(context.videoPath)) {
        logger?.error('❌ [ffmpegConvertVideo] Input file not found:', context.videoPath);
        return {
          success: false,
          error: `File input tidak ditemukan: ${context.videoPath}`,
        };
      }
      
      // Get original file size
      const originalStats = fs.statSync(context.videoPath);
      const originalSize = originalStats.size;
      const originalSizeMB = (originalSize / 1024 / 1024).toFixed(2);
      
      logger?.info('📊 [ffmpegConvertVideo] Original file info:', {
        path: context.videoPath,
        size: originalSize,
        sizeMB: originalSizeMB + ' MB',
      });
      
      // Prepare output file path
      const tmpDir = '/tmp/telegram_videos';
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      const inputFileName = path.basename(context.videoPath, path.extname(context.videoPath));
      const outputFileName = `${inputFileName}_converted.mp4`;
      const outputPath = path.join(tmpDir, outputFileName);
      
      logger?.info('📝 [ffmpegConvertVideo] Converting video to Facebook-compatible format...');
      logger?.info('🎬 [ffmpegConvertVideo] Output path:', outputPath);
      
      // FFmpeg command to convert video with Facebook-optimized parameters
      // ULTRA OPTIMIZED for maximum compression and smallest file size
      // -i: input file
      // -c:v libx264: use H.264 video codec (widely compatible)
      // -profile:v baseline -level 3.0: H.264 baseline profile for maximum compatibility
      // -pix_fmt yuv420p: pixel format for maximum compatibility
      // -preset veryfast: very fast encoding (prioritize speed over size)
      // -crf 32: constant rate factor for maximum compression (32 = very small files, acceptable quality)
      // -vf scale=-2:480: scale to max 480p for very small file size
      // -r 24: frame rate 24 fps (minimum acceptable)
      // -maxrate 800k -bufsize 1600k: very low bitrate for smallest file
      // -c:a aac: use AAC audio codec (widely compatible)
      // -b:a 64k: audio bitrate 64 kbps (minimum acceptable quality)
      // -ar 44100: audio sample rate 44.1 kHz
      // -movflags +faststart: enable progressive upload/playback
      // -y: overwrite output file if exists
      const ffmpegCommand = `ffmpeg -i "${context.videoPath}" -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -preset veryfast -crf 32 -vf scale=-2:480 -r 24 -maxrate 800k -bufsize 1600k -c:a aac -b:a 64k -ar 44100 -movflags +faststart -y "${outputPath}"`;
      
      logger?.info('🎥 [ffmpegConvertVideo] Executing FFmpeg command...');
      logger?.debug('📝 [ffmpegConvertVideo] Command:', ffmpegCommand);
      
      try {
        // Execute FFmpeg command
        // Note: FFmpeg outputs to stderr by default, so we capture both stdout and stderr
        const output = execSync(ffmpegCommand, {
          encoding: 'utf8',
          stdio: 'pipe', // Capture output but don't show in console
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
        });
        
        logger?.debug('📝 [ffmpegConvertVideo] FFmpeg output:', output);
        
      } catch (execError: any) {
        // FFmpeg writes to stderr even on success, so we need to check if file was created
        if (!fs.existsSync(outputPath)) {
          logger?.error('❌ [ffmpegConvertVideo] FFmpeg conversion failed:', execError.message);
          logger?.error('❌ [ffmpegConvertVideo] FFmpeg stderr:', execError.stderr?.toString() || '');
          return {
            success: false,
            error: `Konversi video gagal: ${execError.message}`,
          };
        }
        // If file exists, FFmpeg succeeded (it just wrote to stderr)
        logger?.debug('📝 [ffmpegConvertVideo] FFmpeg stderr (normal):', execError.stderr?.toString() || '');
      }
      
      // Verify output file was created
      if (!fs.existsSync(outputPath)) {
        logger?.error('❌ [ffmpegConvertVideo] Output file was not created');
        return {
          success: false,
          error: 'File hasil konversi tidak dibuat',
        };
      }
      
      // Get converted file size
      const convertedStats = fs.statSync(outputPath);
      const convertedSize = convertedStats.size;
      const convertedSizeMB = (convertedSize / 1024 / 1024).toFixed(2);
      
      if (convertedSize === 0) {
        logger?.error('❌ [ffmpegConvertVideo] Converted file is empty');
        // Clean up empty file
        fs.unlinkSync(outputPath);
        return {
          success: false,
          error: 'File hasil konversi kosong (0 bytes)',
        };
      }
      
      logger?.info('✅ [ffmpegConvertVideo] Video converted successfully:', {
        outputPath,
        originalSize: originalSizeMB + ' MB',
        convertedSize: convertedSizeMB + ' MB',
        compressionRatio: ((convertedSize / originalSize) * 100).toFixed(2) + '%',
      });
      
      return {
        success: true,
        convertedVideoPath: outputPath,
        originalSize,
        convertedSize,
      };
      
    } catch (error: any) {
      logger?.error('❌ [ffmpegConvertVideo] Error:', error);
      return {
        success: false,
        error: `Error: ${error.message}`,
      };
    }
  },
});
