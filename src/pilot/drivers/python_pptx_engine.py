#!/usr/bin/env python3
"""
CODEZ48 ULTRA-PREMIUM NATIVE PRESENTATION GENERATION ENGINE (python-pptx)
Generates breathtaking 16:9 widescreen executive decks with high-density visual architecture,
frosted glass cards, KPI metrics, multi-column flows, college branding, and embedded images.
Guarantees 100% permission resilience, eliminating COM 'Access Denied' errors.
Includes 12 diverse color themes and 16+ non-repetitive layout templates.
"""

import os
import sys
import json
import base64
import tempfile
import shutil
import hashlib

try:
    from pptx import Presentation
    from pptx.util import Inches, Pt
    from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.dml.color import RGBColor
except ImportError:
    print(json.dumps({"success": False, "error": "python-pptx is required. Run 'pip install python-pptx'"}))
    sys.exit(1)

# Comprehensive Suite of 12 Ultra-Luxury & Distinct Color Palettes
THEMES = {
    "EXECUTIVE_CHEVRON_ORANGE": {
        "name": "Executive Chevron Orange & Slate Navy",
        "bg": RGBColor(255, 255, 255),       # Pure White
        "card_bg": RGBColor(248, 249, 250),  # Off-White Card
        "card_border": RGBColor(226, 232, 240),
        "title": RGBColor(30, 37, 43),       # Slate Navy #1E252B
        "accent": RGBColor(245, 130, 32),    # Vibrant Orange #F58220
        "subtitle": RGBColor(245, 130, 32),  # Brand Orange
        "body": RGBColor(70, 80, 95),        # Deep Slate Body
        "muted": RGBColor(148, 163, 184),    # Muted Slate
        "pill_bg": RGBColor(245, 130, 32),   # Orange Pill
        "pill_text": RGBColor(255, 255, 255) # White Pill Text
    },
    "EXECUTIVE_LUXURY": {
        "name": "Executive Luxury",
        "bg": RGBColor(10, 15, 29),          # Obsidian Midnight
        "card_bg": RGBColor(19, 27, 46),     # Dark Slate Card
        "card_border": RGBColor(45, 60, 95), # Luminous Edge
        "title": RGBColor(255, 255, 255),    # Pure White
        "accent": RGBColor(229, 184, 11),    # Champagne Gold
        "subtitle": RGBColor(156, 175, 206), # Platinum Blue
        "body": RGBColor(226, 232, 240),     # Soft Gray
        "muted": RGBColor(100, 116, 139),    # Dim Slate
        "pill_bg": RGBColor(30, 41, 59),     # Badge Background
        "pill_text": RGBColor(229, 184, 11)  # Badge Text
    },
    "EMERALD_VENTURE": {
        "name": "Emerald Venture",
        "bg": RGBColor(6, 28, 23),           # Deep Pine Emerald
        "card_bg": RGBColor(13, 45, 37),     # Emerald Glass Card
        "card_border": RGBColor(16, 185, 129),# Vivid Emerald Green
        "title": RGBColor(255, 255, 255),    # Pure White
        "accent": RGBColor(52, 211, 153),    # Luminous Mint
        "subtitle": RGBColor(167, 243, 208), # Soft Mint
        "body": RGBColor(236, 253, 245),     # Frost Mint
        "muted": RGBColor(110, 150, 135),    # Muted Sage
        "pill_bg": RGBColor(6, 78, 59),      # Deep Forest Pill
        "pill_text": RGBColor(110, 231, 183) # Mint Pill Text
    },
    "SUNSET_AMBER": {
        "name": "Sunset Amber",
        "bg": RGBColor(26, 16, 22),          # Deep Velvet Wine
        "card_bg": RGBColor(43, 24, 34),     # Mulberry Slate Card
        "card_border": RGBColor(244, 63, 94),# Vivid Rose Coral
        "title": RGBColor(255, 255, 255),
        "accent": RGBColor(251, 146, 60),    # Radiant Amber Orange
        "subtitle": RGBColor(254, 205, 211), # Soft Coral
        "body": RGBColor(255, 241, 242),     # Warm Porcelain
        "muted": RGBColor(159, 114, 130),
        "pill_bg": RGBColor(76, 29, 44),
        "pill_text": RGBColor(251, 146, 60)
    },
    "COBALT_HORIZON": {
        "name": "Cobalt Horizon",
        "bg": RGBColor(10, 22, 40),          # Deep Abyss Navy
        "card_bg": RGBColor(17, 34, 64),     # Cobalt Card
        "card_border": RGBColor(37, 99, 235),# Electric Blue Border
        "title": RGBColor(255, 255, 255),
        "accent": RGBColor(96, 165, 250),    # Vivid Sky Blue
        "subtitle": RGBColor(191, 219, 254),
        "body": RGBColor(240, 246, 255),
        "muted": RGBColor(110, 135, 170),
        "pill_bg": RGBColor(30, 58, 138),
        "pill_text": RGBColor(147, 197, 253)
    },
    "ROYAL_AMETHYST": {
        "name": "Royal Amethyst",
        "bg": RGBColor(20, 10, 35),          # Deep Purple Night
        "card_bg": RGBColor(36, 18, 62),     # Amethyst Card
        "card_border": RGBColor(168, 85, 247),# Electric Violet
        "title": RGBColor(255, 255, 255),
        "accent": RGBColor(216, 180, 254),   # Luminous Lilac
        "subtitle": RGBColor(233, 213, 255),
        "body": RGBColor(250, 245, 255),
        "muted": RGBColor(140, 115, 170),
        "pill_bg": RGBColor(59, 7, 100),
        "pill_text": RGBColor(216, 180, 254)
    },
    "CRIMSON_PULSE": {
        "name": "Crimson Pulse",
        "bg": RGBColor(18, 12, 14),          # Obsidian Charcoal
        "card_bg": RGBColor(34, 20, 24),     # Dark Ruby Card
        "card_border": RGBColor(239, 68, 68),# Electric Ruby Red
        "title": RGBColor(255, 255, 255),
        "accent": RGBColor(248, 113, 113),   # Bright Crimson
        "subtitle": RGBColor(254, 202, 202),
        "body": RGBColor(254, 242, 242),
        "muted": RGBColor(150, 110, 115),
        "pill_bg": RGBColor(69, 10, 10),
        "pill_text": RGBColor(252, 165, 165)
    },
    "TEAL_AURORA": {
        "name": "Teal Aurora",
        "bg": RGBColor(8, 28, 36),           # Deep Petrol
        "card_bg": RGBColor(15, 45, 58),     # Teal Card
        "card_border": RGBColor(20, 184, 166),# Vivid Teal
        "title": RGBColor(255, 255, 255),
        "accent": RGBColor(45, 212, 191),    # Cyan Aurora
        "subtitle": RGBColor(153, 246, 228),
        "body": RGBColor(240, 253, 250),
        "muted": RGBColor(100, 145, 155),
        "pill_bg": RGBColor(19, 78, 74),
        "pill_text": RGBColor(94, 234, 212)
    },
    "SOLAR_TITANIUM": {
        "name": "Solar Titanium",
        "bg": RGBColor(24, 24, 27),          # Zinc Obsidian
        "card_bg": RGBColor(39, 39, 42),     # Graphite Card
        "card_border": RGBColor(249, 115, 22),# Solar Orange Border
        "title": RGBColor(255, 255, 255),
        "accent": RGBColor(251, 146, 60),    # Electric Tangerine
        "subtitle": RGBColor(212, 212, 216),
        "body": RGBColor(244, 244, 245),
        "muted": RGBColor(113, 113, 122),
        "pill_bg": RGBColor(67, 26, 4),
        "pill_text": RGBColor(251, 146, 60)
    },
    "MINIMAL_LIGHT_IVORY": {
        "name": "Minimal Light Ivory",
        "bg": RGBColor(250, 249, 246),       # Warm Ivory Canvas
        "card_bg": RGBColor(255, 255, 255),  # Pure White Card
        "card_border": RGBColor(214, 211, 204),# Warm Stone Border
        "title": RGBColor(28, 25, 23),       # Deep Warm Charcoal
        "accent": RGBColor(180, 83, 9),      # Warm Bronze Amber
        "subtitle": RGBColor(87, 83, 78),    # Warm Stone
        "body": RGBColor(41, 37, 36),        # Rich Dark Text
        "muted": RGBColor(120, 113, 108),
        "pill_bg": RGBColor(245, 240, 230),
        "pill_text": RGBColor(180, 83, 9)
    },
    "NORDIC_FROST_LIGHT": {
        "name": "Nordic Frost Light",
        "bg": RGBColor(241, 245, 249),       # Nordic Slate Light
        "card_bg": RGBColor(255, 255, 255),  # Crisp White Card
        "card_border": RGBColor(203, 213, 225),
        "title": RGBColor(15, 23, 42),       # Deep Slate
        "accent": RGBColor(2, 132, 199),     # Nordic Ocean Blue
        "subtitle": RGBColor(51, 65, 85),
        "body": RGBColor(30, 41, 59),
        "muted": RGBColor(100, 116, 139),
        "pill_bg": RGBColor(224, 242, 254),
        "pill_text": RGBColor(3, 105, 161)
    },
    "CYBER_SLATE": {
        "name": "Cyber Slate",
        "bg": RGBColor(15, 23, 42),          # Dark Slate
        "card_bg": RGBColor(30, 41, 59),     # Steel
        "card_border": RGBColor(56, 189, 248),# Neon Cyan
        "title": RGBColor(255, 255, 255),
        "accent": RGBColor(56, 189, 248),    # Electric Cyan
        "subtitle": RGBColor(148, 163, 184),
        "body": RGBColor(226, 232, 240),
        "muted": RGBColor(100, 116, 139),
        "pill_bg": RGBColor(8, 47, 73),
        "pill_text": RGBColor(56, 189, 248)
    },
    "ACADEMIC_COLLEGE": {
        "name": "Academic College",
        "bg": RGBColor(15, 23, 42),          # Deep Academic Navy
        "card_bg": RGBColor(30, 41, 59),     # Slate Blue
        "card_border": RGBColor(59, 130, 246),# Royal Blue Border
        "title": RGBColor(255, 255, 255),    # Crisp White
        "accent": RGBColor(245, 158, 11),    # Academic Gold
        "subtitle": RGBColor(147, 197, 253), # Light Blue
        "body": RGBColor(241, 245, 249),     # Frost White
        "muted": RGBColor(148, 163, 184),    # Slate Gray
        "pill_bg": RGBColor(30, 58, 138),    # Royal Navy Pill
        "pill_text": RGBColor(253, 224, 71)  # Gold Pill Text
    }
}

THEME_KEYS = list(THEMES.keys())

