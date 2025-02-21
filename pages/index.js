// pages/index.js
import { useState, useRef } from 'react';

// Hàm loại bỏ dấu nhấn khỏi từ (để gửi API và so sánh)
const cleanSentence = (sentence) => {
  // Loại bỏ các ký tự: ‘, ’, '
  return sentence.replace(/[‘’']/g, "");
};

// Hàm xác định xem từ có dấu nhấn hay không (theo bản gốc)
const isStressed = (word) => /[‘’']/.test(word);

// Hàm đánh giá, chia làm 2 dòng: dòng 1 cho các từ thông thường, dòng 2 cho các từ trọng âm
function getDetailedSummary(result, originalSentence) {
  if (
    !result ||
    !result.text_score ||
    !result.text_score.word_score_list ||
    !originalSentence
  )
    return "";

  // Tách các từ từ câu gốc
  const originalWords = originalSentence.split(/\s+/).filter(Boolean);
  // Tạo 2 set để lưu từ đã làm sạch (lowercase)
  const stressedSet = new Set();
  const normalSet = new Set();
  originalWords.forEach((word) => {
    const cleaned = cleanSentence(word).toLowerCase();
    if (isStressed(word)) {
      stressedSet.add(cleaned);
    } else {
      normalSet.add(cleaned);
    }
  });

  // Khởi tạo đối tượng chứa đánh giá cho 2 nhóm
  const normalIssues = { incorrect: [], improvement: [] };
  const stressedIssues = { incorrect: [], improvement: [] };

  // Đánh giá các từ dựa trên quality_score cho cả 2 nhóm (nhưng với stressed, ta dùng trung bình stress_score)
  result.text_score.word_score_list.forEach((wordObj) => {
    const wordClean = wordObj.word.toLowerCase();

    // Nếu từ thuộc nhóm không có dấu nhấn (normal)
    if (normalSet.has(wordClean)) {
      if (wordObj.quality_score < 60) {
        normalIssues.incorrect.push(wordObj.word);
      } else if (wordObj.quality_score < 80) {
        normalIssues.improvement.push(wordObj.word);
      }
    }
  });

  // Đánh giá riêng cho các từ trọng âm dựa trên phone stress_score
  result.text_score.word_score_list.forEach((wordObj) => {
    const wordClean = wordObj.word.toLowerCase();
    if (stressedSet.has(wordClean)) {
      if (wordObj.phone_score_list) {
        let sumStress = 0, count = 0;
        wordObj.phone_score_list.forEach((phone) => {
          if (typeof phone.stress_score !== "undefined") {
            sumStress += phone.stress_score;
            count++;
          }
        });
        const avgStress = count > 0 ? sumStress / count : 100;
        if (avgStress < 80) {
          stressedIssues.incorrect.push(wordObj.word);
        } else if (avgStress < 90) {
          stressedIssues.improvement.push(wordObj.word);
        }
      }
    }
  });

  // Xây dựng thông điệp cho dòng 1 (normal)
  let normalMessage = "";
  if (normalIssues.incorrect.length > 0) {
    normalMessage += "Các từ phát âm chưa đúng: " + normalIssues.incorrect.join(", ");
  }
  if (normalIssues.improvement.length > 0) {
    if (normalMessage) normalMessage += " | ";
    normalMessage += "Các từ cần cải thiện: " + normalIssues.improvement.join(", ");
  }
  // Xây dựng thông điệp cho dòng 2 (stressed)
  let stressedMessage = "";
  if (stressedIssues.incorrect.length > 0) {
    stressedMessage += "Các từ trọng âm phát âm chưa đúng: " + stressedIssues.incorrect.join(", ");
  }
  if (stressedIssues.improvement.length > 0) {
    if (stressedMessage) stressedMessage += " | ";
    stressedMessage += "Các từ cần cải thiện trọng âm: " + stressedIssues.improvement.join(", ");
  }

  return normalMessage + "\n" + stressedMessage;
}

// Component hiển thị kết quả đánh giá
function EvaluationResults({ result, originalSentence }) {
  return (
    <div className="evaluation-summary">
      <h2>Kết quả đánh giá</h2>
      <pre>{getDetailedSummary(result, originalSentence)}</pre>
    </div>
  );
}

export default function Home() {
  // Danh sách câu mẫu cho Practice 1 (các dấu nhấn được đánh dấu trong câu gốc)
  const practice1List = [
    "We should ‘finish the ‘project for our ‘history ‘class.",
    "Peter is re’vising for his e’xam ‘next ‘week.",
    "‘Students will ‘spend more ‘time ‘working with ‘other ‘classmates.",
    "I ‘like to ‘watch ‘videos that ‘help me ‘learn ‘new ‘things.",
    "I have in’stalled some ‘apps on my ‘phone."
  ];

  // Danh sách câu mẫu cho Practice 2
  const practice2List = [
    "Our 'teacher 'often 'gives us 'videos to 'watch at 'home.",
    "I 'never 'read 'books on my 'tablet at 'night.",
    "It is a 'new 'way of 'learning and 'students 'really 'like it.",
    "You can 'find a lot of 'useful tips on this 'website.",
    "They should 'make an 'outline for their 'presentation."
  ];

  const [selectedPractice, setSelectedPractice] = useState("practice1");
  // State chứa nội dung đã làm sạch để gửi lên API
  const [text, setText] = useState("");
  // State chứa bản gốc (có dấu nhấn) để đánh giá
  const [originalSentence, setOriginalSentence] = useState("");
  const [result, setResult] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Khi chọn câu mẫu, lưu cả bản gốc và phiên bản làm sạch cho textbox
  const handleSelectSentence = (sentence) => {
    setOriginalSentence(sentence);
    setText(cleanSentence(sentence));
  };

  // Chuyển đổi giữa Practice 1 và Practice 2
  const handlePracticeSwitch = (practice) => {
    setSelectedPractice(practice);
    setText("");
    setOriginalSentence("");
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices) {
      alert("Trình duyệt của bạn không hỗ trợ ghi âm.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      alert("Trình duyệt của bạn không hỗ trợ tính năng ghi âm.");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error: ", event.error);
        alert("Đã xảy ra lỗi khi ghi âm: " + event.error.message);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Lỗi khi ghi âm:", error);
      alert("Không thể ghi âm. Vui lòng kiểm tra quyền microphone của bạn.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text || !audioBlob) {
      alert("Vui lòng chọn nội dung và ghi âm để đánh giá.");
      return;
    }
    setLoading(true);

    const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });
    const formData = new FormData();
    formData.append("text", text);
    formData.append("user_audio_file", audioFile);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error("Lỗi khi gọi API:", error);
      setResult({ error: "Có lỗi xảy ra khi gọi API." });
    }
    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Speechace Pronunciation Evaluator</h1>

      <div className="practice-switch">
        <button
          onClick={() => handlePracticeSwitch("practice1")}
          className={selectedPractice === "practice1" ? "active" : ""}
        >
          Practice 1
        </button>
        <button
          onClick={() => handlePracticeSwitch("practice2")}
          className={selectedPractice === "practice2" ? "active" : ""}
        >
          Practice 2
        </button>
      </div>

      {selectedPractice === "practice1" && (
        <div className="practice-list">
          {practice1List.map((sentence, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectSentence(sentence)}
              className={`sentence ${
                text === cleanSentence(sentence) ? "selected" : ""
              }`}
            >
              {cleanSentence(sentence)}
            </div>
          ))}
        </div>
      )}
      {selectedPractice === "practice2" && (
        <div className="practice-list">
          {practice2List.map((sentence, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectSentence(sentence)}
              className={`sentence ${
                text === cleanSentence(sentence) ? "selected" : ""
              }`}
            >
              {cleanSentence(sentence)}
            </div>
          ))}
        </div>
      )}

      <div className="textbox-container">
        <label>Nhập nội dung bạn đọc:</label>
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Chọn nội dung từ Practice"
          required
        />
      </div>

      <div className="recording-section">
        <label>Ghi âm trực tiếp:</label>
        <div className="recording-buttons">
          {!isRecording ? (
            <button type="button" onClick={startRecording}>
              Bắt đầu ghi âm
            </button>
          ) : (
            <button type="button" onClick={stopRecording}>
              Dừng ghi âm
            </button>
          )}
        </div>
        {audioUrl && (
          <div className="audio-preview">
            <p>Xem trước âm thanh:</p>
            <audio controls src={audioUrl}></audio>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="submit-form">
        <button type="submit" disabled={loading}>
          {loading ? "Đang đánh giá..." : "Đánh giá phát âm"}
        </button>
      </form>

      {result && result.status === "success" && (
        <EvaluationResults result={result} originalSentence={originalSentence} />
      )}
      {result && result.error && (
        <div className="error-message">
          <h2>Lỗi:</h2>
          <p>{result.error}</p>
        </div>
      )}

      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          text-align: center;
          font-family: Arial, sans-serif;
        }
        h1 {
          margin-bottom: 1.5rem;
        }
        .practice-switch button {
          margin: 0 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 1rem;
          border: 1px solid #0070f3;
          background: #fff;
          color: #0070f3;
          cursor: pointer;
          transition: background 0.3s, color 0.3s;
        }
        .practice-switch button.active,
        .practice-switch button:hover {
          background: #0070f3;
          color: #fff;
        }
        .practice-list {
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          text-align: left;
        }
        .sentence {
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .sentence:hover {
          background: #f0f0f0;
        }
        .sentence.selected {
          background: #d0eaff;
        }
        .textbox-container {
          margin-bottom: 1.5rem;
          text-align: left;
        }
        .textbox-container label {
          font-weight: bold;
        }
        .textbox-container textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color 0.3s;
        }
        .textbox-container textarea:focus {
          border-color: #0070f3;
          outline: none;
        }
        .recording-section {
          margin-bottom: 1.5rem;
          text-align: left;
        }
        .recording-buttons button {
          padding: 0.5rem 1rem;
          font-size: 1rem;
          border: 1px solid #0070f3;
          background: #fff;
          color: #0070f3;
          cursor: pointer;
          transition: background 0.3s, color 0.3s;
          margin-right: 1rem;
        }
        .recording-buttons button:hover {
          background: #0070f3;
          color: #fff;
        }
        .audio-preview {
          margin-top: 1rem;
        }
        .submit-form button {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          background: #0070f3;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .submit-form button:hover {
          background: #005bb5;
        }
        .error-message {
          color: red;
          margin-top: 1.5rem;
        }
        .evaluation-summary {
          text-align: left;
          margin-top: 2rem;
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #f9f9f9;
        }
      `}</style>
    </div>
  );
}
