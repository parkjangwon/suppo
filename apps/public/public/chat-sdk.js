(function () {
  var DEFAULTS = {
    widgetKey: "crinity-chat-widget",
    enabled: true,
    buttonLabel: "채팅 상담",
    buttonImageUrl: "",
    buttonImageFit: "contain",
    buttonBorderColor: "",
    buttonBorderWidth: 0,
    buttonHoverEffect: "lift",
    buttonBadgeText: "",
    buttonBadgeColor: "#ef4444",
    buttonBadgePosition: "top-right",
    showUnreadBadge: true,
    buttonSize: "md",
    buttonShape: "pill",
    buttonShadow: "soft",
    accentColor: "#0f172a",
    position: "bottom-right"
  };

  function applyButtonSize(button, image, size) {
    var config = size || "md";
    if (config === "sm") {
      button.style.minWidth = "52px";
      button.style.minHeight = "52px";
      button.style.padding = image ? "8px" : "10px 14px";
      if (image) {
        image.style.maxWidth = "28px";
        image.style.maxHeight = "28px";
      }
      return;
    }

    if (config === "lg") {
      button.style.minWidth = "76px";
      button.style.minHeight = "76px";
      button.style.padding = image ? "14px" : "18px 24px";
      if (image) {
        image.style.maxWidth = "48px";
        image.style.maxHeight = "48px";
      }
      return;
    }

    button.style.minWidth = "64px";
    button.style.minHeight = "64px";
    button.style.padding = image ? "10px" : "14px 18px";
    if (image) {
      image.style.maxWidth = "40px";
      image.style.maxHeight = "40px";
    }
  }

  function applyButtonShape(button, shape) {
    if (shape === "circle") {
      button.style.borderRadius = "9999px";
      return;
    }

    if (shape === "rounded") {
      button.style.borderRadius = "18px";
      return;
    }

    button.style.borderRadius = "9999px";
  }

  function applyButtonShadow(button, shadow) {
    if (shadow === "none") {
      button.style.boxShadow = "none";
      return;
    }

    if (shadow === "strong") {
      button.style.boxShadow = "0 24px 60px rgba(15, 23, 42, 0.34)";
      return;
    }

    button.style.boxShadow = "0 18px 45px rgba(15, 23, 42, 0.24)";
  }

  function applyButtonBorder(button, color, width) {
    var borderWidth = Number(width || 0);
    if (!borderWidth) {
      button.style.border = "none";
      return;
    }
    button.style.border = borderWidth + "px solid " + (color || "rgba(255,255,255,0.4)");
  }

  function applyHoverEffect(button, effect) {
    button.style.transition = "transform 180ms ease, box-shadow 180ms ease, filter 180ms ease";
    button.onmouseenter = null;
    button.onmouseleave = null;

    if (effect === "none") {
      return;
    }

    if (effect === "glow") {
      button.onmouseenter = function () {
        button.style.filter = "brightness(1.06)";
        button.style.boxShadow = "0 0 0 8px rgba(15, 23, 42, 0.08), " + button.style.boxShadow;
      };
      button.onmouseleave = function () {
        button.style.filter = "";
        applyButtonShadow(button, button.dataset.crinityShadow);
      };
      return;
    }

    if (effect === "pulse") {
      button.onmouseenter = function () {
        button.style.transform = "scale(1.05)";
      };
      button.onmouseleave = function () {
        button.style.transform = "";
      };
      return;
    }

    button.onmouseenter = function () {
      button.style.transform = "translateY(-3px)";
    };
    button.onmouseleave = function () {
      button.style.transform = "";
    };
  }

  function upsertBadge(button, text) {
    var badge = button.querySelector('[data-crinity-badge]');
    if (!text) {
      if (badge) badge.remove();
      return;
    }

    if (!badge) {
      badge = document.createElement('span');
      badge.setAttribute('data-crinity-badge', 'true');
      badge.style.position = 'absolute';
      badge.style.top = '-6px';
      badge.style.right = '-6px';
      badge.style.minWidth = '22px';
      badge.style.height = '22px';
      badge.style.padding = '0 6px';
      badge.style.borderRadius = '9999px';
      badge.style.display = 'inline-flex';
      badge.style.alignItems = 'center';
      badge.style.justifyContent = 'center';
      badge.style.color = '#fff';
      badge.style.font = '700 11px/1 sans-serif';
      badge.style.boxShadow = '0 10px 20px rgba(15,23,42,0.2)';
      button.appendChild(badge);
    }

    badge.textContent = text;
  }

  function applyBadgeStyles(button, color, position) {
    var badge = button.querySelector('[data-crinity-badge]');
    if (!badge) return;

    badge.style.background = color || '#ef4444';
    badge.style.top = '';
    badge.style.right = '';
    badge.style.bottom = '';
    badge.style.left = '';

    if (position === 'top-left') {
      badge.style.top = '-6px';
      badge.style.left = '-6px';
      return;
    }

    if (position === 'bottom-right') {
      badge.style.bottom = '-6px';
      badge.style.right = '-6px';
      return;
    }

    if (position === 'bottom-left') {
      badge.style.bottom = '-6px';
      badge.style.left = '-6px';
      return;
    }

    badge.style.top = '-6px';
    badge.style.right = '-6px';
  }

  function getSession(widgetKey) {
    try {
      var raw = window.localStorage.getItem('crinity-chat-session:' + widgetKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function resolveUnreadBadgeText(config, payload) {
    if (payload.unreadCount > 0 && config.showUnreadBadge !== false) {
      return payload.unreadCount > 99 ? '99+' : String(payload.unreadCount);
    }
    return config.buttonBadgeText || '';
  }

  async function refreshLauncherBadge(button, origin, config) {
    var session = getSession(config.widgetKey);
    if (!session || !session.conversationId || !session.token) {
      upsertBadge(button, config.buttonBadgeText || '');
      return;
    }

    try {
      var response = await fetch(
        origin +
          '/api/chat/conversations/' +
          encodeURIComponent(session.conversationId) +
          '?token=' +
          encodeURIComponent(session.token)
      );
      if (!response.ok) {
        upsertBadge(button, config.buttonBadgeText || '');
        return;
      }
      var data = await response.json();
      var comments = data.ticket && data.ticket.comments ? data.ticket.comments : [];
      var lastAgentComment = null;
      for (var i = comments.length - 1; i >= 0; i -= 1) {
        if (comments[i].authorType === 'AGENT') {
          lastAgentComment = comments[i];
          break;
        }
      }

      var unreadCount = 0;
      if (lastAgentComment && session.lastReadCommentId !== lastAgentComment.id) {
        unreadCount = 1;
      }

      upsertBadge(button, resolveUnreadBadgeText(config, { unreadCount: unreadCount }));
    } catch (_error) {
      upsertBadge(button, config.buttonBadgeText || '');
    }
  }

  function getCurrentScript() {
    return document.currentScript || document.querySelector('script[data-crinity-chat-sdk]');
  }

  function getOrigin(script) {
    try {
      return new URL(script.src, window.location.href).origin;
    } catch (_error) {
      return window.location.origin;
    }
  }

  function buildWidgetUrl(origin, config) {
    var params = new URLSearchParams();
    if (config.widgetKey) params.set("widgetKey", config.widgetKey);
    return origin + "/chat/widget" + (params.toString() ? "?" + params.toString() : "");
  }

  function createWidget(config) {
    if (config.enabled === false) return;

    var existingButton = document.getElementById("crinity-chat-launcher");
    if (existingButton) {
      existingButton.remove();
    }

    var script = getCurrentScript();
    var origin = getOrigin(script);

    var button = document.createElement("button");
    button.id = "crinity-chat-launcher";
    button.type = "button";
    button.style.position = "fixed";
    button.style.zIndex = "2147483647";
    button.style.right = config.position === "bottom-left" ? "auto" : "24px";
    button.style.left = config.position === "bottom-left" ? "24px" : "auto";
    button.style.bottom = "24px";
    button.style.border = "none";
    button.style.cursor = "pointer";
    button.style.background = config.accentColor;
    button.style.color = "#fff";
    button.style.font = "600 14px/1.2 sans-serif";
    button.style.display = "flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.overflow = "visible";
    button.dataset.crinityShadow = config.buttonShadow || "soft";

    var image = null;
    if (config.buttonImageUrl) {
      image = document.createElement("img");
      image.src = config.buttonImageUrl;
      image.alt = config.buttonLabel || "채팅";
      image.style.display = "block";
      image.style.objectFit = config.buttonImageFit || "contain";
      button.appendChild(image);
    } else {
      button.textContent = config.buttonLabel;
    }

    applyButtonShape(button, config.buttonShape);
    applyButtonShadow(button, config.buttonShadow);
    applyButtonBorder(button, config.buttonBorderColor, config.buttonBorderWidth);
    applyButtonSize(button, image, config.buttonSize);
    applyHoverEffect(button, config.buttonHoverEffect);

    button.addEventListener("click", function () {
      var width = 420;
      var height = 760;
      var left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
      var top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
      window.open(
        buildWidgetUrl(origin, config),
        "crinity-chat-widget",
        "popup=yes,width=" + width + ",height=" + height + ",left=" + left + ",top=" + top
      );
    });

    document.body.appendChild(button);
    void refreshLauncherBadge(button, origin, config);
    applyBadgeStyles(button, config.buttonBadgeColor, config.buttonBadgePosition);
    window.setInterval(function () {
      void refreshLauncherBadge(button, origin, config).then(function () {
        applyBadgeStyles(button, config.buttonBadgeColor, config.buttonBadgePosition);
      });
    }, 5000);
  }

  function init(options) {
    var script = getCurrentScript();
    var origin = getOrigin(script);
    var requestedWidgetKey = options && options.widgetKey ? options.widgetKey : script && script.dataset.widgetKey ? script.dataset.widgetKey : "";
    var widgetSettingsUrl = origin + "/api/chat/widget-settings" + (requestedWidgetKey ? "?widgetKey=" + encodeURIComponent(requestedWidgetKey) : "");

    return fetch(widgetSettingsUrl)
      .then(function (response) {
        if (!response.ok) throw new Error("Failed to fetch widget settings");
        return response.json();
      })
      .then(function (settings) {
        createWidget({
          widgetKey: requestedWidgetKey || settings.widgetKey || DEFAULTS.widgetKey,
          enabled: typeof settings.enabled === "boolean" ? settings.enabled : DEFAULTS.enabled,
          buttonLabel: options && options.buttonLabel ? options.buttonLabel : script && script.dataset.buttonLabel ? script.dataset.buttonLabel : settings.buttonLabel || DEFAULTS.buttonLabel,
          buttonImageUrl: options && options.buttonImageUrl ? options.buttonImageUrl : settings.buttonImageUrl || DEFAULTS.buttonImageUrl,
          buttonImageFit: options && options.buttonImageFit ? options.buttonImageFit : settings.buttonImageFit || DEFAULTS.buttonImageFit,
          buttonBorderColor: options && options.buttonBorderColor ? options.buttonBorderColor : settings.buttonBorderColor || '',
          buttonBorderWidth: options && typeof options.buttonBorderWidth !== 'undefined' ? options.buttonBorderWidth : settings.buttonBorderWidth || 0,
          buttonHoverEffect: options && options.buttonHoverEffect ? options.buttonHoverEffect : settings.buttonHoverEffect || 'lift',
          buttonBadgeText: options && options.buttonBadgeText ? options.buttonBadgeText : settings.buttonBadgeText || '',
          buttonBadgeColor: options && options.buttonBadgeColor ? options.buttonBadgeColor : settings.buttonBadgeColor || DEFAULTS.buttonBadgeColor,
          buttonBadgePosition: options && options.buttonBadgePosition ? options.buttonBadgePosition : settings.buttonBadgePosition || DEFAULTS.buttonBadgePosition,
          showUnreadBadge: options && typeof options.showUnreadBadge !== 'undefined' ? options.showUnreadBadge : settings.showUnreadBadge,
          buttonSize: options && options.buttonSize ? options.buttonSize : settings.buttonSize || DEFAULTS.buttonSize,
          buttonShape: options && options.buttonShape ? options.buttonShape : settings.buttonShape || DEFAULTS.buttonShape,
          buttonShadow: options && options.buttonShadow ? options.buttonShadow : settings.buttonShadow || DEFAULTS.buttonShadow,
          accentColor: options && options.accentColor ? options.accentColor : script && script.dataset.accentColor ? script.dataset.accentColor : settings.accentColor || DEFAULTS.accentColor,
          position: options && options.position ? options.position : script && script.dataset.position ? script.dataset.position : settings.position || DEFAULTS.position,
        });
      })
      .catch(function () {
        createWidget(Object.assign({}, DEFAULTS, options || {}));
      });
  }

  window.CrinityChatWidget = {
    init: init,
  };

  init();
})();
