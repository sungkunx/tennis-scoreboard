// 게임 스코어 관리 기능들

// 게임 화면 표시 및 초기화
function initializeGameScreen() {
    const meeting = appState.currentMeeting;
    if (!meeting || !meeting.bracket) return;
    
    // 모임명 표시
    displayGameMeetingName(meeting);
    
    // 리프레시 버튼 상태 업데이트
    updateRefreshButtonState();
    
    // 상단 순위표 표시
    displayRankingTable(meeting);
    
    // 게임 스케줄 표시
    displayGameSchedule(meeting);
    
    // 진행 상황 업데이트
    updateGameProgress(meeting);
}

// 게임 화면에 모임명 표시
function displayGameMeetingName(meeting) {
    const meetingNameElement = document.getElementById('game-meeting-name');
    if (meetingNameElement && meeting.name) {
        meetingNameElement.textContent = meeting.name;
    }
}

// 리프레시 버튼 상태 업데이트
function updateRefreshButtonState() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        if (appState.onlineMode && appState.onlineMode.active) {
            refreshBtn.disabled = false;
            refreshBtn.title = '서버에서 최신 데이터 불러오기';
        } else {
            refreshBtn.disabled = true;
            refreshBtn.title = '오프라인 모드에서는 사용할 수 없습니다';
        }
    }
}

// 게임 데이터 새로고침
function refreshGameData() {
    if (!appState.onlineMode || !appState.onlineMode.active) {
        alert('오프라인 모드에서는 새로고침을 사용할 수 없습니다.');
        return;
    }
    
    if (!isFirebaseConnected() || !appState.onlineMode.accessCode) {
        alert('온라인 연결이 없습니다.');
        return;
    }
    
    if (confirm('서버에서 최신 데이터를 불러오시겠습니까?\n현재 입력 중인 내용이 사라질 수 있습니다.')) {
        const accessCode = appState.onlineMode.accessCode;
        
        // 로딩 상태 표시
        const refreshBtn = document.getElementById('refresh-btn');
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '⏳';
        refreshBtn.disabled = true;
        
        database.ref('accessCodes/' + accessCode).once('value')
            .then((snapshot) => {
                const data = snapshot.val();
                if (data && data.meetings) {
                    // 데이터 업데이트
                    appState.meetings = data.meetings;
                    
                    // 현재 모임 다시 찾기
                    const currentMeetingId = appState.currentMeeting.name + '_' + appState.currentMeeting.date;
                    const updatedMeeting = appState.meetings.find(m => 
                        (m.name + '_' + m.date) === currentMeetingId
                    );
                    
                    if (updatedMeeting) {
                        appState.currentMeeting = updatedMeeting;
                        
                        // 화면 새로고침
                        initializeGameScreen();
                        
                        alert('최신 데이터를 불러왔습니다.');
                    } else {
                        alert('현재 모임 데이터를 찾을 수 없습니다.');
                    }
                } else {
                    alert('서버에 데이터가 없습니다.');
                }
            })
            .catch((error) => {
                console.error('데이터 새로고침 실패:', error);
                alert('데이터를 불러오는데 실패했습니다.');
            })
            .finally(() => {
                // 로딩 상태 복원
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
            });
    }
}

