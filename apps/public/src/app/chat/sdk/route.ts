import { ensureChatWidgetSettings } from "@crinity/shared/chat/widget-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeJsString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function GET(request: Request) {
  const settings = await ensureChatWidgetSettings();
  const origin = new URL(request.url).origin;

  const script = `
(() => {
  const DEFAULTS = {
    widgetKey: '${escapeJsString(settings.widgetKey)}',
    buttonLabel: '${escapeJsString(settings.buttonLabel)}',
    accentColor: '${escapeJsString(settings.accentColor)}',
    position: '${escapeJsString(settings.position)}'
  };

  function buildIframeUrl(config) {
    const params = new URLSearchParams();
    if (config.widgetKey) params.set('widgetKey', config.widgetKey);
    return '${origin}/chat/embed' + (params.toString() ? '?' + params.toString() : '');
  }

  function createWidget(config) {
    if (document.getElementById('crinity-chat-launcher')) return;

    const button = document.createElement('button');
    button.id = 'crinity-chat-launcher';
    button.type = 'button';
    button.textContent = config.buttonLabel;
    button.style.position = 'fixed';
    button.style.zIndex = '2147483647';
    button.style.right = config.position === 'bottom-left' ? 'auto' : '24px';
    button.style.left = config.position === 'bottom-left' ? '24px' : 'auto';
    button.style.bottom = '24px';
    button.style.border = 'none';
    button.style.borderRadius = '9999px';
    button.style.padding = '14px 18px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 18px 45px rgba(15, 23, 42, 0.24)';
    button.style.background = config.accentColor;
    button.style.color = '#fff';
    button.style.font = '600 14px/1.2 sans-serif';

    const panel = document.createElement('div');
    panel.id = 'crinity-chat-panel';
    panel.style.position = 'fixed';
    panel.style.zIndex = '2147483646';
    panel.style.right = config.position === 'bottom-left' ? 'auto' : '24px';
    panel.style.left = config.position === 'bottom-left' ? '24px' : 'auto';
    panel.style.bottom = '84px';
    panel.style.width = '380px';
    panel.style.maxWidth = 'calc(100vw - 32px)';
    panel.style.height = 'min(720px, calc(100vh - 120px))';
    panel.style.background = '#fff';
    panel.style.borderRadius = '24px';
    panel.style.boxShadow = '0 24px 80px rgba(15, 23, 42, 0.26)';
    panel.style.overflow = 'hidden';
    panel.style.display = 'none';

    const iframe = document.createElement('iframe');
    iframe.src = buildIframeUrl(config);
    iframe.title = 'Crinity Chat Widget';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.setAttribute('allow', 'clipboard-write');

    panel.appendChild(iframe);

    button.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    document.body.appendChild(panel);
    document.body.appendChild(button);
  }

  function init(options = {}) {
    createWidget({ ...DEFAULTS, ...options });
  }

  window.CrinityChatWidget = { init };

  const currentScript = document.currentScript;
  init({
    widgetKey: currentScript?.dataset.widgetKey || DEFAULTS.widgetKey,
    buttonLabel: currentScript?.dataset.buttonLabel || DEFAULTS.buttonLabel,
    accentColor: currentScript?.dataset.accentColor || DEFAULTS.accentColor,
    position: currentScript?.dataset.position || DEFAULTS.position
  });
})();
`;

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
