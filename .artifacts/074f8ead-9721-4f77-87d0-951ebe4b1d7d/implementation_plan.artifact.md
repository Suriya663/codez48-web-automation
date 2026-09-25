# Real Content-Aware PPT Image Intelligence Architecture Plan

Replacing generic abstract 3-circle diagram fallbacks with a real multi-source image search pipeline (Wikimedia Commons API + Unsplash photography endpoints), per-slide visual intent planning, relevance ranking, safe image downloading, and non-overlapping slide layout placement.

## Root Cause Analysis

1. **Abstract Diagram Fallback**:
   When `powerpoint-adapter.js` failed to obtain a local image file, line 187 called `slideImageGenerator.generateSlideImage()`. `slideImageGenerator.generateSlideImage()` was hardcoded to draw a 3-circle node diagram BMP image. Every slide receiving a visual layout ended up displaying that identical 3-circle node graphic regardless of the slide's topic.
2. **Search Endpoint Deprecation**:
   `source.unsplash.com` deprecated its anonymous redirect service, causing image fetch HEAD/GET checks to time out or fail.

---

## Proposed Solution Architecture

```text
USER PPT REQUEST ("Create a 15-slide presentation about Human Values and Ethics")
                             │
                             ▼
1. AI Generates Complete Presentation (Title & Bullets for All 15 Slides)
                             │
                             ▼
2. Per-Slide Visual Intent Planner (powerpoint-adapter.js)
   - Analyzes Slide 3: "Empathy, Compassion & Human Connection"
   - Visual Intent: "People supportive conversation empathy listening"
   - Search Query: "empathy compassion"
                             │
                             ▼
3. Backend Multi-Source Image Search API (netlify/functions/image-search.js)
   - Queries Wikimedia Commons API & Unsplash Photography API
   - Returns candidate photographic & illustrative image URLs + metadata
                             │
                             ▼
4. Relevance Ranker & Image Downloader
   - Ranks candidate images against slide keywords
   - Downloads top-ranked image to assets/slide_img_3.jpg
   - Verifies file integrity (JPEG/PNG, size > 0)
                             │
                             ▼
5. PowerPoint COM Non-Overlapping Layout Engine
   - Calculates isolated bounding boxes (text_left, image_left, image_top)
   - Inserts picture shape with LockAspectRatio = msoTrue
   - If image search fails: Uses clean full_text layout (ZERO abstract diagrams)
                             │
                             ▼
6. 15-Slide Audit Report & Verification
   - Audits all 15 slides and verifies real photographic/topic images
```

---

## User Review Required

> [!IMPORTANT]
> **Eradication of Generic Abstract Diagrams**:
> - The hardcoded 3-circle node diagram generator in `slide-image-generator.js` will be completely replaced.
> - Slides will only feature **real, relevant photographic or illustrative images** downloaded from the backend search provider (Wikimedia Commons API / Unsplash).
> - If an image search returns no relevant results for a slide, the slide will gracefully render as a clean `full_text` layout. **Unrelated abstract fallback graphics are strictly forbidden.**

---

## Proposed Changes

### 1. Multi-Source Backend Image Search API
#### [MODIFY] [netlify/functions/image-search.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/image-search.js)
- Integrate Wikimedia Commons API (`https://commons.wikimedia.org/w/api.php`) & Unsplash Photography endpoints.
- Returns candidate image URLs with titles, MIME types, and dimensions.

### 2. Per-Slide Visual Intent Planner & Downloader
#### [MODIFY] [powerpoint-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/pilot/adapters/powerpoint-adapter.js)
- Extracts visual intent and query for each slide.
- Calls `image-search.js` endpoint and ranks candidates.
- Downloads JPEG/PNG images to `Codez48 Preview/assets/slide_img_<index>.jpg`.
- Binds downloaded `slide.imagePath` or sets `full_text` layout if no high-relevance image found.

---

## Verification Plan

### Test Scenario: 15-Slide "Human Values and Ethics" Real Presentation Test
1. **Command**:
   `codez48 pilot` -> *"Create a professional 15-slide PowerPoint presentation about Human Values and Ethics. Generate complete AI content for all 15 slides and add relevant images where appropriate."*
2. **Verification Checklist**:
   - [ ] Slide 3 ("Empathy & Compassion"): Real photograph/illustration downloaded and inserted (0 abstract 3-circle diagrams).
   - [ ] Slide 4 ("Integrity & Honesty"): Real topic-specific image downloaded and inserted.
   - [ ] Slide 8 ("Environmental Sustainability"): Real nature/ecology photograph inserted.
   - [ ] 0 abstract diagram `.bmp` fallbacks used across all 15 slides.
   - [ ] 15-slide audit table generated.
   - [ ] Presentation saved as `.pptx` and opened in PowerPoint.