def resolve_theme(theme_name, goal_text=""):
    """Intelligently resolves palette based on user keywords or dynamic title hash."""
    lower = (goal_text + " " + (theme_name or "")).lower()

    # Explicit direct theme matching
    for k in THEMES:
        if k.lower() in lower or THEMES[k]["name"].lower() in lower:
            return THEMES[k]

    if any(k in lower for k in ["chevron", "chevron orange", "slate orange", "executive orange"]):
        return THEMES["EXECUTIVE_CHEVRON_ORANGE"]

    # Keyword specific matching
    if any(k in lower for k in ["emerald", "green", "nature", "eco", "growth", "plant", "forest", "mint", "bio"]):
        return THEMES["EMERALD_VENTURE"]
    if any(k in lower for k in ["sunset", "amber", "warm", "coral", "wine", "fire"]):
        return THEMES["SUNSET_AMBER"]
    if any(k in lower for k in ["purple", "violet", "lavender", "amethyst"]):
        return THEMES["ROYAL_AMETHYST"]
    if any(k in lower for k in ["teal", "cyan", "aurora", "marine"]):
        return THEMES["TEAL_AURORA"]
    if any(k in lower for k in ["blue", "cobalt", "ocean", "navy"]):
        return THEMES["COBALT_HORIZON"]
    if any(k in lower for k in ["orange", "solar", "tangerine"]):
        return THEMES["SOLAR_TITANIUM"]
    if any(k in lower for k in ["crimson", "ruby", "red", "pulse"]):
        return THEMES["CRIMSON_PULSE"]
    if any(k in lower for k in ["white", "ivory", "light", "clean", "paper", "minimal"]):
        return THEMES["MINIMAL_LIGHT_IVORY"]
    if any(k in lower for k in ["nordic", "frost", "slate light", "cool light"]):
        return THEMES["NORDIC_FROST_LIGHT"]
    if any(k in lower for k in ["college", "university", "syllabus", "naac", "academic", "student"]):
        return THEMES["ACADEMIC_COLLEGE"]
    if any(k in lower for k in ["tech", "ai", "cloud", "cyber", "software", "code", "architecture"]):
        return THEMES["CYBER_SLATE"]
    if any(k in lower for k in ["luxury", "gold", "executive", "third", "profit"]):
        return THEMES["EXECUTIVE_LUXURY"]

    # Deterministic rotation based on title/goal text hash to ensure varied colors across presentations
    digest = hashlib.md5(lower.encode('utf-8')).hexdigest()
    idx = int(digest, 16) % len(THEME_KEYS)
    chosen_key = THEME_KEYS[idx]
    return THEMES[chosen_key]

def set_slide_background(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_header_banner(slide, title_text, category_pill="CODEZ48 PILOT EXECUTIVE", institution_info="", theme=None):
    # Top Category Pill
    pill_shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(0.8), Inches(0.4), Inches(3.2), Inches(0.35)
    )
    pill_shape.fill.solid()
    pill_shape.fill.fore_color.rgb = theme["pill_bg"]
    pill_shape.line.color.rgb = theme["card_border"]
    pill_shape.line.width = Pt(1)
    tf_pill = pill_shape.text_frame
    tf_pill.text = category_pill.upper()
    tf_pill.paragraphs[0].font.size = Pt(9)
    tf_pill.paragraphs[0].font.bold = True
    tf_pill.paragraphs[0].font.color.rgb = theme["pill_text"]
    tf_pill.paragraphs[0].alignment = PP_ALIGN.CENTER

    # Institution branding tagline on top right
    if institution_info:
        inst_box = slide.shapes.add_textbox(Inches(6.0), Inches(0.4), Inches(6.5), Inches(0.35))
        tf_inst = inst_box.text_frame
        p_inst = tf_inst.paragraphs[0]
        p_inst.text = institution_info.upper()
        p_inst.font.size = Pt(9)
        p_inst.font.bold = True
        p_inst.font.color.rgb = theme["accent"]
        p_inst.alignment = PP_ALIGN.RIGHT

    # Main Slide Title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.8), Inches(11.7), Inches(0.8))
    tf = title_box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = str(title_text or "Presentation Slide")
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = theme["title"]

    # Thin accent divider line
    line = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(0.8), Inches(1.65), Inches(11.7), Inches(0.03)
    )
    line.fill.solid()
    line.fill.fore_color.rgb = theme["accent"]
    line.line.fill.background()

def add_footer(slide, current_num, total_slides, institution="", theme=None):
    footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.0), Inches(11.7), Inches(0.35))
    tf = footer_box.text_frame
    p = tf.paragraphs[0]
    left_brand = institution or "CODEZ48 PILOT • AUTONOMOUS EXECUTIVE INTELLIGENCE"
    p.text = f"{left_brand}   |   SLIDE {current_num} OF {total_slides}"
    p.font.size = Pt(9)
    p.font.color.rgb = theme["muted"]

def create_card(slide, left, top, width, height, theme):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = theme["card_bg"]
    card.line.color.rgb = theme["card_border"]
    card.line.width = Pt(1.5)
    return card

# ==============================================================================
# DEDICATED LAYOUT TEMPLATE RENDERERS
# ==============================================================================

def render_title_slide(slide, slide_data, deck_title, theme, branding_info=""):
    set_slide_background(slide, theme["bg"])
    hero_card = create_card(slide, Inches(1.0), Inches(1.0), Inches(11.333), Inches(5.5), theme)

    top_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(1.0), Inches(11.333), Inches(0.12))
    top_bar.fill.solid()
    top_bar.fill.fore_color.rgb = theme["accent"]
    top_bar.line.fill.background()

    pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(1.5), Inches(3.8), Inches(0.4))
    pill.fill.solid()
    pill.fill.fore_color.rgb = theme["pill_bg"]
    pill.line.color.rgb = theme["card_border"]
    tf_p = pill.text_frame
    tf_p.text = "OFFICIAL PRESENTATION & EXECUTIVE BRIEF"
    tf_p.paragraphs[0].font.size = Pt(9)
    tf_p.paragraphs[0].font.bold = True
    tf_p.paragraphs[0].font.color.rgb = theme["pill_text"]
    tf_p.paragraphs[0].alignment = PP_ALIGN.CENTER

    tb_title = slide.shapes.add_textbox(Inches(1.5), Inches(2.1), Inches(10.3), Inches(1.8))
    tf_t = tb_title.text_frame
    tf_t.word_wrap = True
    p_t = tf_t.paragraphs[0]
    p_t.text = str(slide_data.get("title") or deck_title)
    p_t.font.size = Pt(36)
    p_t.font.bold = True
    p_t.font.color.rgb = theme["title"]

    subtitle = str(slide_data.get("subtitle") or "Strategic Architecture, Technical Specifications & Enterprise Implementation")
    tb_sub = slide.shapes.add_textbox(Inches(1.5), Inches(3.9), Inches(10.3), Inches(1.0))
    tf_s = tb_sub.text_frame
    tf_s.word_wrap = True
    p_s = tf_s.paragraphs[0]
    p_s.text = subtitle
    p_s.font.size = Pt(16)
    p_s.font.color.rgb = theme["subtitle"]

    tb_meta = slide.shapes.add_textbox(Inches(1.5), Inches(5.3), Inches(10.3), Inches(0.6))
    tf_m = tb_meta.text_frame
    p_m = tf_m.paragraphs[0]
    brand_text = branding_info if branding_info else "Engineered with Codez48 Pilot Autonomous Suite | Tier-3 Verified"
    p_m.text = f"INSTITUTION / ENTERPRISE: {brand_text}"
    p_m.font.size = Pt(11)
    p_m.font.color.rgb = theme["accent"]
    p_m.font.bold = True

