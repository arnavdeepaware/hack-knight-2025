require('dotenv').config();

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'j7KV53NgP8U4LRS2k2Gs'; // Scarlet

console.log('\n🧪 Testing ElevenLabs API Key...');
console.log('━'.repeat(60));
console.log('Key format:', API_KEY ? `${API_KEY.substring(0, 8)}...${API_KEY.slice(-6)}` : '❌ NOT FOUND');
console.log('Key length:', API_KEY ? API_KEY.length : 0);
console.log('━'.repeat(60));

if (!API_KEY || API_KEY.length < 20) {
  console.error('\n❌ API key appears invalid!');
  console.error('Expected format: sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  process.exit(1);
}

// Test 1: Get available voices
console.log('\n📋 Test 1: Fetching available voices...');
fetch('https://api.elevenlabs.io/v1/voices', {
  headers: { 'xi-api-key': API_KEY }
})
  .then(res => res.json())
  .then(data => {
    if (data.voices) {
      console.log(`✅ API key is VALID! Found ${data.voices.length} voices`);
      console.log('\nAvailable voices:');
      data.voices.slice(0, 5).forEach(v => {
        console.log(`   • ${v.name} (${v.voice_id})`);
      });
      
      // Test 2: Generate short speech
      testTTS();
    } else if (data.detail) {
      console.error(`\n❌ API Error: ${data.detail.message || data.detail}`);
      if (data.detail.status === 'invalid_api_key') {
        console.error('\n🔐 Your API key is INVALID or EXPIRED');
        console.error('👉 Get a new key from: https://elevenlabs.io/app/settings/api-keys');
      }
    }
  })
  .catch(err => {
    console.error('\n❌ Request failed:', err.message);
  });

// Test TTS generation
function testTTS() {
  console.log('\n🎤 Test 2: Generating test speech...');
  
  fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text: 'Hello! This is a test from VisionAid.',
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  })
    .then(async res => {
      if (res.ok) {
        const audioSize = parseInt(res.headers.get('content-length') || '0');
        console.log(`✅ TTS generation SUCCESSFUL! Generated ${audioSize} bytes of audio`);
        console.log('\n🎉 All tests passed! Your ElevenLabs integration is working!\n');
      } else {
        const errorText = await res.text();
        console.error(`❌ TTS failed (${res.status}):`, errorText);
      }
    })
    .catch(err => {
      console.error('❌ TTS request failed:', err.message);
    });
}
