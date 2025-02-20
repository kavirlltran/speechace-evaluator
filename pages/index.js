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
          <div key={idx} style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid #ddd' }}>
            <p>
              <strong>Từ:</strong> {word.word} - <strong>Điểm chất lượng:</strong> {word.quality_score}
            </p>
            {word.phone_score_list && (
              <div style={{ marginLeft: '1rem' }}>
                <p><em>Chi tiết âm tiết:</em></p>
                <ul>
                  {word.phone_score_list.map((phone, i) => (
                    <li key={i}>
                      <strong>Phone:</strong> {phone.phone}{" "}
                      {phone.quality_score !== undefined && (
                        <> - <strong>Điểm:</strong> {phone.quality_score}</>
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
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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
      alert('Vui lòng nhập nội dung và ghi âm để đánh giá.');
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
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Nhập văn bản bạn đọc:</label>
          <br />
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder="Nhập văn bản tham chiếu"
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
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
        <button type="submit" disabled={loading}>
          {loading ? 'Đang đánh giá...' : 'Đánh giá phát âm'}
        </button>
      </form>
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