def render_three_cards_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    set_slide_background(slide, theme["bg"])
    add_header_banner(slide, slide_data.get("title", "Strategic Pillars"), "STRATEGIC ARCHITECTURE", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    bullets = slide_data.get("bullets", [])
    card_width = Inches(3.7)
    card_height = Inches(4.7)
    top_pos = Inches(2.0)
    left_positions = [Inches(0.8), Inches(4.8), Inches(8.8)]

    for c_idx in range(3):
        left_pos = left_positions[c_idx]
        card = create_card(slide, left_pos, top_pos, card_width, card_height, theme)

        badge = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left_pos, top_pos, card_width, Inches(0.08))
        badge.fill.solid()
        badge.fill.fore_color.rgb = theme["accent"]
        badge.line.fill.background()

        tb = slide.shapes.add_textbox(left_pos + Inches(0.25), top_pos + Inches(0.2), card_width - Inches(0.5), card_height - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p_num = tf.paragraphs[0]
        p_num.text = f"PILLAR 0{c_idx + 1}"
        p_num.font.size = Pt(11)
        p_num.font.bold = True
        p_num.font.color.rgb = theme["accent"]

        content_idx = c_idx
        b_text = bullets[content_idx] if content_idx < len(bullets) else "Enterprise capability and technical parameter validation."

        p_desc = tf.add_paragraph()
        p_desc.text = b_text
        p_desc.font.size = Pt(12)
        p_desc.font.color.rgb = theme["body"]
        p_desc.space_before = Pt(12)

        extra_idx = c_idx + 3
        if extra_idx < len(bullets):
            p_extra = tf.add_paragraph()
            p_extra.text = f"• {bullets[extra_idx]}"
            p_extra.font.size = Pt(10)
            p_extra.font.color.rgb = theme["muted"]
            p_extra.space_before = Pt(8)

def render_four_pillars_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    """4-Column Architecture Layout."""
    set_slide_background(slide, theme["bg"])
    add_header_banner(slide, slide_data.get("title", "Core Subsystem Breakdown"), "FOUR FOUNDATIONAL PILLARS", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    bullets = slide_data.get("bullets", [])
    w = Inches(2.7)
    h = Inches(4.7)
    lefts = [Inches(0.8), Inches(3.8), Inches(6.8), Inches(9.8)]

    for c_idx in range(4):
        left_pos = lefts[c_idx]
        card = create_card(slide, left_pos, Inches(2.0), w, h, theme)

        top_strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left_pos, Inches(2.0), w, Inches(0.08))
        top_strip.fill.solid()
        top_strip.fill.fore_color.rgb = theme["accent"]
        top_strip.line.fill.background()

        tb = slide.shapes.add_textbox(left_pos + Inches(0.2), Inches(2.2), w - Inches(0.4), h - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = f"PHASE 0{c_idx + 1}"
        p0.font.size = Pt(10)
        p0.font.bold = True
        p0.font.color.rgb = theme["accent"]

        b_text = bullets[c_idx] if c_idx < len(bullets) else "Subsystem parameter optimization."
        p1 = tf.add_paragraph()
        p1.text = b_text
        p1.font.size = Pt(11)
        p1.font.color.rgb = theme["body"]
        p1.space_before = Pt(10)

def render_kpi_dashboard_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    set_slide_background(slide, theme["bg"])
    add_header_banner(slide, slide_data.get("title", "Key Performance Metrics"), "METRIC BENCHMARKS", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    stat_num = slide_data.get("statNumber") or "99.9%"
    stat_lbl = slide_data.get("statLabel") or "Reliability SLA"
    bullets = slide_data.get("bullets", [])

    hero_card = create_card(slide, Inches(0.8), Inches(2.0), Inches(4.2), Inches(4.7), theme)
    accent_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(2.0), Inches(4.2), Inches(0.1))
    accent_bar.fill.solid()
    accent_bar.fill.fore_color.rgb = theme["accent"]
    accent_bar.line.fill.background()

    tb_stat = slide.shapes.add_textbox(Inches(1.0), Inches(2.5), Inches(3.8), Inches(3.6))
    tf_s = tb_stat.text_frame
    tf_s.word_wrap = True
    p_num = tf_s.paragraphs[0]
    p_num.text = str(stat_num)
    p_num.font.size = Pt(44)
    p_num.font.bold = True
    p_num.font.color.rgb = theme["accent"]
    p_num.alignment = PP_ALIGN.CENTER

    p_lbl = tf_s.add_paragraph()
    p_lbl.text = str(stat_lbl).upper()
    p_lbl.font.size = Pt(12)
    p_lbl.font.bold = True
    p_lbl.font.color.rgb = theme["title"]
    p_lbl.alignment = PP_ALIGN.CENTER
    p_lbl.space_before = Pt(8)

    right_w = Inches(7.1)
    grid_h = Inches(2.2)
    right_card1 = create_card(slide, Inches(5.4), Inches(2.0), right_w, grid_h, theme)
    right_card2 = create_card(slide, Inches(5.4), Inches(4.5), right_w, grid_h, theme)

    tb_r1 = slide.shapes.add_textbox(Inches(5.7), Inches(2.2), right_w - Inches(0.6), grid_h - Inches(0.4))
    tf_r1 = tb_r1.text_frame
    tf_r1.word_wrap = True
    p_rh1 = tf_r1.paragraphs[0]
    p_rh1.text = "THROUGHPUT & OPERATIONAL EFFICIENCY"
    p_rh1.font.size = Pt(12)
    p_rh1.font.bold = True
    p_rh1.font.color.rgb = theme["accent"]

    for b in bullets[:2]:
        p = tf_r1.add_paragraph()
        p.text = f"• {b}"
        p.font.size = Pt(11)
        p.font.color.rgb = theme["body"]
        p.space_before = Pt(6)

    tb_r2 = slide.shapes.add_textbox(Inches(5.7), Inches(4.7), right_w - Inches(0.6), grid_h - Inches(0.4))
    tf_r2 = tb_r2.text_frame
    tf_r2.word_wrap = True
    p_rh2 = tf_r2.paragraphs[0]
    p_rh2.text = "HARDWARE VALIDATION & SLA OUTCOMES"
    p_rh2.font.size = Pt(12)
    p_rh2.font.bold = True
    p_rh2.font.color.rgb = theme["accent"]

    for b in bullets[2:4]:
        p = tf_r2.add_paragraph()
        p.text = f"• {b}"
        p.font.size = Pt(11)
        p.font.color.rgb = theme["body"]
        p.space_before = Pt(6)

def render_two_column_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    set_slide_background(slide, theme["bg"])
    add_header_banner(slide, slide_data.get("title", "Comparative Analysis"), "CORE COMPARISON", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    bullets = slide_data.get("bullets", [])
    half = max(1, len(bullets) // 2)
    left_bullets = bullets[:half]
    right_bullets = bullets[half:]

    w = Inches(5.6)
    card1 = create_card(slide, Inches(0.8), Inches(2.0), w, Inches(4.7), theme)
    card2 = create_card(slide, Inches(6.9), Inches(2.0), w, Inches(4.7), theme)

    tb1 = slide.shapes.add_textbox(Inches(1.1), Inches(2.2), w - Inches(0.6), Inches(4.3))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    p1 = tf1.paragraphs[0]
    p1.text = "FOUNDATIONAL CRITERIA & SPECS"
    p1.font.size = Pt(13)
    p1.font.bold = True
    p1.font.color.rgb = theme["accent"]

    for b in left_bullets:
        p = tf1.add_paragraph()
        p.text = f"•  {b}"
        p.font.size = Pt(11)
        p.font.color.rgb = theme["body"]
        p.space_before = Pt(8)

    tb2 = slide.shapes.add_textbox(Inches(7.2), Inches(2.2), w - Inches(0.6), Inches(4.3))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    p2 = tf2.paragraphs[0]
    p2.text = "ENTERPRISE OUTCOMES & VERIFICATION"
    p2.font.size = Pt(13)
    p2.font.bold = True
    p2.font.color.rgb = theme["accent"]

    for b in right_bullets:
        p = tf2.add_paragraph()
        p.text = f"•  {b}"
        p.font.size = Pt(11)
        p.font.color.rgb = theme["body"]
        p.space_before = Pt(8)

def render_quote_hero_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    """Large quote / takeaway hero slide."""
    set_slide_background(slide, theme["bg"])
    add_header_banner(slide, slide_data.get("title", "Strategic Vision"), "EXECUTIVE TAKEAWAY", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    hero = create_card(slide, Inches(1.2), Inches(2.0), Inches(10.9), Inches(4.7), theme)

    accent_strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.2), Inches(2.0), Inches(0.15), Inches(4.7))
    accent_strip.fill.solid()
    accent_strip.fill.fore_color.rgb = theme["accent"]
    accent_strip.line.fill.background()

    tb = slide.shapes.add_textbox(Inches(1.8), Inches(2.3), Inches(9.8), Inches(4.1))
    tf = tb.text_frame
    tf.word_wrap = True

    p0 = tf.paragraphs[0]
    p0.text = "“"
    p0.font.size = Pt(56)
    p0.font.bold = True
    p0.font.color.rgb = theme["accent"]

    subtitle = slide_data.get("subtitle") or "The fundamental architectural shift in enterprise engineering."
    p1 = tf.add_paragraph()
    p1.text = subtitle
    p1.font.size = Pt(18)
    p1.font.bold = True
    p1.font.color.rgb = theme["title"]
    p1.space_before = Pt(4)

    bullets = slide_data.get("bullets", [])
    for b in bullets[:3]:
        p = tf.add_paragraph()
        p.text = f"•  {b}"
        p.font.size = Pt(12)
        p.font.color.rgb = theme["body"]
        p.space_before = Pt(10)

def render_problem_solution_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    """Problem vs Solution Split."""
    set_slide_background(slide, theme["bg"])
    add_header_banner(slide, slide_data.get("title", "Overcoming Technical Bottlenecks"), "CHALLENGE & RESOLUTION", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    bullets = slide_data.get("bullets", [])
    problems = [b for b in bullets if "problem" in b.lower() or "legacy" in b.lower()]
    solutions = [b for b in bullets if "solution" in b.lower() or "next-gen" in b.lower() or "resolution" in b.lower()]

    if not problems or not solutions:
        half = max(1, len(bullets) // 2)
        problems = bullets[:half]
        solutions = bullets[half:]

    w = Inches(5.6)
    card1 = create_card(slide, Inches(0.8), Inches(2.0), w, Inches(4.7), theme)
    card2 = create_card(slide, Inches(6.9), Inches(2.0), w, Inches(4.7), theme)

    # Problem Header (Crimson/Amber tone)
    b_prob = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(2.0), w, Inches(0.1))
    b_prob.fill.solid()
    b_prob.fill.fore_color.rgb = RGBColor(239, 68, 68)
    b_prob.line.fill.background()

    # Solution Header (Accent / Mint tone)
    b_sol = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.9), Inches(2.0), w, Inches(0.1))
    b_sol.fill.solid()
    b_sol.fill.fore_color.rgb = theme["accent"]
    b_sol.line.fill.background()

    tb1 = slide.shapes.add_textbox(Inches(1.1), Inches(2.3), w - Inches(0.6), Inches(4.2))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    p1 = tf1.paragraphs[0]
    p1.text = "CRITICAL BOTTLENECKS (LEGACY)"
    p1.font.size = Pt(13)
    p1.font.bold = True
    p1.font.color.rgb = RGBColor(239, 68, 68)

    for b in problems:
        p = tf1.add_paragraph()
        p.text = f"✕  {b}"
        p.font.size = Pt(11)
        p.font.color.rgb = theme["body"]
        p.space_before = Pt(10)

    tb2 = slide.shapes.add_textbox(Inches(7.2), Inches(2.3), w - Inches(0.6), Inches(4.2))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    p2 = tf2.paragraphs[0]
    p2.text = "ENGINEERED RESOLUTION (NEXT-GEN)"
    p2.font.size = Pt(13)
    p2.font.bold = True
    p2.font.color.rgb = theme["accent"]

    for b in solutions:
        p = tf2.add_paragraph()
        p.text = f"✓  {b}"
        p.font.size = Pt(11)
        p.font.color.rgb = theme["body"]
        p.space_before = Pt(10)

def render_timeline_roadmap_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    """Horizontal 4-Phase Roadmap."""
    set_slide_background(slide, theme["bg"])
    add_header_banner(slide, slide_data.get("title", "Strategic Evolution Roadmap"), "TECHNOLOGY HORIZON", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    bullets = slide_data.get("bullets", [])

    track = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(3.2), Inches(11.3), Inches(0.06))
    track.fill.solid()
    track.fill.fore_color.rgb = theme["card_border"]
    track.line.fill.background()

    lefts = [Inches(0.8), Inches(3.8), Inches(6.8), Inches(9.8)]
    w = Inches(2.7)

    for i in range(min(4, len(bullets)) if bullets else 4):
        left_pos = lefts[i]

        card = create_card(slide, left_pos, Inches(3.5), w, Inches(3.2), theme)

        node = slide.shapes.add_shape(MSO_SHAPE.OVAL, left_pos + Inches(1.15), Inches(3.0), Inches(0.4), Inches(0.4))
        node.fill.solid()
        node.fill.fore_color.rgb = theme["accent"]
        node.line.color.rgb = theme["card_border"]

        tb = slide.shapes.add_textbox(left_pos + Inches(0.15), Inches(3.6), w - Inches(0.3), Inches(3.0))
        tf = tb.text_frame
        tf.word_wrap = True
        p0 = tf.paragraphs[0]
        p0.text = f"PHASE {i+1}"
        p0.font.size = Pt(11)
        p0.font.bold = True
        p0.font.color.rgb = theme["accent"]
        p0.alignment = PP_ALIGN.CENTER

        b_text = bullets[i] if i < len(bullets) else f"Strategic milestone {i+1} implementation."
        p1 = tf.add_paragraph()
        p1.text = b_text
        p1.font.size = Pt(10)
        p1.font.color.rgb = theme["body"]
        p1.space_before = Pt(8)

def render_full_width_takeaway_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    """Full-width card takeaway."""
    set_slide_background(slide, theme["bg"])
    add_header_banner(slide, slide_data.get("title", "Executive Synthesis"), "KEY TAKEAWAY", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    card = create_card(slide, Inches(0.8), Inches(2.0), Inches(11.7), Inches(4.7), theme)

    top_strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(2.0), Inches(11.7), Inches(0.1))
    top_strip.fill.solid()
    top_strip.fill.fore_color.rgb = theme["accent"]
    top_strip.line.fill.background()

    tb = slide.shapes.add_textbox(Inches(1.2), Inches(2.3), Inches(10.9), Inches(4.2))
    tf = tb.text_frame
    tf.word_wrap = True

    sub = slide_data.get("subtitle") or "Strategic imperative across mobile computing architectures."
    p0 = tf.paragraphs[0]
    p0.text = sub
    p0.font.size = Pt(16)
    p0.font.bold = True
    p0.font.color.rgb = theme["title"]

    bullets = slide_data.get("bullets", [])
    for b in bullets:
        p = tf.add_paragraph()
        p.text = f"•  {b}"
        p.font.size = Pt(12)
        p.font.color.rgb = theme["body"]
        p.space_before = Pt(10)

def render_image_split_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    set_slide_background(slide, theme["bg"])
    add_header_banner(slide, slide_data.get("title", "Visual Engineering Architecture"), "HARDWARE BLUEPRINT", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    left_w = Inches(5.6)
    card_left = create_card(slide, Inches(0.8), Inches(2.0), left_w, Inches(4.7), theme)

    img_path = slide_data.get("imagePath")
    if img_path and os.path.exists(img_path):
        try:
            slide.shapes.add_picture(img_path, Inches(1.0), Inches(2.2), left_w - Inches(0.4), Inches(4.3))
        except Exception:
            render_fallback_card(slide, Inches(0.8), Inches(2.0), left_w, Inches(4.7), theme, slide_data.get("searchQuery", "Hardware Blueprint"))
    else:
        render_fallback_card(slide, Inches(0.8), Inches(2.0), left_w, Inches(4.7), theme, slide_data.get("searchQuery", "Hardware Blueprint"))

    right_w = Inches(5.6)
    card_right = create_card(slide, Inches(6.9), Inches(2.0), right_w, Inches(4.7), theme)

    tb = slide.shapes.add_textbox(Inches(7.2), Inches(2.2), right_w - Inches(0.6), Inches(4.3))
    tf = tb.text_frame
    tf.word_wrap = True

    p_head = tf.paragraphs[0]
    p_head.text = "TECHNICAL SPECIFICATIONS & CAPABILITIES"
    p_head.font.size = Pt(13)
    p_head.font.bold = True
    p_head.font.color.rgb = theme["accent"]

    bullets = slide_data.get("bullets", [])
    for b in bullets:
        p = tf.add_paragraph()
        p.text = f"•  {b}"
        p.font.size = Pt(11)
        p.font.color.rgb = theme["body"]
        p.space_before = Pt(8)

def render_fallback_card(slide, left, top, width, height, theme, title):
    center_box = slide.shapes.add_textbox(left + Inches(0.5), top + height / 2 - Inches(0.8), width - Inches(1.0), Inches(1.6))
    tf = center_box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "DIAGRAM / ASSET PREVIEW"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = theme["accent"]
    p.alignment = PP_ALIGN.CENTER

    p2 = tf.add_paragraph()
    p2.text = f"[{title.upper()[:40]}]"
    p2.font.size = Pt(10)
    p2.font.color.rgb = theme["muted"]
    p2.alignment = PP_ALIGN.CENTER
    p2.space_before = Pt(8)

# ==============================================================================
# DEDICATED 9-SLIDE FLAGSHIP SUITE (EXECUTIVE CHEVRON ORANGE & SLATE NAVY)
# Exact Visual Implementation Matching User's Strategic Multi-Layout Architecture
# ==============================================================================

def render_chevron_title_slide(slide, slide_data, deck_title, theme, branding_info=""):
    """Slide 1: Business Slide / Title Slide with Chevron Geometry on Right."""
    set_slide_background(slide, RGBColor(255, 255, 255))
    
    # Left Header Logo
    logo_tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.8), Inches(4.0), Inches(0.5))
    tf_l = logo_tb.text_frame
    p_logo = tf_l.paragraphs[0]
    p_logo.text = "◈ LOGO"
    p_logo.font.size = Pt(14)
    p_logo.font.bold = True
    p_logo.font.color.rgb = theme["accent"]

    # Left Title
    title_text = slide_data.get("title") or deck_title or "BUSINESS SLIDE"
    title_tb = slide.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(6.5), Inches(2.4))
    tf_t = title_tb.text_frame
    tf_t.word_wrap = True
    
    words = title_text.upper().split()
    if len(words) >= 2:
        p1 = tf_t.paragraphs[0]
        p1.text = " ".join(words[:len(words)//2])
        p1.font.size = Pt(32)
        p1.font.bold = True
        p1.font.color.rgb = theme["accent"]
        
        p2 = tf_t.add_paragraph()
        p2.text = " ".join(words[len(words)//2:])
        p2.font.size = Pt(32)
        p2.font.bold = True
        p2.font.color.rgb = theme["title"]
        p2.space_before = Pt(4)
    else:
        p1 = tf_t.paragraphs[0]
        p1.text = title_text.upper()
        p1.font.size = Pt(32)
        p1.font.bold = True
        p1.font.color.rgb = theme["title"]

    bullets = slide_data.get("bullets", [])
    desc_text = slide_data.get("subtitle") or (bullets[0] if bullets else "Strategic leadership, operational excellence, and executive execution.")
    desc_tb = slide.shapes.add_textbox(Inches(0.8), Inches(4.4), Inches(6.0), Inches(1.8))
    tf_d = desc_tb.text_frame
    tf_d.word_wrap = True
    p_d = tf_d.paragraphs[0]
    p_d.text = desc_text
    p_d.font.size = Pt(12)
    p_d.font.color.rgb = theme["body"]

    if branding_info:
        p_b = tf_d.add_paragraph()
        p_b.text = branding_info.upper()
        p_b.font.size = Pt(10)
        p_b.font.bold = True
        p_b.font.color.rgb = theme["accent"]
        p_b.space_before = Pt(10)

    # Decorative bottom-left chevron triangle
    dec_c = slide.shapes.add_shape(MSO_SHAPE.CHEVRON, Inches(1.2), Inches(6.4), Inches(1.8), Inches(0.4))
    dec_c.fill.solid()
    dec_c.fill.fore_color.rgb = theme["accent"]
    dec_c.line.fill.background()

    # Right Geometric Chevrons
    chev_navy = slide.shapes.add_shape(MSO_SHAPE.CHEVRON, Inches(7.5), Inches(0.5), Inches(2.2), Inches(6.5))
    chev_navy.fill.solid()
    chev_navy.fill.fore_color.rgb = RGBColor(30, 37, 43)
    chev_navy.line.fill.background()

    chev_orange = slide.shapes.add_shape(MSO_SHAPE.CHEVRON, Inches(8.8), Inches(0.5), Inches(4.2), Inches(6.5))
    chev_orange.fill.solid()
    chev_orange.fill.fore_color.rgb = theme["accent"]
    chev_orange.line.fill.background()

    circle_photo = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(9.8), Inches(2.8), Inches(1.8), Inches(1.8))
    circle_photo.fill.solid()
    circle_photo.fill.fore_color.rgb = RGBColor(255, 255, 255)
    circle_photo.line.fill.background()

    icon_tb = slide.shapes.add_textbox(Inches(9.8), Inches(3.2), Inches(1.8), Inches(1.0))
    tf_ic = icon_tb.text_frame
    p_ic = tf_ic.paragraphs[0]
    p_ic.text = "📷"
    p_ic.font.size = Pt(28)
    p_ic.alignment = PP_ALIGN.CENTER

def render_about_company_chevron_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    """Slide 2: About Company / Overview with 3 circular badges in right chevron."""
    set_slide_background(slide, RGBColor(255, 255, 255))
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    tb_title = slide.shapes.add_textbox(Inches(0.8), Inches(0.8), Inches(6.2), Inches(1.2))
    tf_t = tb_title.text_frame
    tf_t.word_wrap = True
    p0 = tf_t.paragraphs[0]
    p0.text = str(slide_data.get("title") or "ABOUT COMPANY").upper()
    p0.font.size = Pt(26)
    p0.font.bold = True
    p0.font.color.rgb = theme["title"]

    p_sub = tf_t.add_paragraph()
    p_sub.text = slide_data.get("subtitle") or "Institutional Heritage & Operating Framework"
    p_sub.font.size = Pt(11)
    p_sub.font.bold = True
    p_sub.font.color.rgb = theme["accent"]

    bullets = slide_data.get("bullets", [])
    tb_body = slide.shapes.add_textbox(Inches(0.8), Inches(2.2), Inches(6.0), Inches(4.5))
    tf_b = tb_body.text_frame
    tf_b.word_wrap = True
    
    for i, b in enumerate(bullets[:4]):
        p = tf_b.paragraphs[0] if i == 0 else tf_b.add_paragraph()
        p.text = b
        p.font.size = Pt(11)
        p.font.color.rgb = theme["body"]
        if i > 0:
            p.space_before = Pt(12)

    chev_bg = slide.shapes.add_shape(MSO_SHAPE.CHEVRON, Inches(7.5), Inches(0.8), Inches(5.2), Inches(5.8))
    chev_bg.fill.solid()
    chev_bg.fill.fore_color.rgb = RGBColor(30, 37, 43)
    chev_bg.line.fill.background()

    badges = [
        {"title": "Global Vision & Standards", "desc": "International benchmarks & operational rigour."},
        {"title": "Agile Domain Execution", "desc": "Rapid deployment and high-throughput workflows."},
        {"title": "Accredited Excellence", "desc": "Continuous governance, metrics, and quality controls."}
    ]
    if len(bullets) >= 3:
        for bi in range(3):
            badges[bi]["desc"] = bullets[bi]

    top_starts = [Inches(1.4), Inches(2.8), Inches(4.2)]
    for bi, badge in enumerate(badges):
        circ = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(8.3), top_starts[bi], Inches(0.7), Inches(0.7))
        circ.fill.solid()
        circ.fill.fore_color.rgb = theme["accent"]
        circ.line.fill.background()
        
        tb_badge = slide.shapes.add_textbox(Inches(9.2), top_starts[bi] - Inches(0.05), Inches(3.2), Inches(1.1))
        tf_bg = tb_badge.text_frame
        tf_bg.word_wrap = True
        p_head = tf_bg.paragraphs[0]
        p_head.text = badge["title"]
        p_head.font.size = Pt(12)
        p_head.font.bold = True
        p_head.font.color.rgb = RGBColor(255, 255, 255)
        
        p_desc = tf_bg.add_paragraph()
        p_desc.text = badge["desc"]
        p_desc.font.size = Pt(10)
        p_desc.font.color.rgb = RGBColor(203, 213, 225)

def render_split_capsules_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    """Slide 3: Our Mission / Our Vision with dual horizontal rounded capsules."""
    set_slide_background(slide, RGBColor(255, 255, 255))
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    tb_title = slide.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(4.8), Inches(4.5))
    tf_t = tb_title.text_frame
    tf_t.word_wrap = True
    
    p1 = tf_t.paragraphs[0]
    p1.text = "OUR MISSION"
    p1.font.size = Pt(28)
    p1.font.bold = True
    p1.font.color.rgb = theme["title"]

    p2 = tf_t.add_paragraph()
    p2.text = "OUR VISION"
    p2.font.size = Pt(28)
    p2.font.bold = True
    p2.font.color.rgb = theme["accent"]
    p2.space_before = Pt(4)

    bullets = slide_data.get("bullets", [])
    desc_p = tf_t.add_paragraph()
    desc_p.text = slide_data.get("subtitle") or "Establishing world-class standards through innovative clinical care, patient safety, and strategic excellence."
    desc_p.font.size = Pt(11)
    desc_p.font.color.rgb = theme["body"]
    desc_p.space_before = Pt(16)

    # 1. Mission Capsule (Orange)
    cap_orange = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.0), Inches(1.3), Inches(6.5), Inches(2.3))
    cap_orange.fill.solid()
    cap_orange.fill.fore_color.rgb = theme["accent"]
    cap_orange.line.fill.background()

    circ_m = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(6.3), Inches(1.9), Inches(1.0), Inches(1.0))
    circ_m.fill.solid()
    circ_m.fill.fore_color.rgb = RGBColor(255, 255, 255)
    circ_m.line.fill.background()

    tb_ic_m = slide.shapes.add_textbox(Inches(6.3), Inches(2.05), Inches(1.0), Inches(0.7))
    tb_ic_m.text_frame.paragraphs[0].text = "🎯"
    tb_ic_m.text_frame.paragraphs[0].font.size = Pt(20)
    tb_ic_m.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER

    tb_m = slide.shapes.add_textbox(Inches(7.5), Inches(1.5), Inches(4.8), Inches(1.9))
    tf_m = tb_m.text_frame
    tf_m.word_wrap = True
    p_m_head = tf_m.paragraphs[0]
    p_m_head.text = "OUR MISSION"
    p_m_head.font.size = Pt(13)
    p_m_head.font.bold = True
    p_m_head.font.color.rgb = RGBColor(255, 255, 255)

    p_m_desc = tf_m.add_paragraph()
    p_m_desc.text = bullets[0] if len(bullets) > 0 else "Deliver compassionate, state-of-the-art care with unwavering dedication to clinical quality and patient outcomes."
    p_m_desc.font.size = Pt(10)
    p_m_desc.font.color.rgb = RGBColor(255, 255, 255)
    p_m_desc.space_before = Pt(6)

    # 2. Vision Capsule (Dark Navy)
    cap_navy = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.0), Inches(4.0), Inches(6.5), Inches(2.3))
    cap_navy.fill.solid()
    cap_navy.fill.fore_color.rgb = RGBColor(30, 37, 43)
    cap_navy.line.fill.background()

    circ_v = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(6.3), Inches(4.6), Inches(1.0), Inches(1.0))
    circ_v.fill.solid()
    circ_v.fill.fore_color.rgb = RGBColor(255, 255, 255)
    circ_v.line.fill.background()

    tb_ic_v = slide.shapes.add_textbox(Inches(6.3), Inches(4.75), Inches(1.0), Inches(0.7))
    tb_ic_v.text_frame.paragraphs[0].text = "🔭"
    tb_ic_v.text_frame.paragraphs[0].font.size = Pt(20)
    tb_ic_v.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER

    tb_v = slide.shapes.add_textbox(Inches(7.5), Inches(4.2), Inches(4.8), Inches(1.9))
    tf_v = tb_v.text_frame
    tf_v.word_wrap = True
    p_v_head = tf_v.paragraphs[0]
    p_v_head.text = "OUR VISION"
    p_v_head.font.size = Pt(13)
    p_v_head.font.bold = True
    p_v_head.font.color.rgb = RGBColor(255, 255, 255)

    p_v_desc = tf_v.add_paragraph()
    p_v_desc.text = bullets[1] if len(bullets) > 1 else "Pioneer medical breakthroughs, AI-driven diagnostics, and universal access to premier healthcare infrastructure."
    p_v_desc.font.size = Pt(10)
    p_v_desc.font.color.rgb = RGBColor(226, 232, 240)
    p_v_desc.space_before = Pt(6)

