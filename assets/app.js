// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

const errorContainer = document.getElementById('error-container');
const recentDetectionsElement = document.getElementById('recentClassifications');
const feedbackContentElement = document.getElementById('feedback-content');
const confidenceSlider = document.getElementById('confidenceSlider');
const confidenceInput = document.getElementById('confidenceInput');
const confidenceValueDisplay = document.getElementById('confidenceValueDisplay');
const sliderProgress = document.getElementById('sliderProgress');

const MAX_RECENT_SCANS = 5;
const UPDATE_INTERVAL = 2000; // 表示の切り替えは最短2秒おき
const DEFAULT_CONFIDENCE = 0.5;

let scans = []; // 解析済みの検出結果(新しい順)
let currentState = 'non-person';
let lastChangeTimestamp = 0;

const ui = new WebUI();
ui.on_connect(() => showError(''));
ui.on_disconnect(() => showError('ボードとの接続が切れました。接続を確認してください。'));
ui.on_message('classifications', message => {
  handleClassifications(message);
  renderClasses();
});

initializeConfidenceSlider();
initializePopovers();
renderClasses();

function showError(text) {
  errorContainer.textContent = text;
  errorContainer.style.display = text ? 'block' : 'none';
}

function initializePopovers() {
  const texts = {
    confidence:
      '人として検知するのに必要な最低の信頼度です。値を下げると検知しやすくなりますが、誤検知も増えます。',
    feedback: 'カメラが人を検知すると、ここにアニメーションが表示されます。',
  };
  for (const [kind, text] of Object.entries(texts)) {
    document.querySelectorAll(`.info-btn.${kind}`).forEach(img => {
      const popover = img.nextElementSibling;
      popover.textContent = text;
      img.addEventListener('mouseenter', () => (popover.style.display = 'block'));
      img.addEventListener('mouseleave', () => (popover.style.display = 'none'));
    });
  }
}

function handleClassifications(message) {
  let detections = [];
  try {
    detections = JSON.parse(message);
  } catch (e) {
    console.error('Failed to parse detection data:', message, e);
  }

  if (detections.length > 0) {
    scans.unshift(detections);
    scans = scans.slice(0, MAX_RECENT_SCANS);
  }

  const hasPerson = detections.some(d => d.content?.toLowerCase() === 'person');
  const newState = hasPerson ? 'person' : 'non-person';
  const now = Date.now();
  if (newState !== currentState && now - lastChangeTimestamp > UPDATE_INTERVAL) {
    showDetection(newState);
    currentState = newState;
    lastChangeTimestamp = now;
  }
}

function renderClasses() {
  if (scans.length === 0) {
    recentDetectionsElement.innerHTML = `
            <div class="no-recent-scans">
                <img src="./img/no-face.svg">
                まだ人は検知されていません
            </div>
        `;
    return;
  }

  recentDetectionsElement.replaceChildren(
    ...scans.flat().map(scan => {
      const row = document.createElement('div');
      row.className = 'scan-container';

      const cellContainer = document.createElement('span');
      cellContainer.className = 'scan-cell-container cell-border';

      const contentText = document.createElement('span');
      contentText.className = 'scan-content';
      contentText.textContent = `${Math.floor(scan.confidence * 1000) / 10}% - ${scan.content === 'person' ? '人' : scan.content}`;

      const timeText = document.createElement('span');
      timeText.className = 'scan-content-time';
      timeText.textContent = new Date(scan.timestamp).toLocaleString('ja-JP');

      cellContainer.append(contentText, timeText);
      row.appendChild(cellContainer);
      return row;
    })
  );
}

function clampConfidence(value) {
  const n = parseFloat(value);
  return isNaN(n) ? DEFAULT_CONFIDENCE : Math.min(1, Math.max(0, n));
}

function initializeConfidenceSlider() {
  confidenceSlider.addEventListener('input', updateConfidenceDisplay);
  confidenceInput.addEventListener('input', () => {
    confidenceSlider.value = clampConfidence(confidenceInput.value);
    updateConfidenceDisplay();
  });
  confidenceInput.addEventListener('blur', () => {
    confidenceInput.value = clampConfidence(confidenceInput.value).toFixed(2);
  });
  document.getElementById('confidenceResetButton').addEventListener('click', e => {
    if (e.target.closest('.reset-icon')) {
      confidenceSlider.value = DEFAULT_CONFIDENCE;
      confidenceInput.value = DEFAULT_CONFIDENCE.toFixed(2);
      updateConfidenceDisplay();
    }
  });
  updateConfidenceDisplay();
}

function updateConfidenceDisplay() {
  const value = parseFloat(confidenceSlider.value);
  ui.send_message('override_th', value); // Send confidence to backend
  const percentage = ((value - confidenceSlider.min) / (confidenceSlider.max - confidenceSlider.min)) * 100;
  const displayValue = value.toFixed(2);

  confidenceValueDisplay.textContent = displayValue;
  if (document.activeElement !== confidenceInput) {
    confidenceInput.value = displayValue;
  }
  sliderProgress.style.width = percentage + '%';
  confidenceValueDisplay.style.left = percentage + '%';
}

function showDetection(result) {
  const isPerson = result === 'person';

  const img = document.createElement('img');
  img.src = isPerson ? 'img/hand.gif' : 'img/no-face.svg';
  img.alt = isPerson ? '手を振るアニメーション' : '人なし';
  img.style.width = '100px';

  const text = document.createElement('div');
  text.textContent = isPerson ? '人を検知しました！' : '人はいません';
  text.className = 'detection-text';

  feedbackContentElement.replaceChildren(img, text);
}
