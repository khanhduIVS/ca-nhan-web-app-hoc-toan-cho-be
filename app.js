/* =========================================================
   APP.JS - Logic dùng chung cho toàn bộ ứng dụng học toán
   Dùng bởi: index.html, be_hoc.html, quan_ly.html
   ========================================================= */

/* ---------- Khóa lưu trữ & cấu hình ---------- */
const DB_KEY = 'math_quiz_db';
const HISTORY_KEY = 'math_quiz_history';
const SHEET_KEY = 'math_quiz_sheet_url';
const SAMPLE_URL = 'questions.json';

/* Kho câu hỏi dùng chung (trong bộ nhớ) */
let questions = [];

/* =========================================================
   LƯU TRỮ CÂU HỎI
   ========================================================= */
function loadDb() {
    const saved = localStorage.getItem(DB_KEY);
    if (saved) {
        try { questions = JSON.parse(saved) || []; } catch (e) { questions = []; }
    }
    return questions;
}
function saveDb() { localStorage.setItem(DB_KEY, JSON.stringify(questions)); }

/* Nạp dữ liệu mẫu từ questions.json (cùng thư mục) */
async function loadSampleData(silent) {
    try {
        const res = await fetch(SAMPLE_URL + '?t=' + Date.now());
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (Array.isArray(data)) {
            questions = data.map(normalizeQ);
            saveDb();
            if (!silent) alert('Đã nạp ' + questions.length + ' câu hỏi mẫu từ questions.json!');
            return true;
        }
    } catch (e) {
        if (!silent) {
            alert('Không đọc được questions.json (' + e.message + ').\n' +
                  'Nếu mở file trực tiếp bằng trình duyệt, hãy chạy qua một web server hoặc GitHub Pages.');
        }
    }
    return false;
}

/* Chuẩn hóa 1 câu hỏi về đúng cấu trúc, bù trường thiếu */
function normalizeQ(q) {
    return {
        question: q.question || '',
        option_a: q.option_a || '',
        option_b: q.option_b || '',
        option_c: q.option_c || '',
        correct_option: q.correct_option || 'option_a',
        level: (q.level === 'hard') ? 'hard' : 'easy',
        lesson: q.lesson || 'Chưa phân loại'
    };
}

/* Đảm bảo có dữ liệu: nạp localStorage, nếu rỗng thì nạp mẫu */
async function ensureData() {
    loadDb();
    if (!questions.length) { await loadSampleData(true); }
    return questions;
}

/* =========================================================
   DANH SÁCH BÀI (LESSON) & LỌC
   ========================================================= */
function getLessons() {
    return [...new Set(questions.map(q => q.lesson))].sort();
}
function labelLevel(lv) { return lv === 'easy' ? 'Dễ' : (lv === 'hard' ? 'Khó' : 'Tất cả'); }

/* Lọc câu hỏi theo độ khó + bài ('all' = không lọc) */
function filterQuestions(level, lesson) {
    return questions.filter(q =>
        (level === 'all' || q.level === level) &&
        (lesson === 'all' || q.lesson === lesson));
}

/* =========================================================
   LỊCH SỬ KẾT QUẢ
   ========================================================= */
function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (e) { return []; }
}
function saveHistory(record) {
    const h = getHistory();
    h.unshift(record);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}
function clearHistoryStore() { localStorage.removeItem(HISTORY_KEY); }

/* Gửi kết quả lên Google Sheet nếu đã cấu hình URL (tùy chọn, không chặn luồng) */
function sendToSheet(record) {
    const url = localStorage.getItem(SHEET_KEY);
    if (!url) return;
    try {
        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(record)
        }).catch(() => {});
    } catch (e) {}
}

/* =========================================================
   ÂM THANH (WebAudio - không cần file)
   ========================================================= */
let audioCtx;
function ac() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}
function beep(freq, start, dur, type = 'sine', gain = 0.2) {
    const ctx = ac();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime + start;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
}
function playCorrectSound() { try { beep(523, 0, 0.15); beep(659, 0.12, 0.15); beep(784, 0.24, 0.25); } catch (e) {} }
function playWrongSound()   { try { beep(220, 0, 0.25, 'sawtooth', 0.25); beep(160, 0.18, 0.35, 'sawtooth', 0.25); } catch (e) {} }

/* =========================================================
   HIỆU ỨNG CONFETTI
   ========================================================= */
function launchConfetti(big) {
    const colors = ['#ff6b6b', '#ffde59', '#2ecc71', '#3498db', '#9b59b6', '#e67e22'];
    const count = big ? 90 : 35;
    for (let i = 0; i < count; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
        c.style.transform = `rotate(${Math.random() * 360}deg)`;
        if (Math.random() > 0.5) c.style.borderRadius = '50%';
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 3200);
    }
}

/* =========================================================
   TIỆN ÍCH CHUNG
   ========================================================= */
function esc(s) {
    return String(s).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function downloadFile(name, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
}