def render_curved_services_panel_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    """Slide 4: Services Panel with Large Orange Container and 4 White Feature Cards."""
    set_slide_background(slide, RGBColor(255, 255, 255))
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    tb_left = slide.shapes.add_textbox(Inches(0.8), Inches(1.0), Inches(4.0), Inches(5.2))
    tf_l = tb_left.text_frame
    tf_l.word_wrap = True

    p1 = tf_l.paragraphs[0]
    p1.text = "OUR COMPANY"
    p1.font.size = Pt(26)
    p1.font.bold = True
    p1.font.color.rgb = theme["title"]

    p2 = tf_l.add_paragraph()
    p2.text = "SERVICES"
    p2.font.size = Pt(26)
    p2.font.bold = True
    p2.font.color.rgb = theme["accent"]

    p_t1 = tf_l.add_paragraph()
    p_t1.text = "PHASE I: FOUNDATION"
    p_t1.font.size = Pt(10)
    p_t1.font.bold = True
    p_t1.font.color.rgb = theme["accent"]
    p_t1.space_before = Pt(20)

    p_t1_d = tf_l.add_paragraph()
    p_t1_d.text = "Core institutional infrastructure and specialized care wings."
    p_t1_d.font.size = Pt(10)
    p_t1_d.font.color.rgb = theme["body"]

    p_t2 = tf_l.add_paragraph()
    p_t2.text = "PHASE II: ADVANCED SCALE"
    p_t2.font.size = Pt(10)
    p_t2.font.bold = True
    p_t2.font.color.rgb = theme["accent"]
    p_t2.space_before = Pt(16)

    p_t2_d = tf_l.add_paragraph()
    p_t2_d.text = "Robotic automation, tertiary clinical triage, and distributed intelligence."
    p_t2_d.font.size = Pt(10)
    p_t2_d.font.color.rgb = theme["body"]

    panel_orange = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(5.2), Inches(0.8), Inches(7.4), Inches(5.8))
    panel_orange.fill.solid()
    panel_orange.fill.fore_color.rgb = theme["accent"]
    panel_orange.line.fill.background()

    bullets = slide_data.get("bullets", [])
    card_coords = [
        (Inches(5.6), Inches(1.2)),
        (Inches(9.1), Inches(1.2)),
        (Inches(5.6), Inches(3.7)),
        (Inches(9.1), Inches(3.7))
    ]
    card_titles = ["Diagnostic Imaging", "Specialty Surgery", "Intensive Care", "Pharmacy & Lab"]
    icons = ["🔬", "⚡", "❤️", "📊"]

    for ci in range(4):
        cx, cy = card_coords[ci]
        c_shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, cy, Inches(3.2), Inches(2.2))
        c_shape.fill.solid()
        c_shape.fill.fore_color.rgb = RGBColor(255, 255, 255)
        c_shape.line.fill.background()

        ic_circ = slide.shapes.add_shape(MSO_SHAPE.OVAL, cx + Inches(0.2), cy + Inches(0.2), Inches(0.6), Inches(0.6))
        ic_circ.fill.solid()
        ic_circ.fill.fore_color.rgb = theme["accent"]
        ic_circ.line.fill.background()

        tb_ic = slide.shapes.add_textbox(cx + Inches(0.2), cy + Inches(0.25), Inches(0.6), Inches(0.5))
        tb_ic.text_frame.paragraphs[0].text = icons[ci]
        tb_ic.text_frame.paragraphs[0].font.size = Pt(12)
        tb_ic.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER

        tb_card = slide.shapes.add_textbox(cx + Inches(0.9), cy + Inches(0.15), Inches(2.1), Inches(1.9))
        tf_c = tb_card.text_frame
        tf_c.word_wrap = True
        
        p_c_head = tf_c.paragraphs[0]
        p_c_head.text = card_titles[ci]
        p_c_head.font.size = Pt(11)
        p_c_head.font.bold = True
        p_c_head.font.color.rgb = theme["title"]

        p_c_body = tf_c.add_paragraph()
        p_c_body.text = bullets[ci] if ci < len(bullets) else "Full spectrum patient-focused service delivery with precision protocols."
        p_c_body.font.size = Pt(9)
        p_c_body.font.color.rgb = theme["body"]
        p_c_body.space_before = Pt(4)

