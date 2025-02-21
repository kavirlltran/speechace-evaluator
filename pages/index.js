// pages/index.js
import { useState, useRef } from 'react';

// Hàm loại bỏ ký tự đánh dấu (apostrophes)
const cleanSentence = (sentence) => {
  // Loại bỏ các ký tự: ‘, ’, '
  return sentence.replace(/[‘’']/g, "");
};

function EvaluationResults({ result }) {
  if (!result || !result.text_score || !result.text_score.word_score_list) return null;
  
  const words = result.text_score.word_score_list;
  let mispronounced = [];
  let stressIssues = [];
  
  words.forEach((word) => {
    // Nếu quality_score < 60 => phát âm chưa đúng
    if (word.quality_score < 60) {
      mispronounced.push(word.word);
    }
    // Kiểm tra từng phone: nếu có stress_score < 90 => trọng âm cần cải thiện
    if (word.phone_score_list) {
      const hasStressIssue = word.phone_score_list.some((phone) => {
        return typeof phone.stress_score !== 'undefined' && phone.stress_score < 90;
      });
      if (hasStressIssue) {
        stressIssues.push(word.word);
      }
    }
  });
  
  return (
    <div className="evaluation-summary">
      <h2>Kết quả đánh giá</h2>
      {mispronounced.length > 0 && (
        <p>
          <strong>Các từ phát âm chưa đúng:</strong> {mispronounced.join(", ")}
        </p>
      )}
      {stressIssues.length > 0 && (
        <p>
          <strong>Các từ cần cải thiện trọng âm:</strong> {stressIssues.join(", ")}
        </p>
      )}
      {mispronounced.length === 0 && stressIssues.length === 0 && (
        <p>Phát âm của bạn rất chính xác và trọng âm đã được nhấn đúng.</p>
      )}
    </div>
  );
}

export default function Home() {
  // Danh sách câu mẫu cho Practice 1 (các dấu đánh dấu chỉ dùng để chỉ ra từ cần nhấn, nhưng sẽ được ẩn khi hiển thị)
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
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Khi người dùng chọn câu mẫu, hiển thị nội dung đã được làm sạch dấu
  const handleSelectSentence = (sentence) => {
    setText(cleanSentence(sentence));
  };

  // Chuyển đổi giữa Practice 1 và Practice 2
  const handlePracticeSwitch = (practice) => {
    setSelectedPractice(practice);
    setText('');
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const startRecording = async () => {
    // Kiểm tra xem trình duyệt có hỗ trợ getUserMedia và MediaRecorder không
    if (!navigator.mediaDevices) {
      alert('Trình duyệt của bạn không hỗ trợ ghi âm.');
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      alert("Trình duyệt của bạn không hỗ trợ tính năng ghi âm.");
      return;
    }
    
    try {
      // Yêu cầu quyền truy cập microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Tạo đối tượng MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      // Khi có dữ liệu ghi âm
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Khi dừng ghi âm, tạo Blob và hiển thị audio preview
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };
      
      // Lắng nghe sự kiện lỗi và hiển thị thông báo lỗi
      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error: ", event.error);
        alert("Đã xảy ra lỗi khi ghi âm: " + event.error.message);
      };

      // Bắt đầu ghi âm
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Lỗi khi ghi âm:', error);
      alert('Không thể ghi âm. Vui lòng kiểm tra quyền microphone của bạn.');
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
      alert('Vui lòng chọn nội dung và ghi âm để đánh giá.');
      return;
    }
    setLoading(true);

    const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('text', text);
    formData.append('user_audio_file', audioFile);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error('Lỗi khi gọi API:', error);
      setResult({ error: 'Có lỗi xảy ra khi gọi API.' });
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
              className={`sentence ${text === cleanSentence(sentence) ? "selected" : ""}`}
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
              className={`sentence ${text === cleanSentence(sentence) ? "selected" : ""}`}
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
          {loading ? 'Đang đánh giá...' : 'Đánh giá phát âm'}
        </button>
      </form>

      {result && result.status === "success" && <EvaluationResults result={result} />}
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
