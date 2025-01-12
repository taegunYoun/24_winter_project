const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 4000;

// JSON 파일 경로
const USERS_FILE = path.join(__dirname, 'users.json');
const INVITE_CODES_FILE = path.join(__dirname, 'inviteCodes.json');

// 파일이 없으면 초기화
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    console.log('users.json 파일이 생성되었습니다.');
}

if (!fs.existsSync(INVITE_CODES_FILE)) {
    fs.writeFileSync(INVITE_CODES_FILE, JSON.stringify([]));
    console.log('inviteCodes.json 파일이 생성되었습니다.');
}

// 미들웨어 설정
app.use(express.json());
app.use(express.static('public')); // 정적 파일 제공
app.use(cors({
    origin: ['http://175.209.134.115:4000', 'http://localhost:4000'], // 허용할 도메인
    methods: ['GET', 'POST'],
    credentials: true,
}));

// 회원가입 API
app.post('/register', (req, res) => {
    console.log('회원가입 요청 데이터:', req.body);
    const { username, password, positions } = req.body;

    if (!username || !password || !positions || positions.length !== 3) {
        console.error('입력 데이터가 유효하지 않습니다.');
        return res.status(400).send('입력 데이터가 유효하지 않습니다.');
    }

    try {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        if (users.find(user => user.username === username)) {
            console.error('이미 존재하는 사용자입니다.');
            return res.status(400).send('이미 존재하는 사용자입니다.');
        }

        users.push({ username, password, positions });
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        console.log('회원가입 성공!');
        res.status(201).send('회원가입 성공!');
    } catch (error) {
        console.error('회원가입 처리 중 에러 발생:', error);
        res.status(500).send('서버 내부 오류가 발생했습니다.');
    }
});

// 로그인 API
app.post('/login', (req, res) => {
    console.log('로그인 요청 데이터:', req.body);
    const { username, password } = req.body;

    if (!username || !password) {
        console.error('아이디 또는 비밀번호가 누락되었습니다.');
        return res.status(400).send('아이디와 비밀번호를 입력하세요.');
    }

    try {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            console.log(`로그인 성공: ${username}`);
            res.status(200).json(user); // 로그인 성공 시 사용자 데이터 반환
        } else {
            console.error('로그인 실패: 잘못된 아이디 또는 비밀번호');
            res.status(401).send('잘못된 아이디 또는 비밀번호입니다.');
        }
    } catch (error) {
        console.error('로그인 처리 중 에러 발생:', error);
        res.status(500).send('서버 내부 오류가 발생했습니다.');
    }
});

// 초대코드 생성 API
app.post('/invite/create', (req, res) => {
    const { inviteCode, formation, username } = req.body;

    if (!inviteCode || !formation || !username) {
        return res.status(400).send('초대코드, 포메이션, 사용자 이름이 필요합니다.');
    }

    try {
        const inviteCodes = JSON.parse(fs.readFileSync(INVITE_CODES_FILE, 'utf8'));

        // 중복 초대코드 확인
        const existingCode = inviteCodes.find(code => code.inviteCode === inviteCode);
        if (existingCode) {
            return res.status(400).send('이미 존재하는 초대코드입니다. 다른 초대코드를 사용해주세요.');
        }

        // 초대코드에 생성자 아이디, 포메이션 저장
        inviteCodes.push({
            inviteCode: inviteCode,
            formation: formation,
            users: [username], // 초대코드에 사용자 아이디만 저장
        });

        // 파일에 업데이트된 초대코드 배열 저장
        fs.writeFileSync(INVITE_CODES_FILE, JSON.stringify(inviteCodes, null, 2));

        res.status(201).send('초대코드가 생성되었습니다.');
    } catch (error) {
        console.error('초대코드 처리 중 에러 발생:', error);
        res.status(500).send('서버 내부 오류가 발생했습니다.');
    }
});

// 초대코드에 포함된 사용자 목록 가져오는 API
app.post('/invite/users', (req, res) => {
    const { inviteCode } = req.body;

    if (!inviteCode) {
        return res.status(400).send('초대코드가 필요합니다.');
    }

    try {
        const inviteCodes = JSON.parse(fs.readFileSync(INVITE_CODES_FILE, 'utf8'));
        const inviteCodeEntry = inviteCodes.find(code => code.inviteCode === inviteCode);

        if (inviteCodeEntry) {
            res.status(200).json({ success: true, users: inviteCodeEntry.users });
        } else {
            res.status(404).send('초대코드와 관련된 사용자가 없습니다.');
        }
    } catch (error) {
        console.error('사용자 목록 가져오기 중 에러 발생:', error);
        res.status(500).send('서버 내부 오류가 발생했습니다.');
    }
});

// 초대코드 참여 API
app.post('/invite/join', (req, res) => {
    const { inviteCode, username } = req.body;

    if (!inviteCode || !username) {
        return res.status(400).json({ success: false, message: '초대코드와 사용자 이름이 필요합니다.' });
    }

    try {
        const inviteCodes = JSON.parse(fs.readFileSync(INVITE_CODES_FILE, 'utf8'));
        const inviteCodeEntry = inviteCodes.find(code => code.inviteCode === inviteCode);

        if (inviteCodeEntry) {
            // 이미 참여한 사용자 처리
            if (inviteCodeEntry.users.includes(username)) {
                console.log(`이미 참여한 사용자: ${username}`);
                return res.status(200).json({
                    success: true,
                    formation: inviteCodeEntry.formation,
                    message: '이미 초대코드에 참여한 사용자입니다.'
                });
            }

            // 초대코드에 사용자 추가
            inviteCodeEntry.users.push(username);
            fs.writeFileSync(INVITE_CODES_FILE, JSON.stringify(inviteCodes, null, 2));

            return res.status(200).json({
                success: true,
                formation: inviteCodeEntry.formation,
                message: '초대코드에 새로 참여한 사용자입니다.'
            });
        } else {
            return res.status(404).json({ success: false, message: '초대코드가 존재하지 않습니다.' });
        }
    } catch (error) {
        console.error('초대코드 처리 중 오류:', error);
        return res.status(500).json({ success: false, message: '서버 내부 오류가 발생했습니다.' });
    }
});

// 서버 실행
app.listen(PORT, '0.0.0.0', () => {
    console.log(`서버가 실행 중입니다. http://0.0.0.0:${PORT}`);
});