// Firebase 설정 및 초기화

const firebaseConfig = {
    apiKey: "AIzaSyAycBoMJTIldJt7W3XLRC9T63NtKqAfjz8",
    authDomain: "tennis-scoreboard-27f7d.firebaseapp.com",
    databaseURL: "https://tennis-scoreboard-27f7d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tennis-scoreboard-27f7d",
    storageBucket: "tennis-scoreboard-27f7d.firebasestorage.app",
    messagingSenderId: "87562219369",
    appId: "1:87562219369:web:c54f36fe8566a96b2797f8"
};

// Firebase 초기화
let database = null;

// Firebase 초기화 함수
function initializeFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            console.log('Firebase 초기화 완료');
            return true;
        } else {
            console.error('Firebase SDK가 로드되지 않았습니다.');
            return false;
        }
    } catch (error) {
        console.error('Firebase 초기화 실패:', error);
        return false;
    }
}

// Firebase 연결 상태 확인
function isFirebaseConnected() {
    return database !== null && typeof firebase !== 'undefined';
}