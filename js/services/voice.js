// services/voice.js
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function isSpeechSupported() {
  return Boolean(SpeechRecognition);
}

export function createRecognizer({ lang = 'id-ID', onInterim, onFinal, onError, onEnd } = {}) {
  if (!SpeechRecognition) {
    throw new Error('Browser ini tidak mendukung pengenalan suara.');
  }
  const rec = new SpeechRecognition();
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalText = '';
  rec.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) finalText += result[0].transcript;
      else interim += result[0].transcript;
    }
    if (onInterim) onInterim((finalText + ' ' + interim).trim());
  };
  rec.onerror = (event) => {
    const map = {
      'not-allowed': 'Akses mikrofon ditolak. Izinkan mikrofon di browser.',
      'service-not-allowed': 'Layanan mikrofon tidak tersedia.',
      'no-speech': 'Tidak ada suara terdeteksi. Coba lagi.',
      'audio-capture': 'Mikrofon tidak ditemukan.',
      'network': 'Pengenalan suara membutuhkan koneksi internet.',
      'aborted': 'Perekaman dihentikan.',
    };
    if (onError) onError(map[event.error] || 'Terjadi kesalahan saat merekam suara.');
  };
  rec.onend = () => {
    if (onFinal) onFinal(finalText.trim());
    if (onEnd) onEnd(finalText.trim());
  };

  return {
    start() {
      finalText = '';
      try { rec.start(); } catch (e) { /* already started */ }
    },
    stop() { try { rec.stop(); } catch (e) {} },
    abort() { try { rec.abort(); } catch (e) {} },
  };
}
