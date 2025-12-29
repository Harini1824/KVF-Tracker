class KVFVoiceAssistant {
  constructor() {
    this.chat = document.getElementById('chat');
    this.status = document.getElementById('status');
    this.micBtn = document.getElementById('startListening');
    this.fallbackButtons = document.getElementById('fallbackButtons');
    this.recognition = null;
    this.isListening = false;
    this.conversationAttempts = 0;
    this.maxAttempts = 3;

    this.init();
  }

  init() {
    this.setupSpeechRecognition();
    this.micBtn.addEventListener('click', () => this.toggleListening());
    
    // Auto-focus and speak welcome on load
    this.speakWelcome();
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.status.innerHTML = 'குரல் ஆதரவு இல்லை. நிர்வாகத்தை தொடர்பு கொள்ளுங்கள்.<br>Voice not supported. Contact support.';
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'ta-IN'; // Start with Tamil

    this.recognition.onstart = () => {
      this.isListening = true;
      this.micBtn.classList.add('mic-listening');
      this.status.innerHTML = '🔴 கேட்கிறேன்... தெளிவாக சொல்லுங்கள்<br>🔴 Listening... Speak clearly';
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      this.addMessage('user', transcript);
      this.processCommand(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      this.stopListening();
      if (event.error === 'no-speech') {
        this.askToRepeat('வாய் சத்தம் கேட்கவில்லை. மீண்டும் சொல்லுங்கள்.<br>No speech detected. Please try again.');
      } else {
        this.status.innerHTML = 'பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.<br>Error occurred. Try again.';
      }
    };

    this.recognition.onend = () => {
      this.stopListening();
    };
  }

  toggleListening() {
    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.conversationAttempts++;
      this.recognition.start();
    }
  }

  stopListening() {
    this.isListening = false;
    this.micBtn.classList.remove('mic-listening');
  }

  speakWelcome() {
    this.speak('வணக்கம்! நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்? லேர்னிங் ட்ராக்கர், அட்டெண்டன்ஸ், அல்லது லீவ் ட்ராக்கர் சொல்லுங்கள்.', 'ta-IN');
    setTimeout(() => {
      this.speak('Welcome! What do you want? Say learning tracker, attendance, or leave tracker.', 'en-IN');
    }, 2500);
  }

  speak(text, lang = 'ta-IN') {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;
    
    window.speechSynthesis.speak(utterance);
  }

  addMessage(sender, text) {
    const div = document.createElement('div');
    div.className = `ai-message ${sender}`;
    
    if (sender === 'bot') {
      div.innerHTML = `<strong>🤖 AI:</strong><br>${text}`;
    } else {
      div.innerHTML = `<strong>👤 நீங்கள்:</strong><br>${text}<br><em>You said: ${text}</em>`;
    }
    
    this.chat.appendChild(div);
    this.chat.scrollTop = this.chat.scrollHeight;
  }

  processCommand(text) {
    const cmd = text.toLowerCase();
    
    // Tamil + English keyword matching (more robust)
    if (this.matchesLearning(cmd)) {
      this.confirmAndNavigate('/learning', 'லேர்னிங் ட்ராக்கருக்கு செல்கிறோம்', 'Going to Learning Tracker');
    } 
    else if (this.matchesAttendance(cmd)) {
      this.confirmAndNavigate('/attendance', 'அட்டெண்டன்ஸ் மார்க் செய்கிறோம்', 'Marking your attendance');
    }
    else if (this.matchesLeave(cmd)) {
      this.confirmAndNavigate('/leave', 'லீவ் ட்ராக்கருக்கு செல்கிறோம்', 'Going to Leave Tracker');
    }
    else {
      this.handleUnclearSpeech();
    }
  }

  matchesLearning(text) {
    const learningKeywords = [
      'லேர்னிங்', 'learning', 'லேர்ன்', 'லேர்னிங்', 'ட்ராக்கர்', 'track', 
      'லேர்னிங் ட்ராக்கர்', 'learning track'
    ];
    return learningKeywords.some(keyword => text.includes(keyword));
  }

  matchesAttendance(text) {
    const attendanceKeywords = [
      'அட்டெண்டன்ஸ்', 'attendance', 'அட்டெண்ட்', 'mark', 'மார்க்', 
      'அட்டெண்டன்ஸ்', 'மார்க் செய்'
    ];
    return attendanceKeywords.some(keyword => text.includes(keyword));
  }

  matchesLeave(text) {
    const leaveKeywords = [
      'லீவ்', 'leave', 'லிவ்', 'ட்ராக்கர்', 'track', 'லீவ் ட்ராக்கர்'
    ];
    return leaveKeywords.some(keyword => text.includes(text));
  }

  handleUnclearSpeech() {
    this.conversationAttempts++;
    
    if (this.conversationAttempts >= this.maxAttempts) {
      this.speak('மன்னிக்கவும். தயவு செய்து கீழே உள்ள பட்டன்களை அழுத்தி தேர்ந்தெடுங்கள்.', 'ta-IN');
      this.showButtonFallback();
      return;
    }

    const remaining = this.maxAttempts - this.conversationAttempts + 1;
    this.askToRepeat(`புரியவில்லை. இன்னும் ${remaining} முறை முயற்சிக்கலாம். 
      லேர்னிங், அட்டெண்டன்ஸ், அல்லது லீவ் தெளிவாக சொல்லுங்கள்.<br>
      Did not understand. ${remaining} attempts left. Say learning, attendance, or leave clearly.`);
  }

  askToRepeat(message) {
    this.status.innerHTML = '❌ ' + message;
    this.speak(message.split('<br>')[0], 'ta-IN'); // Speak only Tamil part
  }

  confirmAndNavigate(url, tamilMsg, englishMsg) {
    this.addMessage('bot', `${tamilMsg}<br><em>${englishMsg}</em>`);
    this.status.innerHTML = '✅ செல்கிறோம்...<br>Navigating...';
    
    this.speak(tamilMsg, 'ta-IN');
    
    setTimeout(() => {
      window.location.href = url;
    }, 2000);
  }

  showButtonFallback() {
    this.fallbackButtons.style.display = 'flex';
    this.status.innerHTML = 'பட்டன்களை அழுத்தி தேர்ந்தெடுங்கள் / Use buttons below to select';
    this.speak('தயவு செய்து கீழே உள்ள பட்டன்களை அழுத்தி உங்கள் தேர்வை தெரிவிக்கவும்.', 'ta-IN');
  }
}

// Start the AI assistant when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new KVFVoiceAssistant();
  });
} else {
  new KVFVoiceAssistant();
}
