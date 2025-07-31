// 대진표에서 멤버 편집 기능들

let editState = {
    currentGameId: null,
    currentTeam: null,
    selectedMemberName: null,
    replacementMemberName: null
};

// 팀 편집 모달 표시
function editTeam(gameId) {
    const meeting = appState.tempMeeting || appState.currentMeeting;
    if (!meeting?.bracket) return;
    
    const game = meeting.bracket.games.find(g => g.id === gameId);
    if (!game) return;
    
    editState.currentGameId = gameId;
    showMemberSelectModal(game);
}

// 멤버 선택을 위한 모달 표시
function showMemberSelectModal(game) {
    const modal = createMemberSelectModal(game);
    document.body.appendChild(modal);
}

// 멤버 선택 모달 생성
function createMemberSelectModal(game) {
    const meeting = appState.tempMeeting || appState.currentMeeting;
    const currentTimeGames = meeting.bracket.games.filter(g => g.time === game.time);
    
    // 현재 타임에 이미 뛰고 있는 멤버들 (편집 중인 게임 제외)
    const busyMembers = currentTimeGames
        .filter(g => g.id !== game.id)
        .flatMap(g => [...(g.team1 || []), ...(g.team2 || [])])
        .map(m => m.name);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${game.court}번 코트 팀 편집</h3>
                <button class="modal-close" onclick="closeMemberSelectModal()">×</button>
            </div>
            
            <div class="modal-body">
                <div class="current-teams">
                    <div class="team-edit" data-team="1">
                        <h4>팀 1</h4>
                        <div class="team-members">
                            ${(game.team1 || []).map(member => `
                                <div class="editable-member" onclick="selectMemberSlot('${game.id}', 1, '${member.name}')">
                                    ${member.name} (${member.gender}, 실력${member.skill})
                                </div>
                            `).join('')}
                            ${(game.team1 || []).length < 2 ? `
                                <div class="empty-slot" onclick="selectMemberSlot('${game.id}', 1, null)">
                                    + 멤버 선택
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="team-edit" data-team="2">
                        <h4>팀 2</h4>
                        <div class="team-members">
                            ${(game.team2 || []).map(member => `
                                <div class="editable-member" onclick="selectMemberSlot('${game.id}', 2, '${member.name}')">
                                    ${member.name} (${member.gender}, 실력${member.skill})
                                </div>
                            `).join('')}
                            ${(game.team2 || []).length < 2 ? `
                                <div class="empty-slot" onclick="selectMemberSlot('${game.id}', 2, null)">
                                    + 멤버 선택
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="available-members">
                    <h4>사용 가능한 멤버</h4>
                    <div class="member-grid">
                        ${meeting.members.map(member => `
                            <div class="selectable-member ${busyMembers.includes(member.name) ? 'disabled' : ''}" 
                                 onclick="selectAvailableMember('${member.name}')"
                                 data-member="${member.name}">
                                <div class="member-name">${member.name}</div>
                                <div class="member-details">
                                    ${member.gender} | 실력${member.skill}
                                    ${busyMembers.includes(member.name) ? ' | 사용중' : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeMemberSelectModal()">취소</button>
                <button class="btn-primary" onclick="saveMemberChanges()">저장</button>
            </div>
        </div>
    `;
    
    return modal;
}

// 멤버 슬롯 선택
function selectMemberSlot(gameId, teamNumber, currentMemberName) {
    editState.currentGameId = gameId;
    editState.currentTeam = teamNumber;
    editState.selectedMemberName = currentMemberName;
    
    // 선택된 슬롯 하이라이트
    document.querySelectorAll('.editable-member, .empty-slot').forEach(el => {
        el.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    // 사용 가능한 멤버들 하이라이트 해제
    document.querySelectorAll('.selectable-member').forEach(el => {
        el.classList.remove('selected');
    });
}

// 사용 가능한 멤버 선택
function selectAvailableMember(memberName) {
    if (!editState.currentGameId || !editState.currentTeam) {
        alert('먼저 교체할 위치를 선택해주세요.');
        return;
    }
    
    const memberElement = document.querySelector(`[data-member="${memberName}"]`);
    if (memberElement.classList.contains('disabled')) {
        alert('이 멤버는 현재 타임에 다른 게임에 참여 중입니다.');
        return;
    }
    
    // 선택된 멤버 하이라이트
    document.querySelectorAll('.selectable-member').forEach(el => {
        el.classList.remove('selected');
    });
    memberElement.classList.add('selected');
    
    // 임시로 변경사항 미리보기
    updateMemberPreview(memberName);
}

// 멤버 변경 미리보기
function updateMemberPreview(newMemberName) {
    const meeting = appState.tempMeeting || appState.currentMeeting;
    const newMember = meeting.members.find(m => m.name === newMemberName);
    
    if (!newMember) return;
    
    const selectedSlot = document.querySelector('.editable-member.selected, .empty-slot.selected');
    if (selectedSlot) {
        selectedSlot.innerHTML = `${newMember.name} (${newMember.gender}, 실력${newMember.skill})`;
        selectedSlot.className = 'editable-member selected preview';
    }
}

// 멤버 변경사항 저장
function saveMemberChanges() {
    const meeting = appState.tempMeeting || appState.currentMeeting;
    if (!meeting?.bracket) return;
    
    const game = meeting.bracket.games.find(g => g.id === editState.currentGameId);
    if (!game) return;
    
    // 변경사항 적용 로직은 실제 선택된 멤버들을 기반으로 구현
    // 여기서는 간단히 모달을 닫고 대진표를 다시 렌더링
    
    closeMemberSelectModal();
    displayBracket();
    
    // 게임 균형 다시 체크
    const balance = checkGameBalance(meeting.bracket.games, meeting.members);
    if (!balance.balanced) {
        alert('멤버 변경으로 인해 게임 배분이 불균등해졌습니다.');
    }
}

// 모달 닫기
function closeMemberSelectModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
    
    // 편집 상태 초기화
    editState = {
        currentGameId: null,
        currentTeam: null,
        selectedMemberName: null
    };
}

// 플레이어 직접 편집
function editPlayer(gameId, teamNumber, memberName) {
    const meeting = appState.tempMeeting || appState.currentMeeting;
    if (!meeting?.bracket) return;
    
    // KDK 모드에서는 플레이어 편집 불가
    if (meeting.settings?.bracketType === 'kdk') {
        alert('KDK 방식에서는 플레이어 변경이 불가능합니다.\n미리 정해진 조합에 따라 진행됩니다.');
        return;
    }
    
    const game = meeting.bracket.games.find(g => g.id === gameId);
    if (!game) return;
    
    editState.currentGameId = gameId;
    editState.currentTeam = teamNumber;
    editState.selectedMemberName = memberName;
    
    showPlayerEditModal(game, teamNumber, memberName);
}

// 플레이어 편집 모달 표시
function showPlayerEditModal(game, teamNumber, memberName) {
    const meeting = appState.tempMeeting || appState.currentMeeting;
    const currentTimeGames = meeting.bracket.games.filter(g => g.time === game.time);
    
    // 현재 타임에 이미 뛰고 있는 멤버들 (편집 중인 게임 제외)
    const busyMembers = currentTimeGames
        .filter(g => g.id !== game.id)
        .flatMap(g => [...(g.team1 || []), ...(g.team2 || [])])
        .map(m => m.name);
    
    // 평균 게임 수 계산
    const totalGames = meeting.bracket.games.length;
    const totalPlayers = meeting.members.length;
    const averageGames = (totalGames * 4) / totalPlayers;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${memberName} 선수를 교체하시겠습니까?</h3>
                <button class="modal-close" onclick="closeMemberSelectModal()">×</button>
            </div>
            
            <div class="modal-body">
                <div class="current-player-info">
                    <p><strong>현재:</strong> ${game.court}번 코트 팀${teamNumber} - ${memberName}</p>
                </div>
                
                <div class="available-members">
                    <h4>교체 가능한 멤버</h4>
                    <div class="member-grid">
                        ${meeting.members.map(member => {
                            const gamesCount = meeting.bracket.memberGameCount[member.name] || 0;
                            const diffFromAverage = gamesCount - averageGames;
                            const diffText = diffFromAverage > 0 ? `+${diffFromAverage.toFixed(1)}` : diffFromAverage.toFixed(1);
                            const isDisabled = busyMembers.includes(member.name) || member.name === memberName;
                            
                            return `
                                <div class="selectable-member ${isDisabled ? 'disabled' : ''}" 
                                     onclick="selectPlayerForReplace('${member.name}')"
                                     data-member="${member.name}">
                                    <div class="member-name">${member.name}</div>
                                    <div class="member-details">
                                        ${member.gender} | 실력${member.skill}<br>
                                        ${gamesCount}게임 (평균대비${diffText})
                                        ${isDisabled ? '<br><span class="disabled-reason">' + 
                                            (member.name === memberName ? '현재 선수' : '사용중') + '</span>' : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeMemberSelectModal()">취소</button>
                <button class="btn-primary" id="replace-confirm-btn" onclick="confirmPlayerReplace()" disabled>교체</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 교체할 플레이어 선택
function selectPlayerForReplace(memberName) {
    const memberElement = document.querySelector(`[data-member="${memberName}"]`);
    if (memberElement.classList.contains('disabled')) {
        return;
    }
    
    // 이전 선택 해제
    document.querySelectorAll('.selectable-member').forEach(el => {
        el.classList.remove('selected');
    });
    
    // 새 선택 표시
    memberElement.classList.add('selected');
    editState.replacementMemberName = memberName;
    
    // 교체 버튼 활성화
    document.getElementById('replace-confirm-btn').disabled = false;
}

// 플레이어 교체 확인
function confirmPlayerReplace() {
    if (!editState.replacementMemberName) return;
    
    const meeting = appState.tempMeeting || appState.currentMeeting;
    const game = meeting.bracket.games.find(g => g.id === editState.currentGameId);
    if (!game) return;
    
    const replacementMember = meeting.members.find(m => m.name === editState.replacementMemberName);
    if (!replacementMember) return;
    
    // 실제 교체 수행
    const teamKey = editState.currentTeam === 1 ? 'team1' : 'team2';
    const team = game[teamKey];
    
    if (team) {
        const memberIndex = team.findIndex(m => m.name === editState.selectedMemberName);
        if (memberIndex >= 0) {
            team[memberIndex] = replacementMember;
            
            // 게임 타입 재계산
            if (game.team1 && game.team2 && game.team1.length === 2 && game.team2.length === 2) {
                game.teamType = getTeamType(game.team1, game.team2);
            }
            
            // 멤버 게임 수 재계산
            recalculateMemberGameCount(meeting);
            
            // 화면 업데이트
            closeMemberSelectModal();
            displayBracket();
        }
    }
}

// 멤버 게임 수 재계산
function recalculateMemberGameCount(meeting) {
    const memberGameCount = {};
    
    // 초기화
    meeting.members.forEach(member => {
        memberGameCount[member.name] = 0;
    });
    
    // 게임별로 카운트
    meeting.bracket.games.forEach(game => {
        if (game.team1) {
            game.team1.forEach(member => {
                memberGameCount[member.name]++;
            });
        }
        if (game.team2) {
            game.team2.forEach(member => {
                memberGameCount[member.name]++;
            });
        }
    });
    
    meeting.bracket.memberGameCount = memberGameCount;
}

// 간단한 멤버 클릭 편집 (팝업 없이) - 기존 함수 유지
function selectMemberForEdit(gameId, teamNumber, memberName) {
    // 이제 editPlayer로 리다이렉트
    editPlayer(gameId, teamNumber, memberName);
}