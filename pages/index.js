// pages/index.js
import { useState, useRef } from 'react';

function EvaluationResults({ result }) {
  const { text_score } = result;
  if (!text_score) return null;
  return (
    <div style={{ marginTop: '2rem' }}>
      <h2>Kết quả đánh giá</h2>
      <p>
        <strong>Văn bản:</strong> {text_score.text}
      </p>
      {text_score.word_score_list &&
        text_score.word_score_list.map((word, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '1rem',
              padding: '0.5rem',
              border: '1px solid #ddd',
            }}
          >
            <p>
              <strong>Từ:</strong> {word.word} -{' '}
              <strong>Điểm chất lượng:</strong> {word.quality_score}
            </p>
            {word.phone_score_list && (
              <div style={{ marginLeft: '1rem' }}>
                <p>
                  <em>Chi tiết phát âm:</em>
                </p>
                <ul>
                  {word.phone_score_list.map((phone, i) => (
                    <li key={i}>
                      <strong>Phone:</strong> {phone.phone} -{' '}
                      <strong>Quality:</strong> {phone.quality_score}
                      {phone.stress_level !== null && (
                        <> - <strong>Stress Level:</strong> {phone.stress_level}</>
                      )}
                      {phone.stress_score !== undefined && (
                        <> - <strong>Stress Score:</strong> {phone.stress_score}</>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

export default function Home() {
  // Danh sách câu mẫu cho Practice 1
  const practice1List = [
    "We should finish the project for our history class.",
    "Peter is revising for his exam next week.",
    "Students will spend more time working with other classmates.",
    "I like to watch videos that help me learn new things.",
    "I have installed some apps on my phone.",
  ];

  // Danh sách câu mẫu cho Practice 2 (đã thêm 2 dòng mới)
  const practice2List = [
    "Our teacher often gives us videos to watch at home.",
    "I never read books on my tablet at night.",
    "It is a new way of learning and students really like it.",
    "You can find a lot of useful tips on this website.",
    "They should make an outline for their presentation.",
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

  // Xử lý chọn câu mẫu để điền vào ô nhập nội dung
  const handleSelectSentence = (sentence) => {
    setText(sentence);
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
    if (!navigator.mediaDevices) {
      alert('Trình duyệt của bạn không hỗ trợ ghi âm.');
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
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

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

    // Chuyển Blob thành File để gửi đi
    const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('text', text);
    // Sử dụng tên trường "user_audio_file" theo yêu cầu của Speechace API
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
    <div style={{ padding: '2rem' }}>
      <h1>Speechace Pronunciation Evaluator</h1>
      
      {/* Phần chuyển đổi nội dung Practice */}
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => handlePracticeSwitch("practice1")}>Practice 1</button>
        <button onClick={() => handlePracticeSwitch("practice2")}>Practice 2</button>
      </div>

      {/* Hiển thị nội dung mẫu theo Practice được chọn */}
      {selectedPractice === "practice1" && (
        <div style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
          {practice1List.map((sentence, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectSentence(sentence)}
              style={{
                cursor: 'pointer',
                marginBottom: '0.5rem',
                backgroundColor: text === sentence ? '#eef' : 'transparent',
                padding: '0.3rem',
              }}
            >
              {sentence}
            </div>
          ))}
        </div>
      )}
      {selectedPractice === "practice2" && (
        <div style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
          {practice2List.map((sentence, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectSentence(sentence)}
              style={{
                cursor: 'pointer',
                marginBottom: '0.5rem',
                backgroundColor: text === sentence ? '#eef' : 'transparent',
                padding: '0.3rem',
              }}
            >
              {sentence}
            </div>
          ))}
        </div>
      )}

      {/* Ô nhập nội dung – người dùng có thể chỉnh sửa sau khi chọn câu mẫu */}
      <div style={{ marginBottom: '1rem' }}>
        <label>Nhập nội dung bạn đọc:</label>
        <br />
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Chọn nội dung từ Practice"
          required
          rows={4}
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>

      {/* Phần ghi âm */}
      <div style={{ marginBottom: '1rem' }}>
        <label>Ghi âm trực tiếp:</label>
        <br />
        {!isRecording && (
          <button type="button" onClick={startRecording}>
            Bắt đầu ghi âm
          </button>
        )}
        {isRecording && (
          <button type="button" onClick={stopRecording}>
            Dừng ghi âm
          </button>
        )}
        {audioUrl && (
          <div style={{ marginTop: '1rem' }}>
            <p>Xem trước âm thanh:</p>
            <audio controls src={audioUrl}></audio>
          </div>
        )}
      </div>

      {/* Gửi dữ liệu đánh giá */}
      <form onSubmit={handleSubmit}>
        <button type="submit" disabled={loading}>
          {loading ? 'Đang đánh giá...' : 'Đánh giá phát âm'}
        </button>
      </form>

      {/* Hiển thị kết quả */}
      {result && result.status === "success" && <EvaluationResults result={result} />}
      {result && result.error && (
        <div style={{ marginTop: '2rem', color: 'red' }}>
          <h2>Lỗi:</h2>
          <p>{result.error}</p>
        </div>
      )}
    </div>
  );
}