def render_four_hexagons_team_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    """Slide 5: Creative Team / Specialists in Dark Slate Card with 4 Orange-Bordered Hexagons."""
    set_slide_background(slide, RGBColor(255, 255, 255))
    
    hero = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(0.6), Inches(12.133), Inches(6.3))
    hero.fill.solid()
    hero.fill.fore_color.rgb = RGBColor(30, 37, 43)
    hero.line.fill.background()

    tb_title = slide.shapes.add_textbox(Inches(1.0), Inches(0.9), Inches(11.333), Inches(1.0))
    tf_t = tb_title.text_frame
    tf_t.word_wrap = True
    
    p_t = tf_t.paragraphs[0]
    p_t.text = str(slide_data.get("title") or "OUR CREATIVE TEAM").upper()
    p_t.font.size = Pt(24)
    p_t.font.bold = True
    p_t.font.color.rgb = RGBColor(255, 255, 255)
    p_t.alignment = PP_ALIGN.CENTER

    p_sub = tf_t.add_paragraph()
    p_sub.text = slide_data.get("subtitle") or "Distinguished Specialists, Medical Officers & Operational Leadership"
    p_sub.font.size = Pt(11)
    p_sub.font.color.rgb = theme["accent"]
    p_sub.alignment = PP_ALIGN.CENTER
    p_sub.space_before = Pt(2)

    lefts = [Inches(1.0), Inches(3.8), Inches(6.6), Inches(9.4)]
    names = ["Dr. Arvind Sharma", "Dr. Priya Nair", "Dr. Rajesh Varma", "Dr. Shalini Rao"]
    roles = ["Chief Medical Officer", "Head of Cardiology", "Director of Surgery", "Lead Neurosurgeon"]
    bullets = slide_data.get("bullets", [])

    for hi in range(4):
        hx = lefts[hi]
        hex_shape = slide.shapes.add_shape(MSO_SHAPE.HEXAGON, hx + Inches(0.35), Inches(2.2), Inches(1.8), Inches(2.0))
        hex_shape.fill.solid()
        hex_shape.fill.fore_color.rgb = RGBColor(255, 255, 255)
        hex_shape.line.color.rgb = theme["accent"]
        hex_shape.line.width = Pt(3)

        tb_sil = slide.shapes.add_textbox(hx + Inches(0.35), Inches(2.7), Inches(1.8), Inches(0.9))
        tb_sil.text_frame.paragraphs[0].text = "👤"
        tb_sil.text_frame.paragraphs[0].font.size = Pt(28)
        tb_sil.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER

        tb_info = slide.shapes.add_textbox(hx, Inches(4.4), Inches(2.5), Inches(2.2))
        tf_i = tb_info.text_frame
        tf_i.word_wrap = True

        p_name = tf_i.paragraphs[0]
        p_name.text = names[hi]
        p_name.font.size = Pt(12)
        p_name.font.bold = True
        p_name.font.color.rgb = RGBColor(255, 255, 255)
        p_name.alignment = PP_ALIGN.CENTER

        p_role = tf_i.add_paragraph()
        p_role.text = roles[hi]
        p_role.font.size = Pt(10)
        p_role.font.bold = True
        p_role.font.color.rgb = theme["accent"]
        p_role.alignment = PP_ALIGN.CENTER
        p_role.space_before = Pt(2)

        p_bio = tf_i.add_paragraph()
        p_bio.text = bullets[hi] if hi < len(bullets) else "15+ years clinical excellence & peer-reviewed research."
        p_bio.font.size = Pt(9)
        p_bio.font.color.rgb = RGBColor(203, 213, 225)
        p_bio.alignment = PP_ALIGN.CENTER
        p_bio.space_before = Pt(4)

    add_footer(slide, idx + 1, total_slides, branding_info, theme)

def render_stacked_column_chart_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    """Slide 6: Business Chart with Stacked Column Bars and Multi-Year Descriptions."""
    set_slide_background(slide, RGBColor(255, 255, 255))
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    tb_title = slide.shapes.add_textbox(Inches(0.8), Inches(0.6), Inches(11.7), Inches(1.0))
    tf_t = tb_title.text_frame
    p0 = tf_t.paragraphs[0]
    p0.text = str(slide_data.get("title") or "BUSINESS CHART").upper()
    p0.font.size = Pt(24)
    p0.font.bold = True
    p0.font.color.rgb = theme["title"]
    p0.alignment = PP_ALIGN.CENTER

    p_sub = tf_t.add_paragraph()
    p_sub.text = slide_data.get("subtitle") or "Multi-Year Admission Volumes, Occupancy Indices & Recovery Metrics"
    p_sub.font.size = Pt(11)
    p_sub.font.color.rgb = theme["accent"]
    p_sub.alignment = PP_ALIGN.CENTER
    p_sub.space_before = Pt(2)

    y_levels = [Inches(1.8), Inches(2.5), Inches(3.2), Inches(3.9), Inches(4.6)]
    labels_y = ["100", "75", "50", "25", "0"]
    for yi, y_pos in enumerate(y_levels):
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), y_pos, Inches(10.5), Inches(0.01))
        line.fill.solid()
        line.fill.fore_color.rgb = RGBColor(226, 232, 240) if yi < 4 else RGBColor(30, 37, 43)
        line.line.fill.background()

        tb_y = slide.shapes.add_textbox(Inches(0.8), y_pos - Inches(0.15), Inches(0.6), Inches(0.3))
        tb_y.text_frame.paragraphs[0].text = labels_y[yi]
        tb_y.text_frame.paragraphs[0].font.size = Pt(9)
        tb_y.text_frame.paragraphs[0].font.color.rgb = RGBColor(148, 163, 184)
        tb_y.text_frame.paragraphs[0].alignment = PP_ALIGN.RIGHT

    years = ["2018", "2019", "2020", "2021"]
    col_x = [Inches(2.5), Inches(5.1), Inches(7.7), Inches(10.3)]
    bar_w = Inches(0.9)
    col_heights = [
        {"navy": Inches(1.3), "slate": Inches(0.8), "orange": Inches(0.6)},
        {"navy": Inches(1.0), "slate": Inches(0.6), "orange": Inches(0.8)},
        {"navy": Inches(1.5), "slate": Inches(0.7), "orange": Inches(0.7)},
        {"navy": Inches(1.1), "slate": Inches(0.5), "orange": Inches(0.5)}
    ]
    bullets = slide_data.get("bullets", [])

    for ci in range(4):
        bx = col_x[ci]
        ch = col_heights[ci]
        base_y = Inches(4.6)

        bar_n = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, bx, base_y - ch["navy"], bar_w, ch["navy"])
        bar_n.fill.solid()
        bar_n.fill.fore_color.rgb = RGBColor(30, 37, 43)
        bar_n.line.fill.background()

        curr_y = base_y - ch["navy"]
        bar_s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, bx, curr_y - ch["slate"], bar_w, ch["slate"])
        bar_s.fill.solid()
        bar_s.fill.fore_color.rgb = RGBColor(148, 163, 184)
        bar_s.line.fill.background()

        curr_y = curr_y - ch["slate"]
        bar_o = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, bx, curr_y - ch["orange"], bar_w, ch["orange"])
        bar_o.fill.solid()
        bar_o.fill.fore_color.rgb = theme["accent"]
        bar_o.line.fill.background()

        tb_lbl = slide.shapes.add_textbox(bx - Inches(0.5), Inches(4.7), bar_w + Inches(1.0), Inches(0.4))
        tb_lbl.text_frame.paragraphs[0].text = years[ci]
        tb_lbl.text_frame.paragraphs[0].font.size = Pt(11)
        tb_lbl.text_frame.paragraphs[0].font.bold = True
        tb_lbl.text_frame.paragraphs[0].font.color.rgb = theme["title"]
        tb_lbl.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER

        tb_desc = slide.shapes.add_textbox(bx - Inches(0.7), Inches(5.1), bar_w + Inches(1.4), Inches(1.6))
        tf_cd = tb_desc.text_frame
        tf_cd.word_wrap = True
        p_cd = tf_cd.paragraphs[0]
        p_cd.text = bullets[ci] if ci < len(bullets) else f"Annual volume: {80 + ci*15}% operational capacity achieved."
        p_cd.font.size = Pt(9)
        p_cd.font.color.rgb = theme["body"]
        p_cd.alignment = PP_ALIGN.CENTER

