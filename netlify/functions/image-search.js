const fetch = require('node-fetch');

const jsonResponse = (statusCode, data) => ({
    statusCode,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(data)
});

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
            }
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const query = (body.query || event.queryStringParameters?.query || 'technology').trim();

        if (!query) {
            return jsonResponse(400, { success: false, error: 'Search query required' });
        }

        console.log(`[IMAGE SEARCH API] Querying Wikimedia Commons for: "${query}"`);

        // Query Wikimedia Commons API for high-resolution royalty-free images
        const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=15&prop=imageinfo&iiprop=url|mime|size&format=json`;

        const wikiRes = await fetch(wikiUrl, {
            headers: { 'User-Agent': 'Codez48Pilot/1.0 (https://codez48.netlify.app)' },
            timeout: 6000
        }).catch(() => null);

        let candidates = [];

        if (wikiRes && wikiRes.ok) {
            const wikiData = await wikiRes.json();
            if (wikiData.query && wikiData.query.pages) {
                const pages = Object.values(wikiData.query.pages);
                candidates = pages.map(p => {
                    const info = p.imageinfo && p.imageinfo[0];
                    if (!info || !info.url) return null;
                    const mime = (info.mime || '').toLowerCase();
                    const u = info.url.toLowerCase();
                    if (mime.includes('jpeg') || mime.includes('png') || u.endsWith('.jpg') || u.endsWith('.jpeg') || u.endsWith('.png')) {
                        return {
                            title: p.title ? p.title.replace(/^File:/i, '') : query,
                            url: info.url,
                            width: info.width || 800,
                            height: info.height || 600,
                            source: 'Wikimedia Commons'
                        };
                    }
                    return null;
                }).filter(Boolean);
            }
        }

        // Fallback to LoremFlickr / Picsum photography if Wikimedia returned no direct JPG/PNG
        if (candidates.length === 0) {
            const cleanQuery = encodeURIComponent(query.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim());
            const fallbackUrl = `https://loremflickr.com/800/600/${cleanQuery}`;
            candidates.push({
                title: query,
                url: fallbackUrl,
                width: 800,
                height: 600,
                source: 'LoremFlickr Photography'
            });
        }

        return jsonResponse(200, {
            success: true,
            query: query,
            totalCandidates: candidates.length,
            selectedImageUrl: candidates[0].url,
            images: candidates
        });
    } catch (error) {
        console.error('[IMAGE SEARCH ERROR]', error.message);
        return jsonResponse(500, { success: false, error: error.message });
    }
};
