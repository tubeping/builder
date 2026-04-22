"""
셀러라이프 자동 엑셀 다운로드 — CDP 방식

사용자가 평소 쓰는 Chrome(--remote-debugging-port=9222 플래그로 실행됨)에
CDP로 연결해 이미 로그인된 세션을 그대로 활용합니다.

선행 조건:
  Chrome이 --remote-debugging-port=9222 플래그로 실행 중이어야 함.
  (바로가기 속성의 대상 끝에 해당 플래그 추가)

사용법:
    python engine/automation/sellerlife_auto.py
    python engine/automation/sellerlife_auto.py --only 식품 생활_건강
"""
import argparse
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data" / "sellerlife"
LOG_DIR = ROOT / "logs"

CDP_ENDPOINT = "http://localhost:9222"
BASE_URL = "https://sellochomes.co.kr"
CATEGORY_URL = f"{BASE_URL}/sellerlife/sourcing/category/"

CATEGORIES_LEVEL1 = {
    "패션의류":       "50000000",
    "패션잡화":       "50000001",
    "화장품_미용":    "50000002",
    "디지털_가전":    "50000003",
    "가구_인테리어":  "50000004",
    "출산_육아":      "50000005",
    "식품":           "50000006",
    "스포츠_레저":    "50000007",
    "생활_건강":      "50000008",
}


def log(msg: str, log_file=None):
    stamp = datetime.now().strftime("%H:%M:%S")
    line = f"[{stamp}] {msg}"
    print(line)
    if log_file:
        log_file.write(line + "\n")
        log_file.flush()