def render_three_pricing_cards_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    """Slide 7: Our Price Table with 3 Pricing Cards and Featured Standard Plan."""
    set_slide_background(slide, RGBColor(255, 255, 255))
    
    wave = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.0), Inches(5.8), Inches(13.333), Inches(1.7))
    wave.fill.solid()
    wave.fill.fore_color.rgb = theme["accent"]
    wave.line.fill.background()

    tb_title = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(0.9))
    tf_t = tb_title.text_frame
    p0 = tf_t.paragraphs[0]
    p0.text = str(slide_data.get("title") or "OUR PRICE TABLE").upper()
    p0.font.size = Pt(24)
    p0.font.bold = True
    p0.font.color.rgb = theme["title"]
    p0.alignment = PP_ALIGN.CENTER

    bullets = slide_data.get("bullets", [])
    plans = [
        {"name": "BASIC PLAN", "price": "$500", "header_bg": theme["accent"], "is_featured": False},
        {"name": "STANDARD PLAN", "price": "$800", "header_bg": RGBColor(30, 37, 43), "is_featured": True},
        {"name": "ADVANCED PLAN", "price": "$1000", "header_bg": theme["accent"], "is_featured": False}
    ]
    xs = [Inches(1.5), Inches(5.0), Inches(8.5)]

    for pi, plan in enumerate(plans):
        px = xs[pi]
        py = Inches(1.4) if not plan["is_featured"] else Inches(1.3)
        pw = Inches(3.3)
        ph = Inches(4.7) if not plan["is_featured"] else Inches(4.9)

        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, px, py, pw, ph)
        card.fill.solid()
        card.fill.fore_color.rgb = RGBColor(255, 255, 255)
        card.line.color.rgb = plan["header_bg"] if plan["is_featured"] else RGBColor(226, 232, 240)
        card.line.width = Pt(2 if plan["is_featured"] else 1)

        head_pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, px, py, pw, Inches(1.2))
        head_pill.fill.solid()
        head_pill.fill.fore_color.rgb = plan["header_bg"]
        head_pill.line.fill.background()

        tb_hp = slide.shapes.add_textbox(px, py + Inches(0.1), pw, Inches(1.0))
        tf_hp = tb_hp.text_frame
        p_name = tf_hp.paragraphs[0]
        p_name.text = plan["name"]
        p_name.font.size = Pt(11)
        p_name.font.bold = True
        p_name.font.color.rgb = RGBColor(255, 255, 255)
        p_name.alignment = PP_ALIGN.CENTER

        p_pr = tf_hp.add_paragraph()
        p_pr.text = plan["price"]
        p_pr.font.size = Pt(22)
        p_pr.font.bold = True
        p_pr.font.color.rgb = RGBColor(255, 255, 255)
        p_pr.alignment = PP_ALIGN.CENTER

        tb_feat = slide.shapes.add_textbox(px + Inches(0.2), py + Inches(1.4), pw - Inches(0.4), Inches(2.4))
        tf_f = tb_feat.text_frame
        tf_f.word_wrap = True
        
        feature_list = [
            f"• Verified coverage tier #{pi + 1}",
            "• 24/7 dedicated support & triage",
            "• Digital records & rapid analytics",
            "• Comprehensive safety protocols"
        ]
        if pi < len(bullets):
            feature_list[0] = f"• {bullets[pi]}"

        for fi, feat in enumerate(feature_list):
            pf = tf_f.paragraphs[0] if fi == 0 else tf_f.add_paragraph()
            pf.text = feat
            pf.font.size = Pt(10)
            pf.font.color.rgb = theme["body"]
            if fi > 0:
                pf.space_before = Pt(6)

        btn = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, px + Inches(0.4), py + ph - Inches(0.7), pw - Inches(0.8), Inches(0.45))
        btn.fill.solid()
        btn.fill.fore_color.rgb = plan["header_bg"]
        btn.line.fill.background()
        
        tb_btn = slide.shapes.add_textbox(px + Inches(0.4), py + ph - Inches(0.7), pw - Inches(0.8), Inches(0.45))
        p_btn = tb_btn.text_frame.paragraphs[0]
        p_btn.text = "GET STARTED"
        p_btn.font.size = Pt(10)
        p_btn.font.bold = True
        p_btn.font.color.rgb = RGBColor(255, 255, 255)
        p_btn.alignment = PP_ALIGN.CENTER

    add_footer(slide, idx + 1, total_slides, branding_info, theme)

def render_diagonal_testimonials_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    """Slide 8: Our Trusted Client with Diagonal Dark Navy Block and 4 Review Cards."""
    set_slide_background(slide, RGBColor(255, 255, 255))
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    tb_left = slide.shapes.add_textbox(Inches(0.8), Inches(1.5), Inches(4.5), Inches(4.0))
    tf_l = tb_left.text_frame
    tf_l.word_wrap = True

    p1 = tf_l.paragraphs[0]
    p1.text = "OUR"
    p1.font.size = Pt(32)
    p1.font.bold = True
    p1.font.color.rgb = theme["title"]

    p2 = tf_l.add_paragraph()
    p2.text = "TRUSTED"
    p2.font.size = Pt(32)
    p2.font.bold = True
    p2.font.color.rgb = theme["accent"]

    p3 = tf_l.add_paragraph()
    p3.text = "CLIENT"
    p3.font.size = Pt(32)
    p3.font.bold = True
    p3.font.color.rgb = theme["title"]

    bullets = slide_data.get("bullets", [])
    p_desc = tf_l.add_paragraph()
    p_desc.text = slide_data.get("subtitle") or "Over 5,000+ satisfied institutional partners, patient families, and certified clinical reviewers worldwide."
    p_desc.font.size = Pt(11)
    p_desc.font.color.rgb = theme["body"]
    p_desc.space_before = Pt(14)

    navy_panel = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(5.6), Inches(0.8), Inches(7.0), Inches(5.8))
    navy_panel.fill.solid()
    navy_panel.fill.fore_color.rgb = RGBColor(30, 37, 43)
    navy_panel.line.fill.background()

    t_coords = [
        (Inches(6.0), Inches(1.2)),
        (Inches(9.3), Inches(1.2)),
        (Inches(6.0), Inches(3.8)),
        (Inches(9.3), Inches(3.8))
    ]
    reviewers = ["Apex Healthcare Group", "Apollo Diagnostics", "Global MedTech Corp", "Metro Trauma Care"]

    for ti in range(4):
        tx, ty = t_coords[ti]
        t_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, tx, ty, Inches(3.0), Inches(2.2))
        t_card.fill.solid()
        t_card.fill.fore_color.rgb = RGBColor(42, 52, 65)
        t_card.line.fill.background()

        av_circ = slide.shapes.add_shape(MSO_SHAPE.OVAL, tx + Inches(0.2), ty + Inches(0.2), Inches(0.55), Inches(0.55))
        av_circ.fill.solid()
        av_circ.fill.fore_color.rgb = theme["accent"] if ti % 2 == 0 else RGBColor(255, 255, 255)
        av_circ.line.fill.background()

        tb_av = slide.shapes.add_textbox(tx + Inches(0.2), ty + Inches(0.22), Inches(0.55), Inches(0.5))
        tb_av.text_frame.paragraphs[0].text = "👤"
        tb_av.text_frame.paragraphs[0].font.size = Pt(12)
        tb_av.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER

        tb_rev = slide.shapes.add_textbox(tx + Inches(0.85), ty + Inches(0.15), Inches(2.0), Inches(1.9))
        tf_r = tb_rev.text_frame
        tf_r.word_wrap = True

        p_r_name = tf_r.paragraphs[0]
        p_r_name.text = reviewers[ti]
        p_r_name.font.size = Pt(11)
        p_r_name.font.bold = True
        p_r_name.font.color.rgb = RGBColor(255, 255, 255)

        p_r_quote = tf_r.add_paragraph()
        p_r_quote.text = f'"{bullets[ti]}"' if ti < len(bullets) else '"Outstanding speed, reliability, and precision across every department."'
        p_r_quote.font.size = Pt(9)
        p_r_quote.font.italic = True
        p_r_quote.font.color.rgb = RGBColor(203, 213, 225)
        p_r_quote.space_before = Pt(4)

