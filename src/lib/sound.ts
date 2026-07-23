/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * وحدة تشغيل التنبيهات الصوتية المحلية لنظام "يزل"
 * تقوم بتوليد وتنفيذ التنبيهات الصوتية المخصصة (Web Audio API Synthesizer)
 * لتأكيد التفاعل، إشعارات استلام الطلبات، وتعديل حالات المهام.
 */

export const isSoundEnabled = (): boolean => {
  return localStorage.getItem('yazal-sound-enabled') !== 'false';
};

export const setSoundEnabled = (enabled: boolean): void => {
  localStorage.setItem('yazal-sound-enabled', String(enabled));
};

/**
 * نغمة تنبيه عند استلام طلب جديد (New Task/Order Chime)
 * نغمة صاعدة ثلاثية مبهجة (C5 -> E5 -> G5)
 */
export const playNewOrderAlert = () => {
  if (!isSoundEnabled()) return;

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + index * 0.08;
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  } catch (err) {
    console.warn('Audio synthesis warning:', err);
  }
};

/**
 * نغمة تنبيه عند تحديث حالة المهمة أو اكتمالها (Status Change Alert)
 */
export const playStatusUpdateAlert = () => {
  if (!isSoundEnabled()) return;

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // نغمتان متناغمتان (E5 -> A5)
    [659.25, 880.00].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = now + index * 0.12;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  } catch (err) {
    console.warn('Audio synthesis warning:', err);
  }
};

/**
 * التوافقية السابقة لتشغيل صوت التنبيه
 */
export const playTaskAlertSound = () => {
  playNewOrderAlert();
};

