import { useState } from "react";
import "./App.css";
import VoiceRecorder from "./components/VoiceRecorder";
import ChatInterface from "./components/ChatInterface";

function App() {
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isVoiceCloned, setIsVoiceCloned] = useState(false);

  return (
    <div className="app">
      <main className="app-main">
        <VoiceRecorder
          onAudioRecorded={setRecordedAudio}
          onVoiceCloned={setIsVoiceCloned}
        />

        {isVoiceCloned && <ChatInterface recordedAudio={recordedAudio} />}
      </main>
    </div>
  );
}

export default App;