// 순위표 표시
function displayRankingTable(meeting) {
    const rankingContainer = document.getElementById('ranking-container');
    if (!rankingContainer) return;
    
    const rankings = calculateRankings(meeting);
    
    let html = `
        <table class="ranking-table">
            <thead>
                <tr>
                    <th>순위</th>
                    <th>이름</th>
                    <th>승수</th>
                    <th>게임득</th>
                    <th>게임실</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    rankings.forEach((player, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${player.name}</td>
                <td>${player.wins}</td>
                <td>${player.gamesWon}</td>
                <td>${player.gamesLost}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    rankingContainer.innerHTML = html;
}

// 순위 계산
function calculateRankings(meeting) {
    const playerStats = {};
    
    // 각 멤버 초기화
    meeting.members.forEach(member => {
        playerStats[member.name] = {
            name: member.name,
            wins: 0,
            gamesWon: 0,
            gamesLost: 0
        };
    });
    
    // 완료된 게임들로부터 통계 계산
    meeting.bracket.games.forEach(game => {
        if (game.completed && game.score1 !== null && game.score2 !== null) {
            const team1Score = parseInt(game.score1);
            const team2Score = parseInt(game.score2);
            
            // 각 팀 멤버들의 통계 업데이트
            if (game.team1) {
                game.team1.forEach(member => {
                    playerStats[member.name].gamesWon += team1Score;
                    playerStats[member.name].gamesLost += team2Score;
                    if (team1Score > team2Score) {
                        playerStats[member.name].wins++;
                    }
                });
            }
            
            if (game.team2) {
                game.team2.forEach(member => {
                    playerStats[member.name].gamesWon += team2Score;
                    playerStats[member.name].gamesLost += team1Score;
                    if (team2Score > team1Score) {
                        playerStats[member.name].wins++;
                    }
                });
            }
        }
    });
    
    // 순위 정렬 (승수 우선, 게임득실차 보조)
    return Object.values(playerStats).sort((a, b) => {
        if (b.wins !== a.wins) {
            return b.wins - a.wins; // 승수 내림차순
        }
        return (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost); // 득실차 내림차순
    });
}

// 게임 스케줄 표시
function displayGameSchedule(meeting) {
    const scheduleContainer = document.getElementById('schedule-container');
    if (!scheduleContainer) return;
    
    const groupedGames = groupGamesByTime(meeting.bracket.games);
    let html = '';
    
    Object.keys(groupedGames).sort((a, b) => parseInt(a) - parseInt(b)).forEach(time => {
        html += `
            <div class="time-section">
                <h3 class="time-header">${time}타임</h3>
                <div class="games-grid">
        `;
        
        groupedGames[time].forEach(game => {
            html += renderGameScoreCard(game);
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    scheduleContainer.innerHTML = html;
}

// 게임 스케줄 UI 새로고침
function refreshGameScheduleDisplay(meeting) {
    // 게임 스케줄만 다시 렌더링
    displayGameSchedule(meeting);
}

// 게임 스코어 카드 렌더링
function renderGameScoreCard(game) {
    const team1Members = game.team1 || [];
    const team2Members = game.team2 || [];
    const isCompleted = game.completed;
    
    return `
        <div class="game-score-card ${isCompleted ? 'completed' : ''}" data-game-id="${game.id}">
            <div class="court-header">
                <span class="court-name">${game.court}번 코트</span>
                <span class="team-type-badge ${getDisplayTeamType(game)}">${getDisplayTeamType(game)}</span>
            </div>
            
            <div class="score-section">
                <div class="team-score">
                    <div class="team-members">
                        ${team1Members.map(m => `<div class="member-name">${m.name}</div>`).join('')}
                    </div>
                    <div class="score-input-container">
                        <input type="number" 
                               class="score-input" 
                               min="0" max="6" 
                               value="${game.score1 || ''}"
                               placeholder="0"
                               onchange="updateGameScore('${game.id}', 1, this.value)">
                    </div>
                </div>
                
                <div class="vs-divider">:</div>
                
                <div class="team-score">
                    <div class="team-members">
                        ${team2Members.map(m => `<div class="member-name">${m.name}</div>`).join('')}
                    </div>
                    <div class="score-input-container">
                        <input type="number" 
                               class="score-input" 
                               min="0" max="6" 
                               value="${game.score2 || ''}"
                               placeholder="0"
                               onchange="updateGameScore('${game.id}', 2, this.value)">
                    </div>
                </div>
            </div>
            
            <div class="game-status">
                ${isCompleted ? 
                    '<span class="status-completed">완료</span>' : 
                    '<span class="status-progress">진행중</span>'
                }
            </div>
        </div>
    `;
}

// 게임 스코어 업데이트
function updateGameScore(gameId, teamNumber, score) {
    const meeting = appState.currentMeeting;
    if (!meeting?.bracket) return;
    
    const game = meeting.bracket.games.find(g => g.id === gameId);
    if (!game) return;
    
    // 스코어 유효성 검사
    const numScore = parseInt(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 6) {
        alert('스코어는 0-6 사이의 숫자여야 합니다.');
        return;
    }
    
    // 스코어 저장
    if (teamNumber === 1) {
        game.score1 = numScore;
    } else {
        game.score2 = numScore;
    }
    
    // 게임 완료 여부 재평가
    if (game.score1 !== null && game.score1 !== '' && 
        game.score2 !== null && game.score2 !== '') {
        game.completed = true;
    } else {
        // 한쪽 스코어라도 비어있으면 진행중으로 변경
        game.completed = false;
    }
    
    // 실시간 순위표 업데이트
    displayRankingTable(meeting);
    
    // 게임 상태 업데이트
    updateGameProgress(meeting);
    
    // 자동 저장
    saveMeetings();
    
    // 게임 카드 UI 새로고침
    refreshGameScheduleDisplay(meeting);
}

// 게임 진행 상황 업데이트
function updateGameProgress(meeting) {
    const totalGames = meeting.bracket.games.length;
    const completedGames = meeting.bracket.games.filter(g => g.completed).length;
    const progressPercent = Math.round((completedGames / totalGames) * 100);
    
    const progressContainer = document.getElementById('game-progress');
    if (progressContainer) {
        progressContainer.innerHTML = `
            <div class="progress-info">
                <span>진행률: ${completedGames}/${totalGames} (${progressPercent}%)</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
        `;
    }
}

// 현재 상태 저장
function saveCurrentState() {
    saveMeetings();
    alert('현재 상태가 저장되었습니다.');
}

// 공유하기 기능
function shareGame() {
    const meeting = appState.currentMeeting;
    if (!meeting) return;
    
    // 온라인 모드가 활성화되지 않은 경우 알림
    if (!appState.onlineMode.active) {
        alert('공유 기능을 사용하려면 먼저 온라인 모드를 활성화해주세요.');
        return;
    }
    
    // 접속 코드와 모임 ID를 포함한 공유 링크 생성
    const accessCode = appState.onlineMode.accessCode;
    const baseUrl = window.location.origin + window.location.pathname;
    
    // 모임 상태에 따라 다른 URL 생성
    console.log('📊 공유 링크 생성 - 모임 정보:', {
        name: meeting.name,
        status: meeting.status,
        id: meeting.id,
        hasId: !!meeting.id
    });
    
    let shareUrl;
    if (meeting.status === 'in-progress' && meeting.id) {
        // 진행중인 게임: 모임 ID 포함
        shareUrl = `${baseUrl}?code=${encodeURIComponent(accessCode)}&meeting=${encodeURIComponent(meeting.id)}`;
        console.log('🎮 진행중 게임 공유 링크 생성:', shareUrl);
    } else {
        // 설정 단계 또는 일반 공유: 접속 코드만
        shareUrl = `${baseUrl}?code=${encodeURIComponent(accessCode)}`;
        console.log('🔧 설정 단계 공유 링크 생성:', shareUrl);
        console.log('🔍 조건 확인 - status:', meeting.status, 'id:', meeting.id);
    }
    
    // 공유 모달 열기
    showShareModal(shareUrl, meeting);
}

// 공유 모달 표시
function showShareModal(shareUrl, meeting) {
    const modal = document.getElementById('share-modal');
    const shareLinkInput = document.getElementById('share-link');
    
    if (modal && shareLinkInput) {
        shareLinkInput.value = shareUrl;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        console.log('📤 공유 링크 생성:', shareUrl);
    }
}

// 공유 모달 닫기
function closeShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// 공유 링크 복사
function copyShareLink() {
    const shareLinkInput = document.getElementById('share-link');
    if (shareLinkInput) {
        shareLinkInput.select();
        shareLinkInput.setSelectionRange(0, 99999); // 모바일 지원
        
        navigator.clipboard.writeText(shareLinkInput.value).then(() => {
            // 복사 버튼 텍스트 일시적 변경
            const copyBtn = document.querySelector('.copy-btn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '복사됨!';
            copyBtn.style.background = '#28a745';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '';
            }, 2000);
            
            console.log('📋 링크가 클립보드에 복사됨');
        }).catch(() => {
            // 클립보드 API 지원하지 않는 경우 대체 방법
            alert('링크를 수동으로 복사해주세요: ' + shareLinkInput.value);
        });
    }
}

// 결과 정리 보기
function showGameSummary() {
    const meeting = appState.currentMeeting;
    if (!meeting) return;
    
    const rankings = calculateRankings(meeting);
    const completedGames = meeting.bracket.games.filter(g => g.completed);
    
    let summaryText = `=== ${meeting.name} 결과 ===\n\n`;
    summaryText += `📅 날짜: ${meeting.date}\n`;
    summaryText += `👥 참가자: ${meeting.members.length}명\n`;
    summaryText += `🎾 총 게임: ${meeting.bracket.games.length}개 (완료: ${completedGames.length}개)\n\n`;
    
    summaryText += `🏆 최종 순위:\n`;
    rankings.forEach((player, index) => {
        summaryText += `${index + 1}위. ${player.name} - ${player.wins}승 (${player.gamesWon}-${player.gamesLost})\n`;
    });
    
    summaryText += `\n📊 경기 결과:\n`;
    completedGames.forEach(game => {
        const team1Names = game.team1?.map(m => m.name).join(', ') || '';
        const team2Names = game.team2?.map(m => m.name).join(', ') || '';
        summaryText += `${game.time}타임 ${game.court}번 코트: (${team1Names}) ${game.score1} : ${game.score2} (${team2Names})\n`;
    });
    
    showSummaryModal(summaryText);
}

// 결과 요약 모달 표시
function showSummaryModal(summaryText) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content summary-modal">
            <div class="modal-header">
                <h3>결과 정리</h3>
                <button class="modal-close" onclick="closeSummaryModal()">×</button>
            </div>
            
            <div class="modal-body summary-modal-body">
                <pre class="summary-text">${summaryText}</pre>
            </div>
            
            <div class="modal-footer summary-modal-footer">
                <button class="btn-secondary" onclick="closeSummaryModal()">닫기</button>
                <button class="btn-primary" onclick="finishAllGames()">모든 경기 종료</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 요약 모달 닫기
function closeSummaryModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// 모든 경기 종료
function finishAllGames() {
    if (confirm('현재 상태를 저장하고 결과 정리를 마치시겠습니까?')) {
        // 단순히 저장만 하고 모달 닫기
        saveMeetings();
        closeSummaryModal();
        alert('결과가 저장되었습니다.');
    }
}