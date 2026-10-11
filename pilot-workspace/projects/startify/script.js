
        window.addEventListener('error', function(e) {
            if (e.message && (e.message.includes('QUIC') || e.message.includes('network'))) {
                console.warn("[PROTOCOL GUARD] Network instability detected. Standard fallback hinted.");
            }
        }, true);
    

        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '1318887030322672');
        fbq('track', 'PageView');
    

        // Global Protocol Guard (Fix for net::ERR_QUIC_PROTOCOL_ERROR)
        window.onerror = function(message, source, lineno, colno, error) {
            if (message.includes('ERR_QUIC_PROTOCOL_ERROR')) {
                console.warn("[PROTOCOL_GUARD] QUIC failure detected. Forcing stable fallback...");
                // Force a reload to try HTTP/2 or standard HTTP
                location.reload();
            }
        };

        // Network Reliability Monitor
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => {
                console.log(`[NET_SYNC] Network type changed to: ${navigator.connection.effectiveType}`);
            });
        }
    