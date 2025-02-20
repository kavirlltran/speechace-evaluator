// pages/index.js
import { useState } from 'react';

export default function Home() {
  const [audioFile, setAudioFile] = useState(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setAudioFile(e.target.files[0]);
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile || !text) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('text', text);

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
          <label>Tải lên file audio (mp3/wav...):</label>
          <br />
          <input type="file" accept="audio/*" onChange={handleFileChange} required />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Đang đánh giá...' : 'Đánh giá phát âm'}
        </button>
      </form>
      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Kết quả đánh giá:</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
