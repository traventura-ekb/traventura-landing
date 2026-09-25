// ========================================
// ТРАВЕНТУРА — script.js
// ========================================

// ---- UTM / сохранение при первом заходе ----
const UTM_KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','yclid'];

function saveUTM() {
  const params = new URLSearchParams(window.location.search);
  UTM_KEYS.forEach(key => {
    if (params.get(key)) {
      sessionStorage.setItem(key, params.get(key));
    }
  });
}

function getUTM() {
  const utm = {};
  UTM_KEYS.forEach(key => {
    const val = sessionStorage.getItem(key);
    if (val) utm[key] = val;
  });
  return utm;
}

saveUTM();

// ---- Маска телефона ----
function initPhoneMask() {
  const input = document.getElementById('lead-phone');
  if (!input) return;

  input.addEventListener('input', function(e) {
    let val = input.value.replace(/\D/g, '');
    // Если начинается с 8 или 7 — заменяем на 7
    if (val.startsWith('8') || val.startsWith('7')) val = '7' + val.slice(1);
    if (!val) { input.value = ''; return; }
    val = '7' + val.slice(1); // принудительно +7

    let result = '+7';
    if (val.length > 1) result += ' (' + val.slice(1, 4);
    if (val.length >= 4) result += ') ' + val.slice(4, 7);
    if (val.length >= 7) result += '-' + val.slice(7, 9);
    if (val.length >= 9) result += '-' + val.slice(9, 11);
    input.value = result;
  });

  input.addEventListener('keydown', function(e) {
    // Разрешаем вставку через Ctrl+V / Cmd+V
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') return;
  });

  input.addEventListener('paste', function(e) {
    setTimeout(() => {
      let val = input.value.replace(/\D/g, '');
      if (val.startsWith('8')) val = '7' + val.slice(1);
      if (!val.startsWith('7')) val = '7' + val;
      input.dispatchEvent(new Event('input'));
    }, 10);
  });

  input.addEventListener('focus', function() {
    if (!input.value) input.value = '+7 ';
  });

  input.addEventListener('blur', function() {
    if (input.value === '+7 ' || input.value === '+7') input.value = '';
  });
}

document.addEventListener('DOMContentLoaded', initPhoneMask);


// ---- Яндекс Метрика ----
function trackEvent(eventName) {
  try {
    if (CONFIG.METRIKA_ID && window.ym) {
      ym(CONFIG.METRIKA_ID, 'reachGoal', eventName);
    }
  } catch(e) {}
  if (CONFIG.TEST_MODE) console.log('[МЕТРИКА]', eventName);
}

// ---- Состояние квиза ----
let currentStep = 1;
const totalSteps = 5;
let isSubmitting = false;

const answers = {
  q1: null, // кто едет
  q2: [],   // что важно (multiselect)
  q3: null, // направление
  q4: null, // когда
  q5: null, // бюджет
  otherDirection: '',
  dateFrom: '',
  dateTo: ''
};

