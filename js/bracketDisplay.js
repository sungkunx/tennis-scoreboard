// 대진표 화면 표시 관련 기능들

// 대진표 표시
function displayBracket() {
    const meeting = appState.tempMeeting || appState.currentMeeting;
    if (!meeting || !meeting.bracket) return;
    
    // 모임 정보 표시
    displayBracketSummary(meeting);
    
    // 대진표 렌더링
    renderBracketTable(meeting.bracket);
    
    // 게임 균형 체크 및 경고 표시
    checkAndDisplayGameBalance(meeting.bracket, meeting.members);
}

// 대진표 상단 요약 표시
function displayBracketSummary(meeting) {
    const summary = document.getElementById('bracket-summary');
    if (!summary) return;
    
    const memberNames = meeting.members.map(m => m.name).join(', ');
    const settings = meeting.settings;
    
    summary.innerHTML = `
        <div><strong>${meeting.name}</strong></div>
        <div>${meeting.members.length}명: ${memberNames}</div>
        <div>코트 ${settings.courtCount}개 × 타임 ${settings.timeCount}개 = 총 ${meeting.bracket.games.length}게임</div>
    `;
}

// 대진표 테이블 렌더링
function renderBracketTable(bracket) {
    const bracketContainer = document.getElementById('bracket-container');
    if (!bracketContainer) return;
    
    const groupedGames = groupGamesByTime(bracket.games);
    let html = '';
    
    Object.keys(groupedGames).sort((a, b) => parseInt(a) - parseInt(b)).forEach(time => {
        html += `
            <div class="time-section">
                <h3 class="time-header">${time}타임</h3>
                <div class="courts-container">
        `;
        
        groupedGames[time].forEach(game => {
            html += renderGameCard(game);
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    bracketContainer.innerHTML = html;
}

// 타임별로 게임 그룹화
function groupGamesByTime(games) {
    const grouped = {};
    games.forEach(game => {
        const timeKey = game.time;
        if (!grouped[timeKey]) {
            grouped[timeKey] = [];
        }
        grouped[timeKey].push(game);
    });
    return grouped;
}

// 개별 게임 카드 렌더링
function renderGameCard(game) {
    const team1Members = game.team1 || [];
    const team2Members = game.team2 || [];
    
    return `
        <div class="game-card" data-game-id="${game.id}">
            <div class="court-header">
                <span class="court-name">${game.court}번 코트</span>
                <span class="team-type-badge ${game.teamType}">${game.teamType}</span>
            </div>
            
            <div class="teams-container">
                <div class="team" data-team="1">
                    <div class="team-label">팀 1</div>
                    ${team1Members.map(member => renderMemberCard(member, game.id, 1)).join('')}
                </div>
                
                <div class="vs-divider">VS</div>
                
                <div class="team" data-team="2">
                    <div class="team-label">팀 2</div>
                    ${team2Members.map(member => renderMemberCard(member, game.id, 2)).join('')}
                </div>
            </div>
            
            <div class="game-actions">
                <div class="edit-instruction">플레이어를 클릭하여 교체하세요</div>
            </div>
        </div>
    `;
}

// 멤버 카드 렌더링
function renderMemberCard(member, gameId, teamNumber) {
    const meeting = appState.tempMeeting || appState.currentMeeting;
    const isKDK = meeting?.settings?.bracketType === 'kdk';
    
    if (isKDK) {
        // KDK 모드: "KDK(1) 홍길동(실력9)" 형식 (클릭 불가)
        const kdkNumber = member.kdkNumber || '?';
        const gamesCount = meeting?.bracket?.memberGameCount?.[member.name] || 0;
        
        return `
            <div class="member-card kdk-member kdk-locked" title="KDK 방식에서는 플레이어 변경이 불가능합니다">
                <div class="member-name">KDK(${kdkNumber}) ${member.name}(실력${member.skill})</div>
                <div class="member-info">
                    <span class="kdk-number">번호 ${kdkNumber}</span>
                    <span class="game-count">${gamesCount}게임</span>
                    <span class="kdk-locked-icon">🔒</span>
                </div>
            </div>
        `;
    } else {
        // 기존 랜덤 모드
        const gamesCount = meeting?.bracket?.memberGameCount?.[member.name] || 0;
        
        // 평균 게임 수 계산: (총 게임수 × 4명) ÷ 전체 플레이어 수
        const totalGames = meeting?.bracket?.games?.length || 0;
        const totalPlayers = meeting?.members?.length || 1;
        const averageGames = (totalGames * 4) / totalPlayers;
        const diffFromAverage = gamesCount - averageGames;
        const diffText = diffFromAverage > 0 ? `+${diffFromAverage.toFixed(1)}` : diffFromAverage.toFixed(1);
        
        return `
            <div class="member-card" onclick="editPlayer('${gameId}', ${teamNumber}, '${member.name}')">
                <div class="member-name">${member.name}</div>
                <div class="member-info">
                    <span class="gender">${member.gender}</span>
                    <span class="skill">실력${member.skill}</span>
                    <span class="game-count">${gamesCount}게임</span>
                    <span class="game-diff ${diffFromAverage > 0 ? 'over-average' : 'under-average'}">평균대비${diffText}</span>
                </div>
            </div>
        `;
    }
}

// 게임 균형 체크 및 표시
function checkAndDisplayGameBalance(bracket, members) {
    const balanceInfo = document.getElementById('balance-info');
    if (!balanceInfo) return;
    
    // 평균 게임 수 계산
    const totalGames = bracket.games.length;
    const totalPlayers = members.length;
    const averageGames = (totalGames * 4) / totalPlayers;
    
    // 각 멤버의 게임 수와 평균 대비 차이 계산
    const memberStats = members.map(member => {
        const gamesCount = bracket.memberGameCount[member.name] || 0;
        const diffFromAverage = gamesCount - averageGames;
        return {
            name: member.name,
            games: gamesCount,
            diff: diffFromAverage
        };
    });
    
    // 평균보다 많이/적게 하는 멤버들 분류
    const overAverage = memberStats.filter(m => m.diff > 0.5);
    const underAverage = memberStats.filter(m => m.diff < -0.5);
    
    let html = `
        <div class="balance-info-new">
            <div class="average-info">
                📊 평균 게임 수: ${averageGames.toFixed(1)}게임 (총 ${totalGames}게임 ÷ ${totalPlayers}명)
            </div>
    `;
    
    if (overAverage.length > 0) {
        html += `
            <div class="over-average-list">
                🔺 평균보다 많음: ${overAverage.map(m => `${m.name}(${m.games}게임, +${m.diff.toFixed(1)})`).join(', ')}
            </div>
        `;
    }
    
    if (underAverage.length > 0) {
        html += `
            <div class="under-average-list">
                🔻 평균보다 적음: ${underAverage.map(m => `${m.name}(${m.games}게임, ${m.diff.toFixed(1)})`).join(', ')}
            </div>
        `;
    }
    
    if (overAverage.length === 0 && underAverage.length === 0) {
        html += `
            <div class="balanced-info">
                ✅ 모든 멤버의 게임 수가 평균과 비슷합니다
            </div>
        `;
    }
    
    html += `</div>`;
    balanceInfo.innerHTML = html;
}

// 대진표 진행 체크
function checkBracketProgress() {
    // 이제 균형 체크 없이 바로 진행 가능
    return true;
}

// 대진표에서 게임 진행으로
function proceedToGame() {
    console.log('🎾 proceedToGame 함수 호출됨');
    
    try {
        // appState 확인
        if (!appState) {
            console.error('❌ appState가 정의되지 않음');
            alert('앱 상태가 초기화되지 않았습니다.');
            return;
        }
        
        console.log('✅ appState:', appState);
        
        // 진행하기 전 확인 (모든 모드에서)
        if (!confirm('진행하면 현재 설정을 변경 할 수 없습니다. 진행하시겠습니까?')) {
            console.log('⏸️ 사용자가 진행을 취소함');
            return;
        }
        
        console.log('🔍 checkBracketProgress 체크 시작');
        if (checkBracketProgress()) {
            console.log('✅ checkBracketProgress 통과');
            
            // 현재 모임 상태를 'playing'으로 변경
            const meeting = appState.tempMeeting || appState.currentMeeting;
            console.log('📋 현재 모임:', meeting);
            
            if (!meeting) {
                console.error('❌ 모임 데이터를 찾을 수 없음');
                alert('모임 데이터를 찾을 수 없습니다.');
                return;
            }
            
            meeting.status = 'playing';
            
            // meetings 배열에 실제 저장 (이 시점에서만!)
            if (appState.tempMeeting) {
                console.log('💾 새 모임을 저장합니다');
                // 새 모임인 경우 - 중복 체크 후 추가
                const existingIndex = appState.meetings.findIndex(m => 
                    m.name === meeting.name && m.date === meeting.date
                );
                
                if (existingIndex >= 0) {
                    // 기존 모임 업데이트
                    console.log('🔄 기존 모임 업데이트');
                    appState.meetings[existingIndex] = meeting;
                } else {
                    // 새 모임 추가
                    console.log('➕ 새 모임 추가');
                    appState.meetings.push(meeting);
                }
                
                appState.currentMeeting = meeting;
                appState.tempMeeting = null;
            }
            
            console.log('💾 데이터 저장 중...');
            saveMeetings();
            
            console.log('🎮 게임 화면으로 이동...');
            showGameScreen();
        } else {
            console.log('❌ checkBracketProgress 실패');
        }
    } catch (error) {
        console.error('❌ proceedToGame 에러:', error);
        alert('진행 중 오류가 발생했습니다: ' + error.message);
    }
}