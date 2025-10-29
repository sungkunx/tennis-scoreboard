// 데이터 백업 및 복원 기능

// 데이터 백업 생성
function createBackup(description = null) {
    const backupData = {
        meetings: appState.meetings,
        timestamp: Date.now(),
        date: new Date().toISOString(),
        description: description || `자동 백업 ${new Date().toLocaleString('ko-KR')}`,
        version: '1.0'
    };
    
    console.log('📦 백업 데이터 생성:', backupData);
    
    // 온라인 모드인 경우 Firebase에 저장
    if (appState.onlineMode.active && appState.onlineMode.accessCode) {
        return saveBackupToServer(backupData);
    } else {
        // 오프라인 모드인 경우 로컬 스토리지에 저장
        return saveBackupToLocal(backupData);
    }
}

// 서버에 백업 저장 (Firebase)
function saveBackupToServer(backupData) {
    return new Promise((resolve, reject) => {
        if (!isFirebaseConnected() || !appState.onlineMode.accessCode) {
            reject('Firebase 연결 또는 접속 코드가 없습니다.');
            return;
        }
        
        const accessCode = appState.onlineMode.accessCode;
        const backupId = 'backup_' + Date.now();
        
        database.ref(`backups/${accessCode}/${backupId}`).set(backupData)
            .then(() => {
                console.log('☁️ 서버 백업 완료:', backupId);
                showBackupNotification('서버에 백업되었습니다.', 'success');
                resolve(backupId);
            })
            .catch((error) => {
                console.error('❌ 서버 백업 실패:', error);
                showBackupNotification('서버 백업에 실패했습니다.', 'error');
                reject(error);
            });
    });
}

// 로컬에 백업 저장
function saveBackupToLocal(backupData) {
    return new Promise((resolve, reject) => {
        try {
            const backups = JSON.parse(localStorage.getItem('tennis-backups') || '[]');
            const backupId = 'local_backup_' + Date.now();
            
            // 최대 10개의 로컬 백업 유지
            if (backups.length >= 10) {
                backups.shift(); // 가장 오래된 백업 제거
            }
            
            backupData.id = backupId;
            backups.push(backupData);
            
            localStorage.setItem('tennis-backups', JSON.stringify(backups));
            
            console.log('💾 로컬 백업 완료:', backupId);
            showBackupNotification('로컬에 백업되었습니다.', 'success');
            resolve(backupId);
        } catch (error) {
            console.error('❌ 로컬 백업 실패:', error);
            showBackupNotification('로컬 백업에 실패했습니다.', 'error');
            reject(error);
        }
    });
}

// 백업 목록 조회
function getBackupList() {
    return new Promise((resolve, reject) => {
        if (appState.onlineMode.active && appState.onlineMode.accessCode) {
            // 서버 백업 목록 조회
            getServerBackupList().then(resolve).catch(reject);
        } else {
            // 로컬 백업 목록 조회
            getLocalBackupList().then(resolve).catch(reject);
        }
    });
}

// 서버 백업 목록 조회
function getServerBackupList() {
    return new Promise((resolve, reject) => {
        if (!isFirebaseConnected() || !appState.onlineMode.accessCode) {
            reject('Firebase 연결 또는 접속 코드가 없습니다.');
            return;
        }
        
        const accessCode = appState.onlineMode.accessCode;
        
        database.ref(`backups/${accessCode}`).once('value')
            .then((snapshot) => {
                const backups = [];
                const data = snapshot.val();
                
                if (data) {
                    Object.keys(data).forEach(key => {
                        backups.push({
                            id: key,
                            ...data[key]
                        });
                    });
                }
                
                // 최신 순으로 정렬
                backups.sort((a, b) => b.timestamp - a.timestamp);
                
                console.log('☁️ 서버 백업 목록 조회:', backups.length + '개');
                resolve(backups);
            })
            .catch((error) => {
                console.error('❌ 서버 백업 목록 조회 실패:', error);
                reject(error);
            });
    });
}

// 로컬 백업 목록 조회
function getLocalBackupList() {
    return new Promise((resolve, reject) => {
        try {
            const backups = JSON.parse(localStorage.getItem('tennis-backups') || '[]');
            // 최신 순으로 정렬
            backups.sort((a, b) => b.timestamp - a.timestamp);
            
            console.log('💾 로컬 백업 목록 조회:', backups.length + '개');
            resolve(backups);
        } catch (error) {
            console.error('❌ 로컬 백업 목록 조회 실패:', error);
            reject(error);
        }
    });
}

// 백업 복원
function restoreBackup(backupId) {
    return new Promise((resolve, reject) => {
        getBackupList()
            .then(backups => {
                const backup = backups.find(b => b.id === backupId);
                if (!backup) {
                    reject('백업을 찾을 수 없습니다.');
                    return;
                }
                
                // 현재 데이터 백업 (복원 전)
                createBackup(`복원 전 백업 ${new Date().toLocaleString('ko-KR')}`)
                    .then(() => {
                        // 데이터 복원
                        appState.meetings = backup.meetings || [];
                        
                        // 로컬 스토리지에도 저장
                        saveMeetings();
                        
                        // UI 새로고침
                        loadMeetings();
                        
                        console.log('✅ 백업 복원 완료:', backup.description);
                        showBackupNotification(`백업이 복원되었습니다: ${backup.description}`, 'success');
                        resolve();
                    })
                    .catch(error => {
                        console.error('❌ 복원 전 백업 생성 실패:', error);
                        // 백업 생성 실패해도 복원은 진행
                        appState.meetings = backup.meetings || [];
                        saveMeetings();
                        loadMeetings();
                        
                        showBackupNotification(`백업이 복원되었습니다: ${backup.description}`, 'success');
                        resolve();
                    });
            })
            .catch(reject);
    });
}

