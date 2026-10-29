export async function initializeWebcamStream(video: HTMLVideoElement, source: string): Promise<(() => void) | null> {
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = source;
    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }

  const { default: Hls } = await import('hls.js');
  if (!Hls.isSupported()) return null;

  const hls = new Hls();
  hls.loadSource(source);
  hls.attachMedia(video);

  return () => {
    hls.destroy();
    video.pause();
    video.removeAttribute('src');
    video.load();
  };
}
