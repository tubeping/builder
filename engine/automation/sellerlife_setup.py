"""
셀러라이프 최초 1회 로그인 설정 (headed 모드)

실행하면 Chrome 창이 열립니다. 직접 Google 로그인 완료 후,
터미널에서 Enter 누르면 프로파일이 저장되고 이후 자동화에 재사용됩니다.

사용법:
    python engine/automation/sellerlife_setup.py
"""
import sys
from pathlib import Path

PROFILE_DIR = Path(__file__).parent.parent / ".sellerlife_profile"
SELLERLIFE_URL = "https://www.sellerlife.co.kr"


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("[오류] playwright 미설치. 설치 명령:")
        print("  pip install playwright && python -m playwright install chromium")
        sys.exit(1)

    PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("  셀러라이프 최초 로그인 설정")
    print("=" * 70)
    print(f"  프로파일 경로: {PROFILE_DIR}")
    print()
    print("  Chrome 창이 열리면:")
    print("    1. Google 로그인 완료 (master@shinsananalytics.com)")
    print("    2. 셀러라이프 메인 페이지 정상 접속 확인")
    print("    3. 이 터미널로 돌아와서 Enter")
    print("=" * 70)
    print()

    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            headless=False,
            viewport={"width": 1280, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
        )

        # 자동화 탐지 회피 (Google 로그인용)
        browser.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

        page = browser.pages[0] if browser.pages else browser.new_page()
        page.goto(SELLERLIFE_URL)

        input("\n  >> 로그인 완료 후 Enter를 눌러주세요... ")

        # 로그인 상태 확인
        current_url = page.url
        content = page.content()

        logged_in = (
            "logout" in content.lower()
            or "로그아웃" in content
            or "mypage" in current_url
            or "/my/" in current_url
        )

        if logged_in:
            print("\n[성공] 로그인 상태 저장됨")
            print(f"  프로파일: {PROFILE_DIR}")
            print("  이후 sellerlife_auto.py 가 이 프로파일을 재사용합니다.")
        else:
            print("\n[경고] 로그인 상태가 감지되지 않습니다.")
            print(f"  현재 URL: {current_url}")
            print("  로그인이 정상 완료됐는지 확인 후 다시 실행해주세요.")

        browser.close()


if __name__ == "__main__":
    main()
