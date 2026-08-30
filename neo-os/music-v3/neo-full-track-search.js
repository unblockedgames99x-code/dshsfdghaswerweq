(() => {
    const appsScriptHost = 'script.google.com';
    const searchOrigin = 'https://vcsa.huangqirui.xyz';
    const nativeAppendChild = HTMLHeadElement.prototype.appendChild;

    HTMLHeadElement.prototype.appendChild = function appendNeoMusicSearch(node) {
        if (!(node instanceof HTMLScriptElement) || !node.src) {
            return nativeAppendChild.call(this, node);
        }

        let request;
        try {
            request = new URL(node.src, window.location.href);
        } catch (_) {
            return nativeAppendChild.call(this, node);
        }

        if (
            request.hostname !== appsScriptHost ||
            request.searchParams.get('mode') !== 'music-search'
        ) {
            return nativeAppendChild.call(this, node);
        }

        const query = String(request.searchParams.get('q') || '').trim();
        const callback = String(request.searchParams.get('callback') || '');
        const target = `${searchOrigin}/api/music/search?q=${encodeURIComponent(query)}`;
        const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`;

        fetch(proxy, { cache: 'no-store' })
            .then((response) => {
                if (!response.ok) throw new Error(`Search failed: ${response.status}`);
                return response.json();
            })
            .then((payload) => {
                if (typeof window[callback] === 'function') window[callback](payload);
            })
            .catch(() => {
                if (typeof node.onerror === 'function') node.onerror(new Event('error'));
            });

        return node;
    };
})();