// ---- Навигация по квизу ----
function scrollToQuiz() {
  const el = document.getElementById('quiz-section');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateProgress(step) {
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  if (fill) fill.style.width = (step / totalSteps * 100) + '%';
  if (text) text.textContent = step + ' из ' + totalSteps;
}

function showStep(n) {
  document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
  document.getElementById('contact-step')?.classList.remove('active');
  const step = document.getElementById('step-' + n);
  if (step) step.classList.add('active');
  updateProgress(n);
  currentStep = n;
  document.getElementById('quiz-header').style.display = 'block';
}

function nextStep(n) {
  // Валидация текущего шага
  if (n === 2 && !answers.q1) {
    alert('Пожалуйста, выберите вариант');
    return;
  }
  if (n === 3 && answers.q2.length === 0) {
    alert('Выберите хотя бы один вариант');
    return;
  }
  if (n === 4 && !answers.q3) {
    alert('Пожалуйста, выберите направление');
    return;
  }
  if (n === 5 && !answers.q4) {
    alert('Пожалуйста, выберите когда хотите улететь');
    return;
  }
  trackEvent('quiz_step_' + (n - 1));
  showStep(n);
  scrollToQuiz();
}

function prevStep(n) {
  showStep(n);
  scrollToQuiz();
}

function showContactStep() {
  if (!answers.q5) {
    alert('Пожалуйста, выберите бюджет');
    return;
  }
  trackEvent('quiz_step_5');
  document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
  document.getElementById('quiz-header').style.display = 'none';
  document.getElementById('contact-step').classList.add('active');
  scrollToQuiz();
}

function hideContactStep() {
  document.getElementById('contact-step').classList.remove('active');
  document.getElementById('quiz-header').style.display = 'block';
}

// ---- Выбор ответов ----
function selectOption(btn, isMulti) {
  const q = btn.dataset.q;
  if (isMulti) {
    btn.classList.toggle('selected');
    const val = btn.dataset.val;
    if (btn.classList.contains('selected')) {
      if (!answers.q2.includes(val)) answers.q2.push(val);
    } else {
      answers.q2 = answers.q2.filter(v => v !== val);
    }
  } else {
    document.querySelectorAll('[data-q="' + q + '"]').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    answers['q' + q] = btn.dataset.val;
  }
}

// ---- Условные поля ----
function showOtherField() {
  document.getElementById('other-direction-field').classList.add('visible');
  setTimeout(() => document.getElementById('other-direction')?.focus(), 100);
}

function hideOtherField() {
  document.getElementById('other-direction-field').classList.remove('visible');
  answers.otherDirection = '';
}

function showDateFields() {
  document.getElementById('date-fields').classList.add('visible');
}

function hideDateFields() {
  document.getElementById('date-fields').classList.remove('visible');
  answers.dateFrom = '';
  answers.dateTo = '';
}


// ---- Копирование промокода ----
function copyPromo(btn) {
  navigator.clipboard.writeText('ХОЧУВТУР').then(() => {
    btn.textContent = '✅ Скопировано!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '📋 Скопировать';
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    // fallback для старых браузеров
    const ta = document.createElement('textarea');
    ta.value = 'ХОЧУВТУР';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = '✅ Скопировано!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '📋 Скопировать'; btn.classList.remove('copied'); }, 2000);
  });
}

// ---- Копирование готового сообщения ----
function copyMessage(btn) {
  const msg = 'Здравствуйте! Я заполнила свои пожелания и ХОЧУ В ТУР!';
  navigator.clipboard.writeText(msg).then(() => {
    btn.textContent = '✅ Сообщение скопировано!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '📋 Скопировать сообщение';
      btn.classList.remove('copied');
    }, 2500);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = msg;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = '✅ Сообщение скопировано!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '📋 Скопировать сообщение'; btn.classList.remove('copied'); }, 2500);
  });
}

// ---- Сборка ссылок мессенджеров ----
function buildMessengerLinks() {
  const msg = encodeURIComponent(CONFIG.PREFILL_MESSAGE);
  document.getElementById('btn-max').href = CONFIG.MESSENGER.max;
  document.getElementById('btn-whatsapp').href = CONFIG.MESSENGER.whatsapp + '?text=' + msg;
  document.getElementById('btn-telegram').href = CONFIG.MESSENGER.telegram + '?start=' + encodeURIComponent('ХОЧУВТУР');
}

// ---- Отправка заявки ----
function getLeadData(name, phone) {
  return {
    name: name,
    phone: phone,
    q1_company: answers.q1,
    q2_priorities: answers.q2.join(', '),
    q3_destination: answers.q3,
    q3_other: answers.otherDirection || '',
    q4_when: answers.q4,
    q4_date_from: answers.dateFrom || '',
    q4_date_to: answers.dateTo || '',
    q5_budget: answers.q5,
    promo: CONFIG.PROMO_CODE,
    timestamp: new Date().toISOString(),
    page_url: window.location.href,
    referrer: document.referrer || '',
    ...getUTM()
  };
}