def render_closing_contact_chevron_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    """Slide 9: Get in Touch / Contact Slide with Logo, 2x2 Contact Grid & Right Chevron."""
    set_slide_background(slide, RGBColor(255, 255, 255))
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    tb_logo = slide.shapes.add_textbox(Inches(0.8), Inches(0.8), Inches(4.0), Inches(0.5))
    p_lg = tb_logo.text_frame.paragraphs[0]
    p_lg.text = "◈ LOGO"
    p_lg.font.size = Pt(14)
    p_lg.font.bold = True
    p_lg.font.color.rgb = theme["accent"]

    tb_head = slide.shapes.add_textbox(Inches(0.8), Inches(1.5), Inches(6.0), Inches(1.2))
    tf_h = tb_head.text_frame
    p_h = tf_h.paragraphs[0]
    p_h.text = str(slide_data.get("title") or "GET IN TOUCH!").upper()
    p_h.font.size = Pt(32)
    p_h.font.bold = True
    p_h.font.color.rgb = theme["title"]

    p_hs = tf_h.add_paragraph()
    p_hs.text = str(slide_data.get("subtitle") or "Connect directly with our 24/7 central desk & appointment specialists.")
    p_hs.font.size = Pt(11)
    p_hs.font.color.rgb = theme["body"]
    p_hs.space_before = Pt(4)

    contacts = [
        {"title": "LOCATION", "val": "100 Innovation Boulevard\nMedical Centre, Suite 400", "icon": "📍"},
        {"title": "PHONE NUMBER", "val": "+1 (800) 482-0199\n24/7 Triage Line: Ext 1", "icon": "📞"},
        {"title": "WEB PORTAL", "val": "https://codez48.netlify.app\nportal@codez48.org", "icon": "🌐"},
        {"title": "SOCIAL / APPOINTMENTS", "val": "@Codez48Health\nOnline Booking Available", "icon": "💬"}
    ]
    c_grid = [
        (Inches(0.8), Inches(3.2)),
        (Inches(3.8), Inches(3.2)),
        (Inches(0.8), Inches(4.8)),
        (Inches(3.8), Inches(4.8))
    ]

    for ci, ct in enumerate(contacts):
        cx, cy = c_grid[ci]
        tb_c = slide.shapes.add_textbox(cx, cy, Inches(2.8), Inches(1.3))
        tf_c = tb_c.text_frame
        tf_c.word_wrap = True

        p_ct = tf_c.paragraphs[0]
        p_ct.text = f"{ct['icon']}  {ct['title']}"
        p_ct.font.size = Pt(11)
        p_ct.font.bold = True
        p_ct.font.color.rgb = theme["accent"]

        p_cv = tf_c.add_paragraph()
        p_cv.text = ct["val"]
        p_cv.font.size = Pt(10)
        p_cv.font.color.rgb = theme["body"]
        p_cv.space_before = Pt(3)

    chev_navy = slide.shapes.add_shape(MSO_SHAPE.CHEVRON, Inches(7.5), Inches(0.5), Inches(2.2), Inches(6.5))
    chev_navy.fill.solid()
    chev_navy.fill.fore_color.rgb = RGBColor(30, 37, 43)
    chev_navy.line.fill.background()

    chev_orange = slide.shapes.add_shape(MSO_SHAPE.CHEVRON, Inches(8.8), Inches(0.5), Inches(4.2), Inches(6.5))
    chev_orange.fill.solid()
    chev_orange.fill.fore_color.rgb = theme["accent"]
    chev_orange.line.fill.background()

    circ_c = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(9.8), Inches(2.8), Inches(1.8), Inches(1.8))
    circ_c.fill.solid()
    circ_c.fill.fore_color.rgb = RGBColor(255, 255, 255)
    circ_c.line.fill.background()

    tb_ic_c = slide.shapes.add_textbox(Inches(9.8), Inches(3.2), Inches(1.8), Inches(1.0))
    tb_ic_c.text_frame.paragraphs[0].text = "📷"
    tb_ic_c.text_frame.paragraphs[0].font.size = Pt(28)
    tb_ic_c.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER


# ---------------------------------------------------------------------------
# 30 DISTINCT SLIDE DESIGNS MATRIX & EDUCATIONAL FLOWCHART RENDERERS
# Strictly bounded text frames (width <= Inches(6.5)) to eliminate polygon clipping
# ---------------------------------------------------------------------------

def render_cyan_chevron_architecture_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    set_slide_background(slide, theme["bg"])
    add_header_banner(slide, slide_data.get("title", "System Architecture & Workflow"), "CYAN CHEVRON ARCHITECTURE", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    # Decorative Cyan Chevron accents on right
    ch1 = slide.shapes.add_shape(MSO_SHAPE.CHEVRON, Inches(9.8), Inches(1.8), Inches(3.0), Inches(2.2))
    ch1.fill.solid()
    ch1.fill.fore_color.rgb = RGBColor(0, 168, 232)
    ch1.line.color.rgb = RGBColor(0, 168, 232)
    ch1.rotation = 0

    ch2 = slide.shapes.add_shape(MSO_SHAPE.CHEVRON, Inches(10.5), Inches(4.3), Inches(2.3), Inches(1.8))
    ch2.fill.solid()
    ch2.fill.fore_color.rgb = RGBColor(0, 100, 180)
    ch2.line.color.rgb = RGBColor(0, 100, 180)

    # Strictly bounded left text box
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(6.5), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = Inches(0.1)

    p0 = tf.paragraphs[0]
    p0.text = slide_data.get("subtitle", "Strategic Architectural Framework")
    p0.font.size = Pt(14)
    p0.font.bold = True
    p0.font.color.rgb = RGBColor(0, 168, 232)
    p0.space_after = Pt(12)

    bullets = slide_data.get("bullets", [])
    for b in bullets[:4]:
        p = tf.add_paragraph()
        p.text = f"• {b}"
        p.font.size = Pt(12)
        p.font.color.rgb = theme["body"]
        p.space_after = Pt(10)


def render_gold_wave_proposal_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    set_slide_background(slide, RGBColor(10, 18, 35)) # Deep Obsidian Navy
    add_header_banner(slide, slide_data.get("title", "Strategic Project Proposal"), "EXECUTIVE PROPOSAL", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    # Gold organic curved ribbon on right
    wave = slide.shapes.add_shape(MSO_SHAPE.WAVE, Inches(8.2), Inches(1.6), Inches(4.8), Inches(5.0))
    wave.fill.solid()
    wave.fill.fore_color.rgb = RGBColor(229, 184, 11) # Champagne Gold
    wave.line.color.rgb = RGBColor(229, 184, 11)

    # 3 Floating Proposal Value Cards
    bullets = slide_data.get("bullets", ["Strategic Delivery", "Risk Mitigation", "High-Return Execution"])
    for i in range(min(3, len(bullets))):
        c = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.6), Inches(2.0 + i * 1.5), Inches(4.0), Inches(1.2))
        c.fill.solid()
        c.fill.fore_color.rgb = RGBColor(19, 27, 46)
        c.line.color.rgb = RGBColor(229, 184, 11)
        c.line.width = Pt(1.5)
        ctf = c.text_frame
        ctf.word_wrap = True
        cp = ctf.paragraphs[0]
        cp.text = f"Phase {i+1}: {bullets[i]}"
        cp.font.size = Pt(11)
        cp.font.bold = True
        cp.font.color.rgb = RGBColor(255, 255, 255)

    # Strictly bounded left text box
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(6.5), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    p0 = tf.paragraphs[0]
    p0.text = slide_data.get("subtitle", "Value Proposition & Executive Goals")
    p0.font.size = Pt(14)
    p0.font.bold = True
    p0.font.color.rgb = RGBColor(229, 184, 11)
    p0.space_after = Pt(12)

    for b in bullets[:4]:
        p = tf.add_paragraph()
        p.text = f"✔ {b}"
        p.font.size = Pt(12)
        p.font.color.rgb = RGBColor(226, 232, 240)
        p.space_after = Pt(10)


def render_flowchart_process_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    set_slide_background(slide, theme["bg"])
    add_header_banner(slide, slide_data.get("title", "End-to-End Operational Process Flow"), "PROCESS FLOWCHART", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    bullets = slide_data.get("bullets", ["Requirement Intake", "Automated Synthesis", "Quality Verification", "Final Deployment"])
    nodes = bullets[:4] if len(bullets) >= 4 else bullets + ["Execution Stage"] * (4 - len(bullets))

    # 4 Flowchart Connected Blocks with Directional Chevron Arrows
    box_width = Inches(2.3)
    box_height = Inches(2.6)
    spacing = Inches(0.7)
    left_start = Inches(0.8)
    top_pos = Inches(2.4)

    for i, node_text in enumerate(nodes):
        x = left_start + i * (box_width + spacing)
        # Node Card
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, top_pos, box_width, box_height)
        card.fill.solid()
        card.fill.fore_color.rgb = theme["card_bg"]
        card.line.color.rgb = theme["card_border"]
        card.line.width = Pt(1.5)

        # Node Header Pill
        pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x + Inches(0.2), top_pos + Inches(0.2), Inches(1.9), Inches(0.45))
        pill.fill.solid()
        pill.fill.fore_color.rgb = theme["pill_bg"]
        pill.line.color.rgb = theme["pill_bg"]
        ptf = pill.text_frame
        pp = ptf.paragraphs[0]
        pp.text = f"STAGE 0{i+1}"
        pp.alignment = PP_ALIGN.CENTER
        pp.font.size = Pt(9)
        pp.font.bold = True
        pp.font.color.rgb = theme["pill_text"]

        # Node Content
        tb = slide.shapes.add_textbox(x + Inches(0.15), top_pos + Inches(0.8), Inches(2.0), Inches(1.6))
        tf = tb.text_frame
        tf.word_wrap = True
        tp = tf.paragraphs[0]
        tp.text = node_text
        tp.font.size = Pt(11)
        tp.font.bold = True
        tp.font.color.rgb = theme["title"]
        tp.space_after = Pt(6)

        # Connecting Chevron Arrow (between nodes)
        if i < 3:
            arrow = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, x + box_width + Inches(0.1), top_pos + Inches(1.1), Inches(0.5), Inches(0.35))
            arrow.fill.solid()
            arrow.fill.fore_color.rgb = theme["accent"]
            arrow.line.color.rgb = theme["accent"]


def render_hexagon_mesh_tech_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    set_slide_background(slide, theme["bg"])
    add_header_banner(slide, slide_data.get("title", "Technical Architecture & Modularity"), "HEXAGON TECH MESH", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    # Right side Hexagon Cluster Accents
    hex_coords = [(9.2, 1.8), (11.0, 1.8), (10.1, 3.2), (9.2, 4.6), (11.0, 4.6)]
    for hx, hy in hex_coords:
        hx_shape = slide.shapes.add_shape(MSO_SHAPE.HEXAGON, Inches(hx), Inches(hy), Inches(1.6), Inches(1.6))
        hx_shape.fill.solid()
        hx_shape.fill.fore_color.rgb = RGBColor(230, 240, 250)
        hx_shape.line.color.rgb = theme["accent"]
        hx_shape.line.width = Pt(1.5)

    # Bounded text box on left
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(6.5), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    p0 = tf.paragraphs[0]
    p0.text = slide_data.get("subtitle", "Modular Component Hierarchy")
    p0.font.size = Pt(14)
    p0.font.bold = True
    p0.font.color.rgb = theme["accent"]
    p0.space_after = Pt(12)

    bullets = slide_data.get("bullets", [])
    for b in bullets[:4]:
        p = tf.add_paragraph()
        p.text = f"⬡ {b}"
        p.font.size = Pt(12)
        p.font.color.rgb = theme["body"]
        p.space_after = Pt(10)


def render_dark_cyber_glow_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    set_slide_background(slide, RGBColor(12, 17, 28))
    add_header_banner(slide, slide_data.get("title", "Cyber Infrastructure & Real-Time Telemetry"), "CYBER GLOW HUD", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    # 2 Glowing Right Telemetry Cards
    bullets = slide_data.get("bullets", ["Real-time event processing", "Zero-trust verification"])
    for i in range(min(2, len(bullets))):
        c = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.8), Inches(1.8 + i * 2.5), Inches(4.8), Inches(2.2))
        c.fill.solid()
        c.fill.fore_color.rgb = RGBColor(20, 30, 48)
        c.line.color.rgb = RGBColor(0, 220, 255)
        c.line.width = Pt(1.5)
        ctf = c.text_frame
        ctf.word_wrap = True
        cp = ctf.paragraphs[0]
        cp.text = f"STREAM 0{i+1}"
        cp.font.size = Pt(10)
        cp.font.bold = True
        cp.font.color.rgb = RGBColor(0, 220, 255)
        cp.space_after = Pt(4)
        cp2 = ctf.add_paragraph()
        cp2.text = bullets[i]
        cp2.font.size = Pt(11)
        cp2.font.color.rgb = RGBColor(226, 232, 240)

    # Strictly bounded left text box
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(6.5), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    p0 = tf.paragraphs[0]
    p0.text = slide_data.get("subtitle", "Autonomous System Monitoring")
    p0.font.size = Pt(14)
    p0.font.bold = True
    p0.font.color.rgb = RGBColor(0, 220, 255)
    p0.space_after = Pt(12)

    for b in bullets[:4]:
        p = tf.add_paragraph()
        p.text = f"▶ {b}"
        p.font.size = Pt(12)
        p.font.color.rgb = RGBColor(200, 215, 230)
        p.space_after = Pt(10)


