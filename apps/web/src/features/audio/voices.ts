import { useEffect, useState } from 'react';

const PREFERRED_EN_US = ['Google US English', 'Samantha', 'Microsoft Aria'];

export function useEnglishVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const load = () => {
      const available = synth.getVoices();
      const english = available
        .filter((v) => v.lang.toLowerCase().startsWith('en'))
        .sort((a, b) => {
          const score = (v: SpeechSynthesisVoice) => {
            if (v.lang === 'en-US' && PREFERRED_EN_US.some((p) => v.name.includes(p))) return 0;
            if (v.lang === 'en-US') return 1;
            return 2;
          };
          return score(a) - score(b);
        });
      setVoices(english);
    };

    load();
    synth.addEventListener('voiceschanged', load);
    return () => synth.removeEventListener('voiceschanged', load);
  }, []);

  return voices;
}

export function pickVoice(voices: SpeechSynthesisVoice[], preferred: string | null): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const exact = voices.find((v) => v.name === preferred);
  if (exact) return exact;
  const enUs = voices.find((v) => v.lang === 'en-US');
  return enUs ?? voices[0];
}