def download_category(page, cat_name: str, cat_id: str, today: str, log_file) -> bool:
    """단일 카테고리 엑셀 다운로드"""
    try:
        from playwright.sync_api import TimeoutError as PwTimeout

        log(f"  [{cat_name}] 페이지 이동", log_file)
        page.goto(CATEGORY_URL, wait_until="domcontentloaded", timeout=30000)
        try:
            page.wait_for_load_state("networkidle", timeout=10000)
        except PwTimeout:
            pass
        time.sleep(1.5)

        log(f"  [{cat_name}] 1차 드롭다운 열기", log_file)
        page.click("#category1 .dropdown-btn", timeout=10000)
        time.sleep(0.5)

        log(f"  [{cat_name}] 카테고리 선택 (id={cat_id})", log_file)
        page.click(f".dropdown-item.category-item[data-categoryid='{cat_id}']", timeout=10000)
        time.sleep(0.8)

        log(f"  [{cat_name}] 검색 실행", log_file)
        page.click("#discovery-submit-btn", timeout=10000)

        try:
            page.wait_for_selector("#infoloading[style*='display: none']", timeout=60000)
        except PwTimeout:
            log(f"  [{cat_name}] 로딩 대기 타임아웃 — 그래도 진행", log_file)
        time.sleep(2)

        log(f"  [{cat_name}] 엑셀 다운로드 요청", log_file)
        with page.expect_download(timeout=120000) as dl_info:
            try:
                page.click(".all-excel", timeout=5000)
            except PwTimeout:
                page.click(".excel", timeout=5000)

        download = dl_info.value
        dest = DATA_DIR / f"{cat_name}_{today}.xlsx"
        download.save_as(str(dest))
        log(f"  [{cat_name}] [OK] 저장: {dest.name}", log_file)
        return True

    except Exception as e:
        log(f"  [{cat_name}] [실패] {type(e).__name__}: {e}", log_file)
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="+", help="특정 카테고리만 (예: 식품 생활_건강)")
    parser.add_argument("--endpoint", default=CDP_ENDPOINT, help=f"CDP 엔드포인트 (기본: {CDP_ENDPOINT})")
    args = parser.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("[오류] playwright 미설치")
        sys.exit(1)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    today = datetime.today().strftime("%Y%m%d%H%M%S")
    log_path = LOG_DIR / f"sellerlife_{today[:8]}.log"
    log_file = open(log_path, "a", encoding="utf-8")

    log("=" * 60, log_file)
    log("셀러라이프 자동 수집 (CDP 모드)", log_file)
    log("=" * 60, log_file)
    log(f"CDP 엔드포인트: {args.endpoint}", log_file)

    # 대상 카테고리
    targets = {}
    if args.only:
        for name in args.only:
            key = name.replace("/", "_")
            if key in CATEGORIES_LEVEL1:
                targets[key] = CATEGORIES_LEVEL1[key]
            else:
                log(f"[경고] 알 수 없는 카테고리: {name}", log_file)
    else:
        targets = CATEGORIES_LEVEL1

    log(f"대상 카테고리 {len(targets)}개: {list(targets.keys())}", log_file)

    success, fail = 0, 0
    page = None
    browser = None

    with sync_playwright() as p:
        # CDP로 사용자 Chrome에 연결
        try:
            browser = p.chromium.connect_over_cdp(args.endpoint, timeout=10000)
        except Exception as e:
            log(f"[치명] CDP 연결 실패: {e}", log_file)
            log("", log_file)
            log("확인사항:", log_file)
            log(f"  1) Chrome이 --remote-debugging-port=9222 플래그로 실행 중인지?", log_file)
            log(f"     바로가기 속성 > 대상 끝에 추가:", log_file)
            log(f'     "...\\chrome.exe" --remote-debugging-port=9222', log_file)
            log(f"  2) 브라우저에서 {args.endpoint}/json/version 접속 시 JSON 응답 나오는지?", log_file)
            log_file.close()
            sys.exit(4)

        # 기존 컨텍스트 (사용자 현재 세션)
        if not browser.contexts:
            log("[치명] CDP 연결됐지만 컨텍스트 없음", log_file)
            browser.close()
            log_file.close()
            sys.exit(5)

        context = browser.contexts[0]
        # 다운로드 허용 이미 브라우저 설정 기준으로 동작
        page = context.new_page()

        try:
            # 로그인 상태 확인
            log("로그인 상태 확인...", log_file)
            page.goto(CATEGORY_URL, wait_until="domcontentloaded", timeout=30000)
            try:
                page.wait_for_load_state("networkidle", timeout=10000)
            except Exception:
                pass
            time.sleep(2)

            current_url = page.url
            content = page.content()

            redirected_to_login = (
                "/auth/login" in current_url
                or "로그인이 필요" in content
            )
            on_target = "/sourcing/category" in current_url and "로그아웃" in content

            if redirected_to_login or not on_target:
                debug_png = LOG_DIR / f"login_fail_{today[:8]}_{datetime.now().strftime('%H%M%S')}.png"
                try:
                    page.screenshot(path=str(debug_png))
                    log(f"[디버그] 스크린샷: {debug_png}", log_file)
                except Exception:
                    pass
                log(f"[치명] 로그인 세션 문제 또는 페이지 접속 실패", log_file)
                log(f"  현재 URL: {current_url}", log_file)
                log(f"  해결: Chrome에서 sellochomes.co.kr 에 로그인된 상태인지 확인", log_file)
                page.close()
                log_file.close()
                sys.exit(2)

            log("[OK] 로그인 확인", log_file)
            log("", log_file)

            # 카테고리별 수집
            for cat_name, cat_id in targets.items():
                ok = download_category(page, cat_name, cat_id, today, log_file)
                if ok:
                    success += 1
                else:
                    fail += 1
                time.sleep(2)

        except Exception as e:
            log(f"[치명] 실행 중단: {type(e).__name__}: {e}", log_file)
        finally:
            # 탭만 닫고, Chrome 본체는 그대로 둠
            if page:
                try:
                    page.close()
                except Exception:
                    pass
            # browser.close() 하지 않음 — 사용자 Chrome 세션 유지

    log("", log_file)
    log("=" * 60, log_file)
    log(f"완료: 성공 {success} / 실패 {fail} (총 {len(targets)})", log_file)
    log("=" * 60, log_file)
    log_file.close()

    if fail > 0 and success == 0:
        sys.exit(3)


if __name__ == "__main__":
    main()