def render_ocean_wave_fluid_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    set_slide_background(slide, theme["bg"])
    add_header_banner(slide, slide_data.get("title", "Fluid Performance & Optimization"), "OCEAN WAVE FLUID", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    # Ocean fluid wave footer
    w = slide.shapes.add_shape(MSO_SHAPE.WAVE, Inches(0), Inches(5.8), Inches(13.333), Inches(1.4))
    w.fill.solid()
    w.fill.fore_color.rgb = RGBColor(200, 235, 250)
    w.line.color.rgb = RGBColor(0, 168, 232)

    # 3 Floating Wave Cards
    bullets = slide_data.get("bullets", ["Dynamic Resource Scaling", "Low-Latency Buffering", "Seamless Throughput"])
    for i in range(min(3, len(bullets))):
        c = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + i * 4.0), Inches(2.0), Inches(3.6), Inches(3.4))
        c.fill.solid()
        c.fill.fore_color.rgb = theme["card_bg"]
        c.line.color.rgb = RGBColor(0, 168, 232)
        c.line.width = Pt(1.5)
        ctf = c.text_frame
        ctf.word_wrap = True
        cp = ctf.paragraphs[0]
        cp.text = f"METRIC 0{i+1}"
        cp.font.size = Pt(10)
        cp.font.bold = True
        cp.font.color.rgb = RGBColor(0, 168, 232)
        cp.space_after = Pt(8)
        cp2 = ctf.add_paragraph()
        cp2.text = bullets[i]
        cp2.font.size = Pt(12)
        cp2.font.color.rgb = theme["title"]


def render_luxury_gold_rings_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    set_slide_background(slide, RGBColor(15, 20, 30))
    add_header_banner(slide, slide_data.get("title", "Executive Tier & Strategic Milestones"), "LUXURY GOLD ORBITS", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    # Concentric Gold Rings on Right
    r1 = slide.shapes.add_shape(MSO_SHAPE.DONUT, Inches(8.5), Inches(1.8), Inches(4.2), Inches(4.2))
    r1.fill.solid()
    r1.fill.fore_color.rgb = RGBColor(25, 35, 55)
    r1.line.color.rgb = RGBColor(229, 184, 11)
    r1.line.width = Pt(2)

    # Left Bounded Text Box
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(6.5), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    p0 = tf.paragraphs[0]
    p0.text = slide_data.get("subtitle", "Tiered Milestone Deliverables")
    p0.font.size = Pt(14)
    p0.font.bold = True
    p0.font.color.rgb = RGBColor(229, 184, 11)
    p0.space_after = Pt(12)

    bullets = slide_data.get("bullets", [])
    for b in bullets[:4]:
        p = tf.add_paragraph()
        p.text = f"◈ {b}"
        p.font.size = Pt(12)
        p.font.color.rgb = RGBColor(226, 232, 240)
        p.space_after = Pt(10)


def render_double_chevron_arrow_slide(slide, slide_data, idx, total_slides, theme, branding_info):
    set_slide_background(slide, theme["bg"])
    add_header_banner(slide, slide_data.get("title", "Strategic Roadmap & Forward Trajectory"), "FORWARD CHEVRONS", branding_info, theme)
    add_footer(slide, idx + 1, total_slides, branding_info, theme)

    # 3 Forward Chevron Horizontal Stages
    bullets = slide_data.get("bullets", ["Discovery & Architecture", "Rapid Implementation", "Global Rollout"])
    for i in range(min(3, len(bullets))):
        ch = slide.shapes.add_shape(MSO_SHAPE.CHEVRON, Inches(0.8 + i * 4.0), Inches(2.2), Inches(3.8), Inches(4.0))
        ch.fill.solid()
        ch.fill.fore_color.rgb = theme["card_bg"]
        ch.line.color.rgb = theme["accent"]
        ch.line.width = Pt(1.5)
        ctf = ch.text_frame
        ctf.word_wrap = True
        ctf.margin_left = Inches(0.4)
        ctf.margin_right = Inches(0.8)
        cp = ctf.paragraphs[0]
        cp.text = f"PHASE 0{i+1}"
        cp.font.size = Pt(11)
        cp.font.bold = True
        cp.font.color.rgb = theme["accent"]
        cp.space_after = Pt(10)
        cp2 = ctf.add_paragraph()
        cp2.text = bullets[i]
        cp2.font.size = Pt(12)
        cp2.font.color.rgb = theme["title"]


def generate_presentation(config):
    title = config.get("title", "Executive Presentation")
    slides_data = config.get("slides", [])
    destination_path = config.get("destinationPath") or config.get("targetPath")
    theme_name = config.get("theme", "EXECUTIVE_LUXURY")
    branding_info = config.get("institutionInfo", "")

    # Auto-handle swapped arguments
    if isinstance(destination_path, list) and isinstance(slides_data, str):
        destination_path, slides_data = slides_data, destination_path
    elif isinstance(destination_path, list) and isinstance(config.get("title"), str):
        destination_path = config.get("title")

    if not destination_path or not isinstance(destination_path, str):
        destination_path = os.path.join(tempfile.gettempdir(), "presentation.pptx")

    dest_dir = os.path.dirname(os.path.abspath(destination_path))
    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir, exist_ok=True)

    theme = resolve_theme(theme_name, title + " " + branding_info)

    prs = Presentation()
    # 16:9 Widescreen: 13.333 x 7.5 Inches
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    blank_layout = prs.slide_layouts[6]
    total_slides = len(slides_data)

    for idx, slide_info in enumerate(slides_data):
        slide = prs.slides.add_slide(blank_layout)
        layout = (slide_info.get("layout") or "three_cards").lower()

        # Is this an executive flagship presentation or matching chevron layout?
        is_flagship_suite = (theme_name == "EXECUTIVE_CHEVRON_ORANGE") or any(k in title.lower() for k in ["chevron", "strategic", "executive"])

        if idx == 0 or layout in ["chevron_cutout_right", "chevron_title", "business_slide", "title_slide", "hero_title"]:
            if is_flagship_suite or "chevron" in layout or layout in ["chevron_cutout_right", "chevron_title", "business_slide"]:
                render_chevron_title_slide(slide, slide_info, title, theme, branding_info)
            else:
                render_title_slide(slide, slide_info, title, theme, branding_info)
        elif layout in ["chevron_divider_3badges", "about_company", "company_overview", "hospital_overview"] or (is_flagship_suite and idx == 1):
            render_about_company_chevron_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["split_capsules", "mission_vision", "mission_and_vision", "dual_capsules"] or (is_flagship_suite and idx == 2):
            render_split_capsules_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["curved_panel_4cards", "services", "services_panel", "clinical_services", "company_services"] or (is_flagship_suite and idx == 3):
            render_curved_services_panel_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["4_hexagons_slate", "team", "creative_team", "hexagons", "clinical_team", "leadership_team"] or (is_flagship_suite and idx == 4):
            render_four_hexagons_team_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["stacked_column_chart_4years", "chart", "business_chart", "growth_chart", "stacked_chart"] or (is_flagship_suite and idx == 5):
            render_stacked_column_chart_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["3_pricing_cards", "pricing", "price_table", "our_price_table", "pricing_table", "packages"] or (is_flagship_suite and idx == 6):
            render_three_pricing_cards_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["diagonal_split_testimonials", "clients", "our_trusted_client", "testimonials", "trusted_clients"] or (is_flagship_suite and idx == 7):
            render_diagonal_testimonials_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif idx == total_slides - 1 or layout in ["closing_contact_chevron", "contact", "get_in_touch", "closing", "contact_us"]:
            if is_flagship_suite or layout in ["closing_contact_chevron", "contact", "get_in_touch"]:
                render_closing_contact_chevron_slide(slide, slide_info, idx, total_slides, theme, branding_info)
            else:
                render_full_width_takeaway_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["four_pillars"]:
            render_four_pillars_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["quote_hero"]:
            render_quote_hero_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["problem_solution_split", "problem_solution"]:
            render_problem_solution_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["timeline_roadmap", "roadmap", "timeline"]:
            render_timeline_roadmap_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["full_width_takeaway", "takeaway", "conclusion"]:
            render_full_width_takeaway_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["kpi_dashboard", "stats_grid", "metrics"]:
            render_kpi_dashboard_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["image_left", "text_left", "image_split"]:
            render_image_split_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["two_column", "comparison", "swot", "feature_matrix", "team_governance", "faq_accordion"]:
            render_two_column_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["cyan_chevron_architecture", "architecture", "flowchart_architecture"] or (idx % 6 == 1):
            render_cyan_chevron_architecture_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["gold_wave_proposal", "proposal", "wave_proposal"] or (idx % 6 == 2):
            render_gold_wave_proposal_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["flowchart_process", "flowchart", "process", "process_flow", "educational_flowchart"] or (idx % 6 == 3):
            render_flowchart_process_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["hexagon_mesh_tech", "hexagon_mesh", "tech_mesh"] or (idx % 6 == 4):
            render_hexagon_mesh_tech_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["dark_cyber_glow", "cyber_glow", "dark_glow", "telemetry"] or (idx % 6 == 5):
            render_dark_cyber_glow_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["ocean_wave_fluid", "ocean_wave", "fluid_wave"]:
            render_ocean_wave_fluid_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["luxury_gold_rings", "gold_rings", "orbits"]:
            render_luxury_gold_rings_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        elif layout in ["double_chevron_arrow", "forward_chevrons", "chevron_arrows"]:
            render_double_chevron_arrow_slide(slide, slide_info, idx, total_slides, theme, branding_info)
        else:
            render_three_cards_slide(slide, slide_info, idx, total_slides, theme, branding_info)

    temp_dir = tempfile.gettempdir()
    temp_file = os.path.join(temp_dir, f"codez48_pptx_{os.getpid()}_{int(time_now())}.pptx")
    prs.save(temp_file)

    final_path = destination_path
    try:
        if os.path.exists(final_path):
            try:
                os.remove(final_path)
            except Exception:
                base, ext = os.path.splitext(final_path)
                final_path = f"{base}_v2{ext}"

        shutil.copy2(temp_file, final_path)
    finally:
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception:
                pass

    return {
        "success": True,
        "filePath": final_path,
        "slidesCount": len(slides_data),
        "theme": theme.get("name", theme_name),
        "engine": "PYTHON_PPTX_ULTRA_PREMIUM",
        "fileSize": os.path.getsize(final_path)
    }

def time_now():
    import time
    return time.time()

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: python_pptx_engine.py <config_path_or_json>"}))
        sys.exit(1)

    raw_arg = sys.argv[1]
    config = None

    # 1. Read from temporary JSON file path (primary method to eliminate Windows command line limits)
    if os.path.isfile(raw_arg):
        try:
            with open(raw_arg, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Failed to read config file: {str(e)}"}))
            sys.exit(1)
    # 2. Read from stdin
    elif raw_arg == '--stdin':
        try:
            config = json.load(sys.stdin)
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Failed to read config from stdin: {str(e)}"}))
            sys.exit(1)
    # 3. Read from base64 or raw JSON argument string
    else:
        try:
            decoded = base64.b64decode(raw_arg).decode('utf-8')
            config = json.loads(decoded)
        except Exception:
            try:
                config = json.loads(raw_arg)
            except Exception as e:
                print(json.dumps({"success": False, "error": f"Invalid JSON config: {str(e)}"}))
                sys.exit(1)

    res = generate_presentation(config)
    print(json.dumps(res))

if __name__ == '__main__':
    main()
