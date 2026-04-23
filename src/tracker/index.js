(window => {
  const {
    screen: { width, height },
    navigator: { language, doNotTrack: ndnt, msDoNotTrack: msdnt },
    location,
    document,
    history,
    top,
    doNotTrack,
  } = window;
  const { currentScript, referrer } = document;
  if (!currentScript) return;

  const { hostname, href, origin } = location;

  let localStorage;
  try {
    localStorage = href.startsWith('data:') ? undefined : window.localStorage;
  } catch {
    /* (DOMException) SecurityError: Access is denied for this document. */
  }

  const _data = 'data-';
  const _false = 'false';
  const _true = 'true';
  const attr = currentScript.getAttribute.bind(currentScript);
  const config = value => attr(`${_data}${value}`);

  const website = config('website-id');
  const hostUrl = config('host-url');
  const beforeSend = config('before-send');
  const tag = config('tag') || undefined;
  const autoTrack = config('auto-track') !== _false;
  const dnt = config('do-not-track') === _true;
  const excludeSearch = config('exclude-search') === _true;
  const excludeHash = config('exclude-hash') === _true;
  const domain = config('domains') || '';
  const credentials = config('fetch-credentials') || 'omit';
  const perf = config('performance') === _true;
  const heatmapEnabled = config('heatmap') === _true;

  const domains = domain.split(',').map(n => n.trim());
  const host =
    hostUrl || '__COLLECT_API_HOST__' || currentScript.src.split('/').slice(0, -1).join('/');
  const endpoint = `${host.replace(/\/$/, '')}__COLLECT_API_ENDPOINT__`;
  const heatmapEndpoint = `${host.replace(/\/$/, '')}/api/heatmap`;
  const screen = `${width}x${height}`;
  const eventRegex = /data-umami-event-([\w-_]+)/;
  const eventNameAttribute = `${_data}umami-event`;
  const delayDuration = 300;

  /* Helper functions */

  const normalize = raw => {
    if (!raw) return raw;
    try {
      const u = new URL(raw, location.href);
      if (excludeSearch) u.search = '';
      if (excludeHash) u.hash = '';
      return u.toString();
    } catch {
      return raw;
    }
  };

  const getPayload = () => ({
    website,
    screen,
    language,
    title: document.title,
    hostname,
    url: currentUrl,
    referrer: currentRef,
    tag,
    id: identity ? identity : undefined,
  });

  const hasDoNotTrack = () => {
    const dnt = doNotTrack || ndnt || msdnt;
    return dnt === 1 || dnt === '1' || dnt === 'yes';
  };

  /* Event handlers */

  const handlePush = (_state, _title, url) => {
    if (!url) return;

    if (typeof flushPerformance === 'function') {
      flushPerformance();
    }

    currentRef = currentUrl;
    currentUrl = normalize(new URL(url, location.href).toString());

    if (currentUrl !== currentRef) {
      setTimeout(track, delayDuration);
    }
  };

  const handlePathChanges = () => {
    const hook = (_this, method, callback) => {
      const orig = _this[method];
      return (...args) => {
        callback.apply(null, args);
        return orig.apply(_this, args);
      };
    };

    history.pushState = hook(history, 'pushState', handlePush);
    history.replaceState = hook(history, 'replaceState', handlePush);
  };

  const handleClicks = () => {
    const trackElement = async el => {
      const eventName = el.getAttribute(eventNameAttribute);
      if (eventName) {
        const eventData = {};

        el.getAttributeNames().forEach(name => {
          const match = name.match(eventRegex);
          if (match) eventData[match[1]] = el.getAttribute(name);
        });

        return track(eventName, eventData);
      }
    };
    const onClick = async e => {
      const el = e.target;
      const parentElement = el.closest('a,button');
      if (!parentElement) return trackElement(el);

      const { href, target } = parentElement;
      if (!parentElement.getAttribute(eventNameAttribute)) return;

      if (parentElement.tagName === 'BUTTON') {
        return trackElement(parentElement);
      }
      if (parentElement.tagName === 'A' && href) {
        const external =
          target === '_blank' ||
          e.ctrlKey ||
          e.shiftKey ||
          e.metaKey ||
          (e.button && e.button === 1);
        if (!external) e.preventDefault();
        return trackElement(parentElement).then(() => {
          if (!external) {
            (target === '_top' ? top.location : location).href = href;
          }
        });
      }
    };
    document.addEventListener('click', onClick, true);
  };

  /* Tracking functions */

  const trackingDisabled = () =>
    disabled ||
    !website ||
    localStorage?.getItem('umami.disabled') ||
    (domain && !domains.includes(hostname)) ||
    (dnt && hasDoNotTrack());

  const send = async (payload, type = 'event') => {
    if (trackingDisabled()) return;

    const callback = window[beforeSend];

    if (typeof callback === 'function') {
      payload = await Promise.resolve(callback(type, payload));
    }

    if (!payload) return;

    try {
      const res = await fetch(endpoint, {
        keepalive: true,
        method: 'POST',
        body: JSON.stringify({ type, payload }),
        headers: {
          'Content-Type': 'application/json',
          ...(typeof cache !== 'undefined' && { 'x-umami-cache': cache }),
        },
        credentials,
      });

      const data = await res.json();
      if (data) {
        disabled = !!data.disabled;
        cache = data.cache;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      /* no-op */
    }
  };

  const init = () => {
    if (!initialized) {
      initialized = true;
      track();
      handlePathChanges();
      handleClicks();
      if (perf) initPerformance();
      if (heatmapEnabled) initHeatmap();
    }
  };

  const track = (name, data) => {
    if (typeof name === 'string') return send({ ...getPayload(), name, data });
    if (typeof name === 'object') return send({ ...name });
    if (typeof name === 'function') return send(name(getPayload()));
    return send(getPayload());
  };

  const identify = (id, data) => {
    if (typeof id === 'string') {
      identity = id;
    }

    cache = '';
    return send(
      {
        ...getPayload(),
        data: typeof id === 'object' ? id : data,
      },
      'identify',
    );
  };

  /* Performance */

  const initPerformance = () => {
    const metrics = {};
    let sent = false;
    let timeoutId;
    let isInitialLoad = true;
    let activationStart = 0;
    let pageStartTime = 0;

    const observe = (type, callback) => {
      try {
        const observer = new PerformanceObserver(list => {
          list.getEntries().forEach(callback);
        });
        observer.observe({ type, buffered: true });
      } catch {
        /* not supported */
      }
    };

    // TTFB
    observe('navigation', entry => {
      activationStart = entry.activationStart || 0;
      metrics.ttfb = Math.max(entry.responseStart - activationStart, 0);
    });

    // FCP
    observe('paint', entry => {
      if (entry.name === 'first-contentful-paint') {
        metrics.fcp = Math.max(entry.startTime - activationStart, 0);
      }
    });

    // LCP
    observe('largest-contentful-paint', entry => {
      metrics.lcp = Math.max(entry.startTime - activationStart, 0);
    });

    // CLS - session windows algorithm (gap < 1s, max 5s duration; report worst window)
    let clsSessionValue = 0;
    let clsSessionEntries = [];
    observe('layout-shift', entry => {
      if (!entry.hadRecentInput) {
        const lastEntry = clsSessionEntries[clsSessionEntries.length - 1];
        const firstEntry = clsSessionEntries[0];
        if (
          lastEntry &&
          entry.startTime - lastEntry.startTime - lastEntry.duration < 1000 &&
          entry.startTime - firstEntry.startTime < 5000
        ) {
          clsSessionValue += entry.value;
          clsSessionEntries.push(entry);
        } else {
          clsSessionValue = entry.value;
          clsSessionEntries = [entry];
        }
        if (clsSessionValue > (metrics.cls || 0)) {
          metrics.cls = clsSessionValue;
        }
      }
    });

    // INP - group by interactionId, 98th percentile, 40ms threshold
    let interactions = {};
    try {
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.interactionId) {
            const existing = interactions[entry.interactionId];
            if (!existing || entry.duration > existing) {
              interactions[entry.interactionId] = entry.duration;
            }
            const values = Object.values(interactions).sort((a, b) => b - a);
            if (values.length) {
              const p98Index = Math.floor(Math.max(values.length, 10) * 0.02);
              metrics.inp = values[Math.min(p98Index, values.length - 1)];
            }
          }
        });
      });
      observer.observe({ type: 'event', buffered: true, durationThreshold: 40 });
    } catch {
      /* not supported */
    }

    const getEntriesByType = type => {
      try {
        return window.performance?.getEntriesByType?.(type) || [];
      } catch {
        return [];
      }
    };

    const applyFallbackMetrics = () => {
      if (!isInitialLoad) return;

      if (metrics.ttfb === undefined) {
        const navigation = getEntriesByType('navigation')?.[0];
        if (navigation) {
          metrics.ttfb = Math.max(navigation.responseStart - (navigation.activationStart || 0), 0);
        }
      }

      if (metrics.fcp === undefined) {
        const fcpEntry = getEntriesByType('paint')?.find(
          entry => entry.name === 'first-contentful-paint',
        );
        if (fcpEntry) {
          metrics.fcp = Math.max(fcpEntry.startTime - activationStart, 0);
        }
      }

      if (metrics.lcp === undefined) {
        const lcpEntries = getEntriesByType('largest-contentful-paint');
        const lcpEntry = lcpEntries?.[lcpEntries.length - 1];
        if (lcpEntry) {
          metrics.lcp = Math.max(lcpEntry.startTime - activationStart, 0);
        }
      }
    };

    const sendPerformance = () => {
      if (sent) return;

      applyFallbackMetrics();
      metrics.duration = Math.round(performance.now() - pageStartTime);

      sent = true;
      if (timeoutId) clearTimeout(timeoutId);
      send({ ...getPayload(), ...metrics }, 'performance');
    };

    flushPerformance = () => {
      sendPerformance();
      isInitialLoad = false;
      Object.keys(metrics).forEach(k => {
        delete metrics[k];
      });
      activationStart = 0;
      pageStartTime = performance.now();
      clsSessionValue = 0;
      clsSessionEntries = [];
      interactions = {};
      sent = false;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(sendPerformance, 10000);
    };
    timeoutId = setTimeout(sendPerformance, 10000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') sendPerformance();
    });
    window.addEventListener('pagehide', sendPerformance);
  };

  /* Heatmap tracking */

  const initHeatmap = () => {
    const FLUSH_COUNT = 50;
    const FLUSH_INTERVAL = 10000;
    const MOVE_THROTTLE = 100;

    let heatmapBuffer = [];
    let flushTimer = null;

    const getNormalizedCoords = (clientX, clientY) => {
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const vh =
        window.innerHeight || document.documentElement.clientHeight;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        vh,
      );
      // Store as permille (0–10000) of viewport width and total document height
      const x = Math.round((clientX / vw) * 10000);
      const y = Math.round(((clientY + scrollY) / docHeight) * 10000);
      return { x, y };
    };

    const getCurrentPath = () => {
      try {
        const u = new URL(currentUrl);
        // Truncate to 500 chars to match the DB column length
        return (u.pathname + u.search).slice(0, 500);
      } catch {
        return currentUrl.slice(0, 500);
      }
    };

    const addPoint = (x, y, eventType) => {
      if (trackingDisabled()) return;
      heatmapBuffer.push({
        urlPath: getCurrentPath(),
        x,
        y,
        eventType,
        timestamp: Math.floor(Date.now() / 1000),
      });
      if (heatmapBuffer.length >= FLUSH_COUNT) flushHeatmap();
    };

    const flushHeatmap = (useKeepalive = false) => {
      if (!heatmapBuffer.length) return;
      if (!cache) return;

      const points = heatmapBuffer.splice(0, heatmapBuffer.length);

      const body = JSON.stringify({
        type: 'heatmap',
        payload: {
          website,
          points,
          timestamp: Math.floor(Date.now() / 1000),
        },
      });

      try {
        fetch(heatmapEndpoint, {
          keepalive: useKeepalive && body.length < 60000,
          method: 'POST',
          body,
          headers: {
            'Content-Type': 'application/json',
            'x-umami-cache': cache,
          },
          credentials,
        }).catch(() => {/* no-op */});
      } catch {
        /* no-op */
      }
    };

    const scheduleFlush = () => {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(() => flushHeatmap(), FLUSH_INTERVAL);
    };

    // Click tracking (event type 1)
    document.addEventListener('click', e => {
      const { x, y } = getNormalizedCoords(e.clientX, e.clientY);
      addPoint(x, y, 1);
      scheduleFlush();
    }, true);

    // Scroll-depth tracking (event type 2)
    let maxScrollY = 0;
    let scrollScheduled = false;
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      if (scrollY <= maxScrollY) return;
      maxScrollY = scrollY;
      if (scrollScheduled) return;
      scrollScheduled = true;
      setTimeout(() => {
        scrollScheduled = false;
        // Record the maximum scroll depth reached: x is center of viewport, y reflects the scroll position
        const { x, y } = getNormalizedCoords(window.innerWidth / 2, maxScrollY);
        addPoint(x, y, 2);
        scheduleFlush();
      }, 500);
    }, { passive: true });

    // Mouse-move tracking (event type 3), throttled
    let lastMove = 0;
    document.addEventListener('mousemove', e => {
      const now = Date.now();
      if (now - lastMove < MOVE_THROTTLE) return;
      lastMove = now;
      const { x, y } = getNormalizedCoords(e.clientX, e.clientY);
      addPoint(x, y, 3);
      scheduleFlush();
    }, { passive: true });

    // Flush on page unload
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushHeatmap(true);
    });
    window.addEventListener('pagehide', () => flushHeatmap(true));

    scheduleFlush();
  };

  /* Start */

  if (!window.umami) {
    window.umami = {
      track,
      identify,
      getSession: () => ({ cache, website }),
    };
  }

  let currentUrl = normalize(href);
  let currentRef = normalize(referrer.startsWith(origin) ? '' : referrer);

  let initialized = false;
  let disabled = false;
  let cache;
  let identity;
  let flushPerformance;

  if (autoTrack && !trackingDisabled()) {
    if (document.readyState === 'complete') {
      init();
    } else {
      document.addEventListener('readystatechange', init, true);
    }
  }
})(window);
