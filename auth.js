import { auth, db } from './firebase.js';
import { openModal, closeModal, loginModal, authBtn, settingsBtn, loadMembersBtn, groupCodeInput, playerListContainer, updatePlayerNumbers, updateRecommendation } from './ui.js';

import { listenForPlayerChanges, stopListeningForPlayerChanges } from './members.js';

let groupCode = null;
let currentUser = null;

export function getGroupCode() {
    return groupCode;
}

export function initAuth() {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        const savedGroupCode = localStorage.getItem('groupCode');
        if (user && savedGroupCode) {
            groupCode = savedGroupCode;
            updateUIForAuthState(true);
            listenForPlayerChanges();
        } else {
            updateUIForAuthState(false);
        }
    });
}

export function handleAuthClick() {
    if (groupCode) {
        // Logout
        if (confirm('로그아웃 하시겠습니까?')) {
            handleLogout();
        }
    } else {
        // Login
        openModal(loginModal);
    }
}

export function handleLogin() {
    const code = groupCodeInput.value.trim();
    if (!code) {
        alert('모임 코드를 입력해주세요.');
        return;
    }

    groupCode = code;

    auth.signInAnonymously().then(() => {
        localStorage.setItem('groupCode', groupCode);
        const groupRef = db.collection('groups').doc(groupCode);
        groupRef.get().then(doc => {
            if (!doc.exists) {
                alert(`'${groupCode}' 모임이 새로 생성되었습니다.`);
                groupRef.set({ createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            }
        });
        updateUIForAuthState(true);
        listenForPlayerChanges();
        closeModal(loginModal);
        groupCodeInput.value = '';
    }).catch(error => {
        console.error("Error signing in anonymously:", error);
        alert('로그인에 실패했습니다.');
    });
}

export function handleLogout() {
    stopListeningForPlayerChanges();
    localStorage.removeItem('groupCode');
    groupCode = null;
    // Note: We are not signing out the anonymous user
    // to allow them to log back in easily.
    updateUIForAuthState(false);
    playerListContainer.innerHTML = ''; // Clear the player list
    updatePlayerNumbers(); // Update player numbers after clearing
    updateRecommendation(); // Update recommendation after clearing
}

function updateUIForAuthState(isLoggedIn) {
    if (isLoggedIn) {
        authBtn.textContent = '🚪'; // Door icon for logout
        settingsBtn.style.display = 'inline-block';
        loadMembersBtn.style.display = 'inline-block';
    } else {
        authBtn.textContent = '🔑'; // Key icon for login
        settingsBtn.style.display = 'none';
        loadMembersBtn.style.display = 'none';
    }
}