async function submitLead() {
  if (isSubmitting) return;

  const nameEl = document.getElementById('lead-name');
  const phoneEl = document.getElementById('lead-phone');
  const consentEl = document.getElementById('consent');
  const errorEl = document.getElementById('quiz-error');

  // Валидация
  let valid = true;
  nameEl.classList.remove('error');
  phoneEl.classList.remove('error');

  if (!nameEl.value.trim()) { nameEl.classList.add('error'); valid = false; }
  const phoneDigits = phoneEl.value.replace(/\D/g, '');
  if (phoneDigits.length < 11) { phoneEl.classList.add('error'); valid = false; }
  if (!consentEl.checked) {
    alert('Пожалуйста, дайте согласие на обработку персональных данных');
    valid = false;
  }
  if (!valid) return;

  isSubmitting = true;
  errorEl.classList.remove('visible');
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.classList.add('is-loading');

  const leadData = getLeadData(nameEl.value.trim(), phoneEl.value.trim());

  try {
    // Формируем сообщение для Telegram
    const utm = getUTM();
    const utmStr = Object.entries(utm).map(([k,v]) => `${k}: ${v}`).join('\n') || '—';

    const msg = [
      '🌴 *Новая заявка — Травентура*',
      '',
      `👤 *Имя:* ${leadData.name}`,
      `📱 *Телефон:* ${leadData.phone}`,
      '',
      `👥 *С кем едет:* ${leadData.q1_company || '—'}`,
      `✨ *Что важно:* ${leadData.q2_priorities || '—'}`,
      `🌍 *Направление:* ${leadData.q3_destination || '—'}${leadData.q3_other ? ' (' + leadData.q3_other + ')' : ''}`,
      `📅 *Когда:* ${leadData.q4_when || '—'}${leadData.q4_date_from ? ' (' + leadData.q4_date_from + ' — ' + leadData.q4_date_to + ')' : ''}`,
      `💰 *Бюджет:* ${leadData.q5_budget || '—'}`,
      '',
      `🎟 *Промокод:* ${leadData.promo}`,
      '',
      `📊 UTM: ${utmStr}`,
      `🔗 ${leadData.page_url}`
    ].join('\n');

    const ENDPOINT = 'https://functions.yandexcloud.net/d4ea7sn5pklm7saavvc8';

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });

    const result = await response.json();
    if (result.success) {
      trackEvent('lead_submit');
      showSuccess();
    } else {
      throw new Error('Telegram error: ' + JSON.stringify(result));
    }
  } catch (err) {
    console.error('Submit error:', err);
    trackEvent('lead_submit_error');
    isSubmitting = false;
    btn.disabled = false;
    btn.classList.remove('is-loading');
    errorEl.classList.add('visible');
  }
}

function retrySubmit() {
  isSubmitting = false;
  document.getElementById('submit-btn').disabled = false;
  document.getElementById('submit-btn').classList.remove('is-loading');
  document.getElementById('quiz-error').classList.remove('visible');
  submitLead();
}

function showSuccess() {
  buildMessengerLinks();
  document.getElementById('contact-step').classList.remove('active');
  document.getElementById('quiz-header').style.display = 'none';
  document.getElementById('success-screen').classList.add('active');
  trackEvent('success_view');
  scrollToQuiz();
}

// ---- TEST MODE BANNER ----
if (!CONFIG.TEST_MODE) {
  const banner = document.getElementById('test-banner');
  if (banner) banner.style.display = 'none';
}

// ---- Cookie ----
(function() {
  const banner = document.getElementById('cookie-banner');
  const btn = document.getElementById('cookie-accept');
  if (!localStorage.getItem('cookie_consent')) {
    banner.style.display = 'flex';
  }
  btn.addEventListener('click', function() {
    localStorage.setItem('cookie_consent', '1');
    banner.style.display = 'none';
  });
})();

// Яндекс Метрика инициализируется в <head>

// ---- Поддержка якоря #quiz ----
(function() {
  function handleHash() {
    if (window.location.hash === '#quiz') {
      const el = document.getElementById('quiz-section');
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }
  window.addEventListener('load', handleHash);
  window.addEventListener('hashchange', handleHash);
})();
