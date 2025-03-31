import mongoose from 'mongoose';

const TranscriptionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  speakerId: {
    type: String,
    required: true,
  },
});

export default mongoose.models.Transcription || mongoose.model('Transcription', TranscriptionSchema); 