"""
셀러라이프 카테고리 분석 페이지 구조 캡처 스크립트

사용자가 브라우저에서 평소처럼 카테고리 분석 페이지로 이동하면,
스크립트가 URL · 엑셀 다운로드 버튼 · 카테고리 셀렉터를 자동 탐지합니다.

사용법:
    python engine/automation/sellerlife_capture.py
"""
import sys
import time
import json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent.parent
PROFILE_DIR = ROOT / ".sellerlife_profile"
SELLERLIFE_URL = "https://www.sellerlife.co.kr"


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("[오류] playwright 미설치")
        sys.exit(1)

    if not PROFILE_DIR.exists():
        print("[오류] 로그인 프로파일 없음. 먼저 sellerlife_setup.py 실행")
        sys.exit(1)

    out_path = ROOT / "automation" / "sellerlife_capture_result.json"
    snap_path = ROOT / "automation" / "sellerlife_snapshot.html"

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            headless=False,
            accept_downloads=True,
            viewport={"width": 1280, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
        )
        ctx.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(SELLERLIFE_URL, wait_until="domcontentloaded")

        print("=" * 70)
        print("  셀러라이프 페이지 구조 캡처")
        print("=" * 70)
        print()
        print("  [할 일]")
        print("  1. 브라우저에서 카테고리 분석 페이지로 이동 (평소 경로)")
        print("  2. '식품' 또는 원하는 카테고리 선택")
        print("  3. '엑셀 다운로드' 버튼이 화면에 보이는 상태로 멈춤")
        print("  4. 이 터미널로 돌아와 Enter")
        print()
        print("=" * 70)

        input("\n  >> 준비되면 Enter... ")

        # 네비게이션·로딩 안정화 대기
        print("  [대기] 페이지 안정화 중...")
        try:
            page.wait_for_load_state("domcontentloaded", timeout=10000)
        except Exception:
            pass
        try:
            page.wait_for_load_state("networkidle", timeout=5000)
        except Exception:
            pass
        time.sleep(1.5)

        current_url = page.url
        try:
            title = page.title()
        except Exception:
            title = "(title 획득 실패 — 네비게이션 중)"

        # 1) 다운로드 관련 버튼·링크 전부 탐지 (각 요소별 try-except로 실패 격리)
        dl_keywords = ["엑셀", "다운로드", "download", "excel", "export", "내려받기"]
        dl_candidates = []
        for tag in ["button", "a", "span", "div"]:
            try:
                elements = page.query_selector_all(tag)
            except Exception:
                continue
            for el in elements:
                try:
                    text = (el.inner_text() or "").strip()[:60]
                    if not text:
                        continue
                    if not any(kw.lower() in text.lower() for kw in dl_keywords):
                        continue
                    try:
                        outer = el.evaluate("el => el.outerHTML")[:300]
                    except Exception:
                        outer = "(outerHTML 실패)"
                    classes = el.get_attribute("class") or ""
                    elem_id = el.get_attribute("id") or ""
                    dl_candidates.append({
                        "tag": tag,
                        "text": text,
                        "class": classes,
                        "id": elem_id,
                        "outerHTML_preview": outer,
                    })
                except Exception:
                    continue

        # 중복 제거
        seen = set()
        unique_candidates = []
        for c in dl_candidates:
            key = (c["text"], c["class"], c["id"])
            if key not in seen:
                seen.add(key)
                unique_candidates.append(c)

        # 2) 카테고리 선택 UI 탐지 (각 요소 try-except)
        cat_candidates = []
        try:
            selects = page.query_selector_all("select")
        except Exception:
            selects = []
        for sel in selects:
            try:
                options = sel.query_selector_all("option")
                option_texts = []
                for o in options[:20]:
                    try:
                        t = (o.inner_text() or "").strip()
                        if t:
                            option_texts.append(t)
                    except Exception:
                        continue
                if option_texts:
                    cat_candidates.append({
                        "type": "select",
                        "name": sel.get_attribute("name"),
                        "id": sel.get_attribute("id"),
                        "class": sel.get_attribute("class"),
                        "options": option_texts,
                    })
            except Exception:
                continue

        # 메뉴 링크
        nav_links = []
        try:
            links = page.query_selector_all("nav a, .menu a, .gnb a, .lnb a, aside a")
        except Exception:
            links = []
        for a in links[:30]:
            try:
                text = (a.inner_text() or "").strip()[:40]
                href = a.get_attribute("href") or ""
                if text and href:
                    nav_links.append({"text": text, "href": href})
            except Exception:
                continue

        result = {
            "captured_at": datetime.now().isoformat(),
            "current_url": current_url,
            "title": title,
            "download_button_candidates": unique_candidates[:20],
            "category_selector_candidates": cat_candidates[:10],
            "nav_links": nav_links[:30],
        }

        # JSON 저장
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        # HTML 스냅샷
        snap_path.write_text(page.content(), encoding="utf-8")

        # 콘솔 요약
        print("\n" + "=" * 70)
        print("  캡처 결과")
        print("=" * 70)
        print(f"  URL   : {current_url}")
        print(f"  TITLE : {title}")
        print()
        print(f"  [다운로드 버튼 후보 {len(unique_candidates)}개]")
        for i, c in enumerate(unique_candidates[:10], 1):
            print(f"    {i}. <{c['tag']}> '{c['text']}' class={c['class'][:40]!r}")
        print()
        print(f"  [카테고리 셀렉터 후보 {len(cat_candidates)}개]")
        for i, c in enumerate(cat_candidates[:5], 1):
            opts_preview = ", ".join(c.get("options", [])[:5])
            print(f"    {i}. <select name={c.get('name')!r}> 옵션: {opts_preview}...")
        print()
        print(f"  [저장] JSON: {out_path}")
        print(f"  [저장] HTML: {snap_path}")
        print()
        print("=" * 70)
        input("  종료하려면 Enter... ")

        ctx.close()


if __name__ == "__main__":
    main()
