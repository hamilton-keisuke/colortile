import failureUrl from '../sound/failure.mp3';
import successUrl from '../sound/success.mp3';

export type SoundName = 'success' | 'failure';

const URLS: Record<SoundName, string> = {
  success: successUrl,
  failure: failureUrl,
};

/**
 * 効果音を再生する。
 * 連続クリックでも音が途切れないよう、再生のたびに複製して鳴らす。
 */
export class SoundPlayer {
  private readonly sources: Record<SoundName, HTMLAudioElement>;

  constructor() {
    this.sources = {
      success: this.load(URLS.success),
      failure: this.load(URLS.failure),
    };
  }

  play(name: SoundName): void {
    const audio = this.sources[name].cloneNode() as HTMLAudioElement;
    // 自動再生制限などで失敗してもゲームは止めない
    audio.play().catch(() => {});
  }

  private load(url: string): HTMLAudioElement {
    const audio = new Audio(url);
    audio.preload = 'auto';
    return audio;
  }
}
