// 화면 전환 관련 기능들

// 메인 화면 표시
function showMainScreen() {
    hideAllScreens();
    document.getElementById('main-screen').classList.remove('hidden');
    hideStatusWarning();
    loadMeetings();
}

// Step1 화면 표시
function showStep1() {
    hideAllScreens();
    document.getElementById('step1-screen').classList.remove('hidden');
    showStatusWarning();
    
    const memberList = document.getElementById('member-list');
    if (!memberList.children.length) {
        initializeMembers();
    }
}

// Step2 화면 표시
function showStep2() {
    hideAllScreens();
    document.getElementById('step2-screen').classList.remove('hidden');
    showStatusWarning();

    // 모임 요약 표시
    displayMeetingSummary();

    // 기존 게임 설정 복원 (대진표에서 돌아왔을 때)
    // bracket.settings를 우선 사용하고, 없으면 tempMeeting.settings 사용
    const settings = (appState.tempMeeting && appState.tempMeeting.bracket && appState.tempMeeting.bracket.settings)
        ? appState.tempMeeting.bracket.settings
        : (appState.tempMeeting && appState.tempMeeting.settings);

    if (settings) {

        // 대진표 타입 복원
        if (settings.bracketType) {
            const bracketTypeRadio = document.querySelector(`input[name="bracket-type"][value="${settings.bracketType}"]`);
            if (bracketTypeRadio) {
                bracketTypeRadio.checked = true;
                // 라디오 버튼 변경 시 UI 업데이트
                if (typeof handleBracketTypeChange === 'function') {
                    handleBracketTypeChange();
                }
            }
        }

        // 코트 수 복원
        const courtCountInput = document.getElementById('court-count');
        if (courtCountInput && settings.courtCount) {
            courtCountInput.value = settings.courtCount;
        }

        // 타임 수 복원
        const timeCountInput = document.getElementById('time-count');
        if (timeCountInput && settings.timeCount) {
            timeCountInput.value = settings.timeCount;
        }

        // 실력 균형 복원 (자동 대진표일 때만)
        if (settings.bracketType === 'random') {
            const skillBalanceCheckbox = document.getElementById('skill-balance');
            if (skillBalanceCheckbox && settings.skillBalance !== undefined) {
                skillBalanceCheckbox.checked = settings.skillBalance;
            }
        }

        // KDK 실력 구분 복원
        if (settings.bracketType === 'kdk' && settings.kdkSkillBalance !== undefined) {
            const kdkSkillBalanceCheckbox = document.getElementById('kdk-skill-balance');
            if (kdkSkillBalanceCheckbox) {
                kdkSkillBalanceCheckbox.checked = settings.kdkSkillBalance;
            }
        }

        // 게임 타입 분배 복원 (자동 대진표일 때만)
        if (settings.bracketType === 'random' && settings.manualDistribution) {
            const maleGamesInput = document.getElementById('male-games');
            const femaleGamesInput = document.getElementById('female-games');
            const mixedGamesDisplay = document.getElementById('mixed-games');

            if (maleGamesInput && settings.manualDistribution.남복 !== undefined) {
                maleGamesInput.value = settings.manualDistribution.남복;
            }
            if (femaleGamesInput && settings.manualDistribution.여복 !== undefined) {
                femaleGamesInput.value = settings.manualDistribution.여복;
            }
            if (mixedGamesDisplay && settings.manualDistribution.혼복 !== undefined) {
                mixedGamesDisplay.textContent = settings.manualDistribution.혼복;
            }

            // UI 업데이트
            if (typeof updateGameTypeDistribution === 'function') {
                updateGameTypeDistribution();
            }
        }

        console.log('✅ 게임 설정 복원 완료:', settings);
    }

    updateGameCountInfo();

    // 대진표 타입에 따른 설정 복원
    const bracketType = document.querySelector('input[name="bracket-type"]:checked')?.value;
    if (bracketType === 'manual') {
        setupManualMode();
    } else if (bracketType === 'kdk') {
        setupKDKMode();
    } else {
        setupRandomMode();
    }
}

// 대진표 화면 표시
function showBracketScreen() {
    hideAllScreens();
    document.getElementById('bracket-screen').classList.remove('hidden');
    showStatusWarning();
    displayBracket();
}

// 게임 화면 표시
function showGameScreen() {
    hideAllScreens();
    document.getElementById('game-screen').classList.remove('hidden');
    initializeGameScreen();
}

// 모든 화면 숨김
function hideAllScreens() {
    document.querySelectorAll('[id$="-screen"]').forEach(screen => {
        screen.classList.add('hidden');
    });
}