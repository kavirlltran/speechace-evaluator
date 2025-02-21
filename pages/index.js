// pages/index.js
import { useState, useRef } from 'react';

// Hàm loại bỏ dấu nhấn khỏi câu (để gửi lên API)
const cleanSentence = (sentence) => {
  return sentence.replace(/[‘’']/g, "");
};

// Hàm xác định xem từ có được đánh dấu (stressed) hay không dựa trên dấu nhấn trong từ gốc
const isStressed = (word) => /[‘’']/.test(word);

// Hàm đánh giá và tạo các thành phần JSX cho 2 dòng đánh giá
function getDetailedSummaryComponents(result, originalSentence) {
  if (
    !result ||
    !result.text_score ||
    !result.text_score.word_score_list ||
    !originalSentence
  )
    return null;

  // Tách các từ từ câu gốc
  const originalWords = originalSentence.split(/\s+/).filter(Boolean);
  const normalWords = [];
  const stressedWords = [];
  originalWords.forEach((word) => {
    const cleaned = cleanSentence(word).toLowerCase();
    if (isStressed(word)) {
      stressedWords.push(cleaned);
    } else {
      normalWords.push(cleaned);
    }
  });

  // Khởi tạo đối tượng lưu trữ đánh giá cho 2 nhóm
  const normalIssues = { incorrect: [], improvement: [] };
  const stressedIssues = { incorrect: [], improvement: [] };

  // Duyệt qua kết quả từ API và chỉ xét các từ theo nhóm dựa trên bản gốc
  result.text_score.word_score_list.forEach((wordObj) => {
    const wordClean = wordObj.word.toLowerCase();
    // Nhóm normal: từ không có dấu nhấn trong bản gốc
    if (normalWords.includes(wordClean)) {
      if (wordObj.quality_score < 40) {
        normalIssues.incorrect.push(wordObj.word);
      } else if (wordObj.quality_score < 70) {
        normalIssues.improvement.push(wordObj.word);
      }
    }
    // Nhóm stressed: từ có dấu nhấn trong bản gốc
    else if (stressedWords.includes(wordClean)) {
      if (wordObj.phone_score_list) {
        let sumStress = 0,
          count = 0;
        wordObj.phone_score_list.forEach((phone) => {
          if (typeof phone.stress_score !== "undefined") {
            sumStress += phone.stress_score;
            count++;
          }
        });
        const avgStress = count > 0 ? sumStress / count : 100;
        if (avgStress < 70) {
          stressedIssues.incorrect.push(wordObj.word);
        } else if (avgStress < 85) {
          stressedIssues.improvement.push(wordObj.word);
        }
      }
    }
  });

  // Tạo nội dung dòng 1 cho normal
  let normalContent;
  if (normalIssues.incorrect.length > 0 || normalIssues.improvement.length > 0) {
    normalContent = (
      <>
        {normalIssues.incorrect.length > 0 && (
          <span>
            <strong>Các từ phát âm chưa đúng:</strong> {normalIssues.incorrect.join(", ")}
          </span>
        )}
        {normalIssues.improvement.length > 0 && (
          <>
            {normalIssues.incorrect.length > 0 && " | "}
            <span>
              <strong>Các từ cần cải thiện:</strong> {normalIssues.improvement.join(", ")}
            </span>
          </>
        )}
      </>
    );
  } else {
    normalContent = <span><strong>Phát âm tốt.</strong></span>;
  }

  // Tạo nội dung dòng 2 cho stressed
  let stressedContent;
  if (stressedIssues.incorrect.length > 0 || stressedIssues.improvement.length > 0) {
    stressedContent = (
      <>
        {stressedIssues.incorrect.length > 0 && (
          <span>
            <strong>Các từ trọng âm phát âm chưa đúng:</strong> {stressedIssues.incorrect.join(", ")}
          </span>
        )}
        {stressedIssues.improvement.length > 0 && (
          <>
            {stressedIssues.incorrect.length > 0 && " | "}
            <span>
              <strong>Các từ cần cải thiện trọng âm:</strong> {stressedIssues.improvement.join(", ")}
            </span>
          </>
        )}
      </>
    );
  } else {
    stressedContent = <span><strong>Trọng âm tốt.</strong></span>;
  }

  return (
    <>
      <p>{normalContent}</p>
      <p>{stressedContent}</p>
    </>
  );
}

// Component hiển thị kết quả đánh giá
function EvaluationResults({ result, originalSentence }) {
  const summaryComponents = getDetailedSummaryComponents(result, originalSentence);
  return (
    <div className="evaluation-summary">
      <h2>Kết quả đánh giá</h2>
      {summaryComponents}
    </div>
  );
}

export default function Home() {
  // Danh sách câu mẫu cho Practice 1 (bản gốc chứa dấu nhấn)
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
  // text: nội dung đã làm sạch để gửi lên API
  const [text, setText] = useState("");
  // originalSentence: bản gốc có dấu nhấn để đánh giá
  const [originalSentence, setOriginalSentence] = useState("");
  const [result, setResult] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Khi người dùng chọn câu mẫu, lưu cả bản gốc và phiên bản làm sạch cho textbox
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
      <div className="signature">By Luong Kieu Trang</div>
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
          position: relative;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          text-align: center;
          font-family: Arial, sans-serif;
          background: url("/nen xanh.jpg") no-repeat center center;
          background-size: cover;
          min-height: 100vh;
        }
        .signature {
          position: absolute;
          top: 10px;
          right: 10px;
          color: yellow;
          font-weight: bold;
          font-size: 1.2rem;
        }
        h1 {
          margin-bottom: 1.5rem;
          color: #fff;
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
          background: rgba(255, 255, 255, 0.8);
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
          background: none;
          padding: 0;
          border-radius: 0;
        }
        .textbox-container label {
          font-weight: bold;
          color: #fff;
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
          background: none;
          padding: 0;
          border-radius: 0;
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
          background: rgba(255, 255, 255, 0.8);
          padding: 1rem;
          border-radius: 8px;
        }
        .evaluation-summary {
          text-align: left;
          margin-top: 2rem;
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #fff;
          font-size: 1.4rem;
          white-space: pre-wrap;
        }
        .evaluation-summary p {
          margin: 0.5rem 0;
        }
        @media (max-width: 600px) {
          .evaluation-summary {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}