// 백업 삭제
function deleteBackup(backupId) {
    return new Promise((resolve, reject) => {
        if (appState.onlineMode.active && appState.onlineMode.accessCode) {
            // 서버 백업 삭제
            const accessCode = appState.onlineMode.accessCode;
            database.ref(`backups/${accessCode}/${backupId}`).remove()
                .then(() => {
                    console.log('☁️ 서버 백업 삭제 완료:', backupId);
                    showBackupNotification('백업이 삭제되었습니다.', 'success');
                    resolve();
                })
                .catch(reject);
        } else {
            // 로컬 백업 삭제
            try {
                const backups = JSON.parse(localStorage.getItem('tennis-backups') || '[]');
                const filteredBackups = backups.filter(b => b.id !== backupId);
                localStorage.setItem('tennis-backups', JSON.stringify(filteredBackups));
                
                console.log('💾 로컬 백업 삭제 완료:', backupId);
                showBackupNotification('백업이 삭제되었습니다.', 'success');
                resolve();
            } catch (error) {
                reject(error);
            }
        }
    });
}

// 백업 알림 표시
function showBackupNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `backup-notification ${type}`;
    notification.textContent = message;
    
    // 기존 알림 제거
    const existingNotification = document.querySelector('.backup-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 상단에 알림 추가
    document.body.insertBefore(notification, document.body.firstChild);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// 백업 관리 모달 표시
function showBackupModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content backup-modal-content">
            <div class="modal-header">
                <h3>데이터 백업 관리</h3>
                <button class="close-btn" onclick="closeBackupModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="backup-actions">
                    <button class="btn-primary" onclick="manualBackup()">
                        <span>📦</span> 수동 백업 생성
                    </button>
                    <button class="btn-secondary" onclick="refreshBackupList()">
                        <span>🔄</span> 목록 새로고침
                    </button>
                </div>
                
                <div class="backup-list-container">
                    <h4>백업 목록</h4>
                    <div id="backup-list" class="backup-list">
                        <div class="loading">백업 목록을 불러오는 중...</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 백업 목록 로드
    loadBackupListUI();
}

// 백업 모달 닫기
function closeBackupModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// 수동 백업 생성
function manualBackup() {
    const description = prompt('백업 설명을 입력하세요 (선택사항):', `수동 백업 ${new Date().toLocaleString('ko-KR')}`);
    if (description !== null) {
        createBackup(description)
            .then(() => {
                refreshBackupList();
            })
            .catch(error => {
                alert('백업 생성에 실패했습니다: ' + error);
            });
    }
}

// 백업 목록 UI 로드
function loadBackupListUI() {
    const backupList = document.getElementById('backup-list');
    if (!backupList) return;
    
    backupList.innerHTML = '<div class="loading">백업 목록을 불러오는 중...</div>';
    
    getBackupList()
        .then(backups => {
            if (backups.length === 0) {
                backupList.innerHTML = '<div class="no-backups">저장된 백업이 없습니다.</div>';
                return;
            }
            
            let html = '';
            backups.forEach(backup => {
                const date = new Date(backup.timestamp).toLocaleString('ko-KR');
                const meetingCount = backup.meetings ? backup.meetings.length : 0;
                
                html += `
                    <div class="backup-item" data-backup-id="${backup.id}">
                        <div class="backup-info">
                            <div class="backup-title">${backup.description}</div>
                            <div class="backup-details">${date} • ${meetingCount}개 모임</div>
                        </div>
                        <div class="backup-actions">
                            <button class="btn-restore" onclick="confirmRestoreBackup('${backup.id}')">복원</button>
                            <button class="btn-delete" onclick="confirmDeleteBackup('${backup.id}')">삭제</button>
                        </div>
                    </div>
                `;
            });
            
            backupList.innerHTML = html;
        })
        .catch(error => {
            backupList.innerHTML = `<div class="error">백업 목록 로드 실패: ${error}</div>`;
        });
}

// 백업 목록 새로고침
function refreshBackupList() {
    loadBackupListUI();
}

// 백업 복원 확인
function confirmRestoreBackup(backupId) {
    if (confirm('이 백업을 복원하시겠습니까?\n현재 데이터는 자동으로 백업됩니다.')) {
        restoreBackup(backupId)
            .then(() => {
                closeBackupModal();
            })
            .catch(error => {
                alert('백업 복원에 실패했습니다: ' + error);
            });
    }
}

// 백업 삭제 확인
function confirmDeleteBackup(backupId) {
    if (confirm('이 백업을 삭제하시겠습니까?\n삭제된 백업은 복구할 수 없습니다.')) {
        deleteBackup(backupId)
            .then(() => {
                refreshBackupList();
            })
            .catch(error => {
                alert('백업 삭제에 실패했습니다: ' + error);
            });
    }
}