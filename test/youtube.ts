import { Page } from '@playwright/test';

export async function mockYouTube(page: Page, errorCode?: number): Promise<void> {
  await page.route('https://www.youtube.com/iframe_api', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.YT = { Player: class {
      constructor(element, options) {
        this.options = options;
        this.state = { position: 0, duration: 40, state: -1 };
        this.iframe = document.createElement('iframe');
        this.iframe.title = 'YouTube story player';
        this.iframe.src = options.host + '/embed/' + options.videoId;
        this.iframe.width = '100%'; this.iframe.height = '100%';
        this.listener = event => {
          if (event.source !== this.iframe.contentWindow || event.origin !== options.host || !event.data.mockYouTube) return;
          this.state = event.data.snapshot;
          if (event.data.changed) options.events.onStateChange({ target: this, data: this.state.state });
        };
        window.addEventListener('message', this.listener);
        this.iframe.addEventListener('load', () => {
          ${errorCode ? `options.events.onError({ target: this, data: ${errorCode} });` : 'options.events.onReady({ target: this });'}
        });
        element.replaceWith(this.iframe);
      }
      getCurrentTime() { return this.state.position; }
      getDuration() { return this.state.duration; }
      getPlayerState() { return this.state.state; }
      command(command, position) { this.iframe.contentWindow.postMessage({ command, position }, this.options.host); }
      cueVideoById(options) { this.command('cue', options.startSeconds); }
      pauseVideo() { this.command('pause'); }
      playVideo() { this.command('play'); }
      seekTo(seconds) { this.command('seek', seconds); }
      destroy() { window.removeEventListener('message', this.listener); this.iframe.remove(); }
    } }; window.onYouTubeIframeAPIReady();`,
  }));
  await page.route('https://www.youtube-nocookie.com/embed/**', route => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><body>
      <button id="toggle">Play</button>
      <label>Playback position<input id="position" type="range" min="0" max="40" step="1" value="0"></label>
      <script>
        const snapshot = { position: 0, duration: 40, state: -1 };
        const slider = document.getElementById('position');
        const toggle = document.getElementById('toggle');
        const notify = changed => {
          slider.value = snapshot.position;
          toggle.textContent = snapshot.state === 1 ? 'Pause' : 'Play';
          parent.postMessage({ mockYouTube: true, snapshot, changed }, '*');
        };
        toggle.onclick = () => { snapshot.state = snapshot.state === 1 ? 2 : 1; notify(true); };
        slider.oninput = () => { snapshot.position = Number(slider.value); notify(true); };
        window.onmessage = event => {
          if (event.source !== parent) return;
          if (event.data.command === 'cue') { snapshot.position = event.data.position; snapshot.state = 5; }
          if (event.data.command === 'pause') snapshot.state = 2;
          if (event.data.command === 'play') snapshot.state = 1;
          if (event.data.command === 'seek') snapshot.position = event.data.position;
          notify(true);
        };
        setInterval(() => {
          if (snapshot.state !== 1) return;
          snapshot.position = Math.min(40, snapshot.position + 0.25);
          if (snapshot.position === 40) snapshot.state = 0;
          notify(snapshot.state === 0);
        }, 250);
      </script></body></html>`,
  }));
}
