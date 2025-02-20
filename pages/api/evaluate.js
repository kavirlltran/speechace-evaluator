// pages/api/evaluate.js
import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Tắt body parser của Next.js vì chúng ta sử dụng formidable để parse multipart form
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
    return;
  }

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Lỗi khi parse form:', err);
      res.status(500).json({ error: 'Lỗi khi xử lý dữ liệu form' });
      return;
    }

    const { text } = fields;
    const audioFile = files.user_audio_file || files.audio; // Ưu tiên user_audio_file

    if (!audioFile) {
      res.status(400).json({ error: 'File audio là bắt buộc' });
      return;
    }

    // Tạo FormData để gửi tới Speechace API
    const formData = new FormData();
    formData.append('text', text);
    // Sử dụng tên trường "user_audio_file" như yêu cầu của Speechace API
    formData.append('user_audio_file', fs.createReadStream(audioFile.filepath), {
      filename: audioFile.originalFilename,
      contentType: audioFile.mimetype,
    });

    // URL Speechace API với key, dialect và user_id
    const speechaceUrl =
      'https://api.speechace.co/api/scoring/text/v9/json?key=kzsoOXHxN1oTpzvi85wVqqZ9Mqg6cAwmHhiTvv%2FfcvLKGaWgcsQkEivJ4D%2Bt9StzW1YpCgrZp8DsFSfEy3YApSRDshFr4FlY0gyQwJOa6bAVpzh6NnoVQC50w7m%2FYYHA&dialect=en-us&user_id=XYZ-ABC-99001';

    try {
      const response = await fetch(speechaceUrl, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
      });

      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      console.error('Lỗi khi gọi Speechace API:', error);
      res.status(500).json({ error: 'Lỗi khi gọi Speechace API' });
    }
  });
}
