// 공통 유틸리티 함수들

// 모임 ID 생성 함수
function generateMeetingId() {
    const now = new Date();
    const dateString = now.getFullYear().toString() + 
                      (now.getMonth() + 1).toString().padStart(2, '0') + 
                      now.getDate().toString().padStart(2, '0');
    const timeString = now.getHours().toString().padStart(2, '0') + 
                      now.getMinutes().toString().padStart(2, '0') + 
                      now.getSeconds().toString().padStart(2, '0');
    const randomString = Math.random().toString(36).substring(2, 5);
    
    return `meeting_${dateString}_${timeString}_${randomString}`;
}

// 날짜 포맷팅
function formatDate(date) {
    return date.toLocaleDateString('ko-KR');
}

// 팀 타입 결정 (남복/여복/혼복) - 양쪽 팀을 모두 고려
function getTeamType(team1, team2) {
    // team1과 team2가 각각 배열인지 확인
    if (!Array.isArray(team1) || !Array.isArray(team2) || team1.length !== 2 || team2.length !== 2) {
        console.error('getTeamType: Invalid team data', { team1, team2 });
        return '혼복'; // 안전한 기본값
    }
    
    // 각 팀의 성별 구성 분석
    const team1Genders = team1.map(m => m.gender).sort();
    const team2Genders = team2.map(m => m.gender).sort();
    
    const team1Type = team1Genders.join('');  // "남남", "여여", "남여"
    const team2Type = team2Genders.join('');  // "남남", "여여", "남여"
    
    // 남복: 양쪽 팀 모두 남자만
    if (team1Type === '남남' && team2Type === '남남') {
        return '남복';
    }
    
    // 여복: 양쪽 팀 모두 여자만  
    if (team1Type === '여여' && team2Type === '여여') {
        return '여복';
    }
    
    // 혼복: 양쪽 팀 모두 남녀 혼성 (순서 무관)
    if (team1Type === '남여' && team2Type === '남여') {
        return '혼복';
    }
    
    // 기타: 그 외 모든 경우 (데이터상으론 '혼복'으로 저장)
    return '혼복';
}

// 표시용 팀 타입 결정 (저장된 "혼복"을 "혼복"/"기타"로 구분)
function getDisplayTeamType(game) {
    // 수동 대진표의 경우 gameType 속성을 우선 확인
    if (game.gameType) {
        const gameTypeMap = {
            'mixed': '혼복',
            'male': '남복', 
            'female': '여복'
        };
        return gameTypeMap[game.gameType] || game.gameType;
    }
    
    if (!game.teamType || game.teamType !== '혼복') {
        return game.teamType || '혼복';
    }
    
    // 저장된 타입이 "혼복"인 경우, 실제 구성을 확인해서 표시 타입 결정
    if (!game.team1 || !game.team2 || game.team1.length !== 2 || game.team2.length !== 2) {
        return '혼복';
    }
    
    const team1Genders = game.team1.map(m => m.gender).sort();
    const team2Genders = game.team2.map(m => m.gender).sort();
    
    const team1Type = team1Genders.join('');
    const team2Type = team2Genders.join('');
    
    // 진짜 혼복: 양쪽 팀 모두 남녀 혼성
    if (team1Type === '남여' && team2Type === '남여') {
        return '혼복';
    }
    
    // 기타: 그 외 모든 경우
    return '기타';
}

// 실력 점수 계산
function calculateTeamSkill(member1, member2) {
    return member1.skill + member2.skill;
}

// 팀 조합 유효성 검증 (새 알고리즘용)
function isValidTeamCombination(team1, team2) {
    if (!Array.isArray(team1) || !Array.isArray(team2) || team1.length !== 2 || team2.length !== 2) {
        return false;
    }
    
    const team1Genders = team1.map(m => m.gender).sort();
    const team2Genders = team2.map(m => m.gender).sort();
    
    const team1Type = team1Genders.join('');
    const team2Type = team2Genders.join('');
    
    // 허용 조합: 남남:남남, 여여:여여, 남여:남여만 허용
    const validCombinations = [
        ['남남', '남남'], ['여여', '여여'], ['남여', '남여']
    ];
    
    const isValid = validCombinations.some(([type1, type2]) => 
        (team1Type === type1 && team2Type === type2) || 
        (team1Type === type2 && team2Type === type1)
    );
    
    if (!isValid) {
        console.log('❌ 금지 조합 감지:', { 
            team1: team1.map(m => `${m.name}(${m.gender})`), 
            team2: team2.map(m => `${m.name}(${m.gender})`),
            team1Type, team2Type 
        });
    }
    
    return isValid;
}

// 별칭 함수 (기존 코드 호환성)
function validateTeamCombination(team1, team2) {
    return isValidTeamCombination(team1, team2);
}

// 배열 섞기 (Fisher-Yates 셔플)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 멤버 게임 수 균등 체크
function checkGameBalance(games, members) {
    const memberGameCount = {};
    
    // 각 멤버의 게임 수 계산
    members.forEach(member => {
        memberGameCount[member.name] = 0;
    });
    
    games.forEach(game => {
        if (game.team1 && game.team1.length === 2) {
            game.team1.forEach(member => {
                memberGameCount[member.name]++;
            });
        }
        if (game.team2 && game.team2.length === 2) {
            game.team2.forEach(member => {
                memberGameCount[member.name]++;
            });
        }
    });
    
    const gameCounts = Object.values(memberGameCount);
    const maxGames = Math.max(...gameCounts);
    const minGames = Math.min(...gameCounts);
    
    return {
        balanced: maxGames - minGames <= 1,
        maxGames,
        minGames,
        memberGameCount
    };
}

// 짧은 공유 ID 생성 (6자리 영숫자)
function generateShortId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 접속 코드 생성 함수
function generateAccessCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 디버그 로그 (개발용)
function debugLog(message, data = null) {
    if (console && console.log) {
        if (data) {
            console.log(`[Tennis Scoreboard] ${message}:`, data);
        } else {
            console.log(`[Tennis Scoreboard] ${message}`);
        }
    }
}