// api/post-to-twitter.js
// Fungsi serverless untuk memposting ke Twitter

const { TwitterApi } = require('twitter-api-v2');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, imageUrl } = req.body;

    // Inisialisasi Twitter client
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });

    let mediaId = null;

    // Jika ada gambar, upload terlebih dahulu
    if (imageUrl) {
      const mediaUpload = await client.v1.uploadMedia(imageUrl);
      mediaId = mediaUpload;
    }

    // Post tweet
    const tweet = await client.v2.tweet({
      text: message,
      ...(mediaId && { media: { media_ids: [mediaId] } })
    });

    res.status(200).json({ 
      success: true, 
      tweetId: tweet.data.id,
      message: 'Berhasil diposting ke Twitter' 
    });
  } catch (error) {
    console.error('Error posting to Twitter:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal memposting ke Twitter' 
    });
  }
};
