/**
 * 레거시 폴백 프레임 데이터
 * 운영 시에는 public/themes/ 하위 frames.json 을 사용합니다.
 */
export const frames = [
    {
        id: 1,
        name: 'Hope',
        layout: {
            // 4개 구역의 위치와 크기 (비율 기준) - 2x2 그리드, 프레임을 완전히 가득 채움
            // 프레임 내부 영역(frameInnerHeight)을 기준으로 하단 텍스트 영역을 제외한 전체를 2등분
            // frameInnerHeight = 전체 높이 - frameBorderWidth - bottomHeight
            // 슬롯이 frameInnerHeight를 완전히 채우도록: 각 슬롯 높이 = frameInnerHeight / 2
            // frameInnerHeight는 전체 높이의 약 0.92 (하단 0.08 제외)이므로
            // 슬롯 높이는 frameInnerHeight 기준으로 0.5씩 차지
            slots: [
                { x: 0, y: 0, width: 0.5, height: 0.5 }, // 좌상 - 프레임 내부 영역 기준
                { x: 0.5, y: 0, width: 0.5, height: 0.5 }, // 우상
                { x: 0, y: 0.5, width: 0.5, height: 0.5 }, // 좌하
                { x: 0.5, y: 0.5, width: 0.5, height: 0.5 }  // 우하
            ],
            frameColor: '#001F3F', // 어두운 남색 (네이비 블루)
            frameWidth: 18,
            slotColor: '#F5F5F0', // 클라우드 댄서 톤
            bottomText: 'Hope', // 한 줄 텍스트
            title: '',
            textColor: '#FFFFFF', // 흰색
            fontFamily: 'Inter, sans-serif', // 둥글고 부드러운 sans-serif
            logoStyle: true // 로고 스타일 적용 (타원형 테두리, 별 장식)
        }
    },
    {
        id: 2,
        name: 'Merry Christmas',
        layout: {
            // 4개 구역의 위치와 크기 (비율 기준) - 2x2 그리드, 프레임을 완전히 가득 채움
            // 프레임 내부 영역(frameInnerHeight)을 기준으로 하단 텍스트 영역을 제외한 전체를 2등분
            slots: [
                { x: 0, y: 0, width: 0.5, height: 0.5 }, // 좌상 - 프레임 내부 영역 기준
                { x: 0.5, y: 0, width: 0.5, height: 0.5 }, // 우상
                { x: 0, y: 0.5, width: 0.5, height: 0.5 }, // 좌하
                { x: 0.5, y: 0.5, width: 0.5, height: 0.5 }  // 우하
            ],
            frameColor: '#B22222', // 진한 크리스마스 빨간색
            frameWidth: 20,
            slotColor: '#FFFFFF', // 흰색 슬롯 배경
            bottomText: 'MERRY\nCHRISTMAS', // 두 줄로 나누기
            title: '🎄',
            textColor: '#FFD700', // 황금색 (크리스마스 전통 색상)
            fontFamily: 'Playfair Display, serif' // 세리프 폰트
        }
    },
    {
        id: 3,
        name: 'Pyeong-an',
        layout: {
            slots: [
                { x: 0, y: 0, width: 0.5, height: 0.5 }, // 좌상
                { x: 0.5, y: 0, width: 0.5, height: 0.5 }, // 우상
                { x: 0, y: 0.5, width: 0.5, height: 0.5 }, // 좌하
                { x: 0.5, y: 0.5, width: 0.5, height: 0.5 }  // 우하
            ],
            frameColor: '#6B46C1', // 고급스러운 인디고 보라색
            frameWidth: 18,
            slotColor: '#F5F5F0',
            bottomText: 'PEACE ATTIC', // 한 줄 텍스트
            textColor: '#FFD700', // 황금색
            fontFamily: 'Playfair Display, serif' // 세리프 폰트
        }
    },
];

