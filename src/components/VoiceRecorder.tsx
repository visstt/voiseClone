import { useState, useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import RecordPlugin from "wavesurfer.js/plugins/record";
import "./VoiceRecorder.css";

interface VoiceRecorderProps {
  onAudioRecorded: (audio: Blob) => void;
  onVoiceCloned: (cloned: boolean) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioRecorded,
  onVoiceCloned,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const waveformRef = useRef<HTMLDivElement>(null);
  const recordingWaveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const recordingWavesurferRef = useRef<WaveSurfer | null>(null);
  const timerRef = useRef<number | null>(null);
  const recordPluginRef = useRef<RecordPlugin | null>(null);

  useEffect(() => {
    const initializeRecording = async () => {
      if (!recordingWaveformRef.current) {
        console.error("Recording waveform container not found");
        return false;
      }

      if (!recordingWavesurferRef.current) {
        console.log("Initializing WaveSurfer for recording...");

        recordingWavesurferRef.current = WaveSurfer.create({
          container: recordingWaveformRef.current,
          waveColor: "#3182ce",
          progressColor: "#63b3ed",
          cursorColor: "#EC4899",
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          height: 80,
          normalize: true,
          interact: false,
        });

        recordPluginRef.current = RecordPlugin.create({
          scrollingWaveform: true,
          renderRecordedAudio: false,
        });

        recordingWavesurferRef.current.registerPlugin(recordPluginRef.current);

        // Обработчик окончания записи
        recordPluginRef.current.on("record-end", (recordedBlob: Blob) => {
          console.log("Recording ended, blob received:", recordedBlob);
          const url = URL.createObjectURL(recordedBlob);
          setAudioURL(url);
          onAudioRecorded(recordedBlob);
        });

        console.log("WaveSurfer and RecordPlugin initialized successfully");
      }

      return true;
    };

    // Инициализируем WaveSurfer для записи сразу после монтирования
    const timer = setTimeout(async () => {
      await initializeRecording();
    }, 100); // Небольшая задержка, чтобы DOM элемент успел отрендериться

    return () => {
      clearTimeout(timer);
      // Cleanup при размонтировании компонента
      if (recordingWavesurferRef.current) {
        recordingWavesurferRef.current.destroy();
        recordingWavesurferRef.current = null;
        recordPluginRef.current = null;
      }
    };
  }, [onAudioRecorded]);

  useEffect(() => {
    // Инициализация WaveSurfer для воспроизведения записанного аудио
    if (waveformRef.current && audioURL) {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#4F46E5",
        progressColor: "#7C3AED",
        cursorColor: "#EC4899",
        barWidth: 3,
        barRadius: 3,
        height: 80,
        normalize: true,
      });

      wavesurferRef.current.load(audioURL);
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [audioURL]);

  const startRecording = async () => {
    console.log("Attempting to start recording...");
    console.log("recordPluginRef.current:", recordPluginRef.current);

    try {
      if (recordPluginRef.current) {
        console.log("Starting recording with plugin...");
        await recordPluginRef.current.startRecording();
        console.log("Recording started successfully");
        setIsRecording(true);
        setRecordingTime(0);

        // Таймер записи (максимум 60 секунд)
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => {
            if (prev >= 60) {
              stopRecording();
              return 60;
            }
            return prev + 1;
          });
        }, 1000);
      } else {
        console.error("Record plugin is not initialized");
        alert(
          "Плагин записи не инициализирован. Попробуйте обновить страницу."
        );
      }
    } catch (error) {
      console.error("Ошибка при записи:", error);
      alert("Не удалось получить доступ к микрофону: " + error);
    }
  };

  const stopRecording = async () => {
    if (recordPluginRef.current && isRecording) {
      recordPluginRef.current.stopRecording();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const playRecording = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.play();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="voice-recorder">
      <div className="recorder-section">
        <div className="app-header">
          <div className="app-icon">🎙️</div>
          <h1 className="app-title">VoiceClone</h1>
        </div>

        <div className="recording-interface">
          <div className="record-button-wrapper">
            <button
              className={`record-button ${isRecording ? "recording" : ""}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              🎙️
            </button>
            <p className="record-status">
              {isRecording ? "Recording..." : "Start recording"}
            </p>
          </div>

          <div
            className={`audio-visualizer ${isRecording ? "visible" : "hidden"}`}
          >
            <div
              className="recording-waveform"
              ref={recordingWaveformRef}
            ></div>
            {isRecording && (
              <div className="recording-timer">
                {formatTime(recordingTime)} / 1:00
              </div>
            )}
          </div>
        </div>

        {audioURL && !isRecording && (
          <div className="audio-result">
            <div className="result-info">
              <p>Recorded audio ready for playback</p>
            </div>

            <div className="result-actions">
              <button onClick={playRecording} className="action-button primary">
                ▶️ Play Recording
              </button>
            </div>

            <div className="waveform-container">
              <div ref={waveformRef} className="waveform"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
